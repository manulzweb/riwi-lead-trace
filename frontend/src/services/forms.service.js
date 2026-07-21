import { request, jsonOptions } from './api.service.js';

// Unicos roles evaluables (ver CLAUDE.md / form_service.EVALUABLE_ROLES en el backend).
const TARGET_ROLES = ['team_leader', 'tutor'];

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

// GET /forms?target_role= devuelve un arreglo (la formulario activa de ESE
// rol, si existe). Como solo hay 2 roles evaluables, se piden ambas en
// paralelo y se arma la lista a partir de eso.
const getForms = async () => {
  const results = await Promise.all(
    TARGET_ROLES.map(async (targetRole) => {
      try {
        const forms = await request(`/forms?target_role=${targetRole}`);
        // Mapeamos todas las formularios que devuelva el backend
        return forms.map(t => ({ ...t, targetRole }));
      } catch (error) {
        // Si la API arroja 404 porque todavía no hay formularios creadas para este rol,
        // devolvemos un array vacío para no romper nada. Se compara el status
        // real que expone api.service.js, no el texto del mensaje.
        if (error.status === 404) return [];
        throw error; 
      }
    })
  );
  // results es un array de arrays (uno por rol), lo aplanamos a una sola lista
  return results.flat();
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
    target_role: formData.targetRole,
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

  const forms = await request(`/forms?target_role=${formData.targetRole}`);
  return forms[0];
};

const deleteForm = async (id) => await request(`/forms/${id}`, { method: 'DELETE' });

export const formsService = {
  getForms,
  getFormForEdit,
  createForm,
  updateForm,
  deleteForm,
};
