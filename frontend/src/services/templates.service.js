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

// El constructor no tiene un campo de categoria en su UI todavia; todas las
// preguntas que crea quedan agrupadas bajo esta categoria por defecto.
const DEFAULT_CATEGORY = 'General';

// No hay GET /forms que liste todas las plantillas -- solo GET /forms?target_role=
// (la activa de ESE rol). Como solo hay 2 roles evaluables, se piden ambas en
// paralelo y se arma la lista a partir de eso.
const getTemplates = async () => {
  const results = await Promise.all(
    TARGET_ROLES.map(async (targetRole) => {
      try {
        const template = await request(`/forms?target_role=${targetRole}`);
        return { ...template, targetRole };
      } catch (err) {
        return null; // 404: todavia no hay plantilla activa para ese rol
      }
    })
  );
  return results.filter(Boolean);
};

// Para editar, ademas del texto (que ya viene en /forms) hace falta el peso
// de cada pregunta, que /forms no expone -- se completa con /questions.
const getTemplateForEdit = async (template) => {
  const questions = await request(`/questions?template_id=${template.id}`);
  return {
    ...template,
    questions: questions.map((q) => ({
      id: String(q.id),
      text: q.text,
      type: INPUT_TYPE_TO_TYPE[q.input_type] || 'open_text',
      weight: Number(q.weight_percent) || 0,
      category: q.category,
    })),
  };
};

const toQuestionPayload = (q) => ({
  text: q.text,
  category: q.category || DEFAULT_CATEGORY,
  input_type: TYPE_TO_INPUT_TYPE[q.type] || 'text',
  weight_percent: (TYPE_TO_INPUT_TYPE[q.type] || 'text') === 'scale' ? (q.weight || 0) : 0,
});

// Plantilla nueva: POST /forms crea la plantilla y todas sus preguntas
// iniciales en un solo paso (no hay historial previo que versionar).
const createTemplate = async (templateData) => {
  const payload = {
    title: templateData.title,
    description: templateData.description || null,
    target_role: templateData.targetRole,
    questions: templateData.questions.map(toQuestionPayload),
  };
  return await request('/forms', jsonOptions('POST', payload));
};

// Plantilla existente: no hay un "reemplazar todas las preguntas de una",
// asi que se compara el estado actual del builder contra lo que estaba
// cargado al abrirlo y se manda solo lo que cambio -- agregar, quitar,
// reformular texto (versiona) y por ultimo reequilibrar los pesos.
const updateTemplate = async (id, templateData) => {
  await request(`/forms/${id}`, jsonOptions('PUT', {
    title: templateData.title,
    description: templateData.description || null,
  }));

  const before = templateData.originalQuestions || [];
  const after = templateData.questions;
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
      template_id: id,
      ...toQuestionPayload(q),
    }));
    createdFromNew.push({ realId: created.id, type: q.type, weight: q.weight });
  }

  for (const q of kept) {
    const original = before.find((b) => b.id === q.id);
    if (original && original.text !== q.text) {
      await request(`/questions/${q.id}`, jsonOptions('PATCH', { text: q.text, confirm: true }));
    }
  }

  // Reequilibrar pesos: todas las preguntas de escala que quedan activas
  // (las que ya existian + las recien creadas), con su peso actual del builder.
  const scaleWeights = [
    ...kept.filter((q) => q.type === 'scale_1_5').map((q) => ({ question_id: Number(q.id), weight_percent: q.weight || 0 })),
    ...createdFromNew.filter((c) => c.type === 'scale_1_5').map((c) => ({ question_id: c.realId, weight_percent: c.weight || 0 })),
  ];
  if (scaleWeights.length > 0) {
    await request('/questions/weights', jsonOptions('PUT', {
      template_id: id,
      weights: scaleWeights,
    }));
  }

  return await request(`/forms?target_role=${templateData.targetRole}`);
};

const deleteTemplate = async (id) => await request(`/forms/${id}`, { method: 'DELETE' });

export const templatesService = {
  getTemplates,
  getTemplateForEdit,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
