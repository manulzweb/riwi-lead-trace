import { request, jsonOptions } from './api.service.js';

// Bridges the visual builder type codes <-> backend questions.input_type.
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

// The builder has no category field yet, so new questions fall back to this
// one. Its real id is resolved once (see getDefaultCategoryId).
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

// target_role_id -> role name, so views do not resolve it. Ids come from the
// seed (database/02_dml.sql).
const ROLE_ID_TO_NAME = { 2: 'team_leader', 3: 'tutor' };
const withRoleName = (form) => ({
  ...form,
  // null on generic templates; the view renders that case itself.
  targetRole: ROLE_ID_TO_NAME[form.target_role_id] || null,
});

// Admin grid: everything (live + templates), no archived. No target_role,
// because generic templates belong to no role.
const getForms = async () => {
  const forms = await request('/forms?kind=all');
  return forms.map(withRoleName);
};

// Coder history: the only consumer that needs titles of archived forms,
// hence archived=include.
const getFormsForHistory = async () => {
  const forms = await request('/forms?kind=all&archived=include');
  return forms.map(withRoleName);
};

// Editing also needs each question weight, which /forms does not expose.
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

// New form: POST /forms creates the form and all its initial questions in one
// step (there is no previous history to version).
const createForm = async (formData) => {
  const payload = {
    title: formData.title,
    description: formData.description || null,
    // null is valid only on templates; a live form gets 422 (and behind it,
    // chk_form_role_required in MySQL).
    target_role: formData.targetRole || null,
    is_template: formData.isTemplate || false,
    questions: await Promise.all(formData.questions.map(toQuestionPayload)),
  };
  return await request('/forms', jsonOptions('POST', payload));
};

// Existing form: there is no "replace all questions" endpoint, so we diff
// against originalQuestions and send only what changed.
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
      // First try without forcing: if the AI finds the new text incoherent
      // with the question category the backend answers 409, and only then do
      // we ask the admin to confirm.
      try {
        const updatedQ = await request(`/questions/${q.id}`, jsonOptions('PATCH', { text: q.text, confirm: false, admin_id: formData.adminId }));
        q.id = String(updatedQ.id);
      } catch (err) {
        if (err.status === 409 && onCoherenceConfirm) {
          const confirmed = await onCoherenceConfirm(q, err.detail);
          if (!confirmed) {
            // Internal abort (admin declined), NOT an HTTP error: no .status.
            // Flagged with .cancelled so the view need not parse the message.
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

  // Rebalance weights across every scale question left active.
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

  // Re-read with kind=all on purpose: if a TEMPLATE was edited, the default
  // kind=form would not return it (it is inert) and this would be undefined.
  const forms = await request('/forms?kind=all');
  return forms.map(withRoleName).find((f) => f.id === Number(id));
};

// Returns { action: 'deleted' | 'archived', evaluations_count }: a form with
// history is archived, not deleted, and the view must report which happened.
const deleteForm = async (id) => await request(`/forms/${id}`, { method: 'DELETE' });

const activateForm = async (id) => await request(`/forms/${id}/activate`, { method: 'POST' });
const deactivateForm = async (id) => await request(`/forms/${id}/deactivate`, { method: 'POST' });

export const formsService = {
  getForms,
  getFormsForHistory,
  getFormForEdit,
  createForm,
  updateForm,
  deleteForm,
  activateForm,
  deactivateForm,
};
