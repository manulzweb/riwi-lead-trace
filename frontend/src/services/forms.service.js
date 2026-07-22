import { request, jsonOptions } from './api.service.js';

// Mapea entre los codigos de tipo que usa el constructor visual (Sebastian)
// y el input_type real que espera el backend (questions.input_type).
const TYPE_TO_INPUT_TYPE = {
  scale_1_5: 'scale',
  open_text: 'text',
  yes_no: 'yes_no',
};
const INPUT_TYPE_TO_TYPE = {
  scale: 'scale_1_5',
  text: 'open_text',
  yes_no: 'yes_no',
};

// El constructor no tiene un campo de categoria en su UI todavia; las
// preguntas que crea quedan agrupadas bajo esta categoria por defecto
// (se resuelve su id real una sola vez, ver getDefaultCategoryId).
const DEFAULT_CATEGORY_NAME = 'General';
let defaultCategoryIdPromise = null;
const getDefaultCategoryId = () => {
  if (!defaultCategoryIdPromise) {
    defaultCategoryIdPromise = request('/categories').then((categories) => {
      const match = categories.find((c) => c.name === DEFAULT_CATEGORY_NAME);
      return (match || categories[0]).id;
    });
  }
  return defaultCategoryIdPromise;
};

// Mapea target_role_id -> nombre del rol, para que la vista no tenga que
// resolverlo. Los ids salen del seed (database/02_dml.sql).
const ROLE_ID_TO_NAME = { 2: 'team_leader', 3: 'tutor' };
const withRoleName = (form) => ({
  ...form,
  // null en plantillas genericas: la vista lo muestra como "Cualquier rol".
  targetRole: ROLE_ID_TO_NAME[form.target_role_id] || null,
});

// Grilla del admin: pide TODO (formularios vivos + plantillas), sin archivados.
//
// Antes esto hacia fan-out sobre ['team_leader','tutor'] en paralelo, lo que
// con plantillas genericas (target_role_id NULL) NUNCA las habria encontrado:
// no pertenecen a ningun rol. Una sola llamada sin target_role las incluye, y
// de paso es una peticion en vez de dos.
const getForms = async () => {
  const forms = await request('/forms?kind=all');
  return forms.map(withRoleName);
};

// Historial del Coder: necesita resolver el titulo de formularios ya
// archivados, asi que es el unico consumidor que pide archived=include.
const getFormsForHistory = async () => {
  const forms = await request('/forms?kind=all&archived=include');
  return forms.map(withRoleName);
};

// Para editar, ademas del texto (que ya viene en /forms) hace falta el peso
// de cada pregunta, que /forms no expone -- se completa con /questions.
const getFormForEdit = async (form) => {
  const questions = await request(`/questions?form_id=${form.id}`);
  return {
    ...form,
    questions: questions.map((q) => ({
      id: String(q.id),
      text: q.text,
      type: INPUT_TYPE_TO_TYPE[q.input_type] || 'open_text',
      weight: Number(q.weight_percent) || 0,
      categoryId: q.category_id,
    })),
  };
};

const toQuestionPayload = async (q) => ({
  text: q.text,
  category_id: q.categoryId || (await getDefaultCategoryId()),
  input_type: TYPE_TO_INPUT_TYPE[q.type] || 'text',
  weight_percent: (TYPE_TO_INPUT_TYPE[q.type] || 'text') === 'scale' ? (q.weight || 0) : 0,
});

// Formulario nueva: POST /forms crea la formulario y todas sus preguntas
// iniciales en un solo paso (no hay historial previo que versionar).
const createForm = async (formData) => {
  const payload = {
    title: formData.title,
    description: formData.description || null,
    // null solo es valido en plantillas; en un formulario vivo el backend
    // responde 422 (y detras esta chk_form_role_required en MySQL).
    target_role: formData.targetRole || null,
    is_template: formData.isTemplate || false,
    questions: await Promise.all(formData.questions.map(toQuestionPayload)),
  };
  return await request('/forms', jsonOptions('POST', payload));
};

// Formulario existente: no hay un "reemplazar todas las preguntas de una",
// asi que se compara el estado actual del builder contra lo que estaba
// cargado al abrirlo y se manda solo lo que cambio -- agregar, quitar,
// reformular texto (versiona) y por ultimo reequilibrar los pesos.
const updateForm = async (id, formData, onCoherenceConfirm) => {
  await request(`/forms/${id}`, jsonOptions('PUT', {
    title: formData.title,
    description: formData.description || null,
  }));

  const before = formData.originalQuestions || [];
  const after = formData.questions;
  const beforeIds = new Set(before.map((q) => q.id));
  const afterIds = new Set(after.map((q) => q.id));

  const removed = before.filter((q) => !afterIds.has(q.id));
  const added = after.filter((q) => !beforeIds.has(q.id));
  const kept = after.filter((q) => beforeIds.has(q.id));

  for (const q of removed) {
    await request(`/questions/${q.id}`, { method: 'DELETE' });
  }

  const createdFromNew = [];
  for (const q of added) {
    const created = await request('/questions', jsonOptions('POST', {
      form_id: id,
      ...(await toQuestionPayload(q)),
    }));
    createdFromNew.push({ realId: created.id, type: q.type, weight: q.weight });
  }

  for (const q of kept) {
    const original = before.find((b) => b.id === q.id);
    if (original && original.text !== q.text) {
      // Primer intento SIN forzar: si la IA ve coherente el nuevo texto con
      // la categoria de la pregunta, el backend lo guarda directo. Si no,
      // responde 409 con su razon puntual -- recien ahi se pide confirmar.
      try {
        const updatedQ = await request(`/questions/${q.id}`, jsonOptions('PATCH', { text: q.text, confirm: false, admin_id: formData.adminId }));
        q.id = String(updatedQ.id);
      } catch (err) {
        if (err.status === 409 && onCoherenceConfirm) {
          const confirmed = await onCoherenceConfirm(q, err.detail);
          if (!confirmed) {
            // Aborto interno del flujo (el admin dijo "no"), NO un error HTTP:
            // por eso no tiene .status. Se marca con .cancelled para que la
            // vista lo distinga sin leer el texto del mensaje.
            const cancelled = new Error(`Guardado cancelado: no se confirmo el cambio de texto de "${original.text}".`);
            cancelled.cancelled = true;
            throw cancelled;
          }
          const updatedQ = await request(`/questions/${q.id}`, jsonOptions('PATCH', { text: q.text, confirm: true, admin_id: formData.adminId }));
          q.id = String(updatedQ.id);
        } else {
          throw err;
        }
      }
    }
  }

  // Reequilibrar pesos: todas las preguntas de escala que quedan activas
  const scaleWeights = [
    ...kept.filter((q) => q.type === 'scale_1_5').map((q) => ({ question_id: Number(q.id), weight_percent: q.weight || 0 })),
    ...createdFromNew.filter((c) => c.type === 'scale_1_5').map((c) => ({ question_id: c.realId, weight_percent: c.weight || 0 })),
  ];
  if (scaleWeights.length > 0) {
    await request('/questions/weights', jsonOptions('PUT', {
      form_id: id,
      weights: scaleWeights,
      admin_id: formData.adminId,
    }));
  }

  // Se relee con kind=all a proposito: si lo editado fue una PLANTILLA, el
  // default kind=form no la devolveria (es inerte) y esto quedaria en undefined.
  const forms = await request('/forms?kind=all');
  return forms.map(withRoleName).find((f) => f.id === Number(id));
};

// Devuelve { action: 'deleted' | 'archived', evaluations_count }. La vista
// necesita el `action` para decir que paso de verdad: un formulario con
// historial no se borra, se archiva, y decir "eliminado" seria falso.
const deleteForm = async (id) => await request(`/forms/${id}`, { method: 'DELETE' });

export const formsService = {
  getForms,
  getFormsForHistory,
  getFormForEdit,
  createForm,
  updateForm,
  deleteForm,
};
