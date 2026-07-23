import { request, jsonOptions } from './api.service.js'

const getForm = async (targetRole) => {
    const forms = await request(`/forms?target_role=${targetRole}`);
    if (forms && forms.length > 0) {
        return forms[0];
    }
    throw new Error("No hay un formulario activo para este rol.");
}

const create = async (evaluationData) => await request('/evaluations', jsonOptions('POST', evaluationData))

// Evaluator history. limit is optional; without it the backend default
// (limit=100) applies.
//
// WATCH THE SHAPE: these are not evaluations but PARTICIPATIONS (rows of
// evaluation_submissions), keyed by participation_id, not id. Anonymous ones
// still carry evaluation_id and answers so the coder can review them.
const getByEvaluator = async (evaluatorId, limit) =>
  await request(`/evaluations?evaluator_id=${evaluatorId}${limit ? `&limit=${limit}` : ''}`)

const getByEvaluatee = async (evaluateeId) => await request(`/evaluations?evaluatee_id=${evaluateeId}`)

// Pure predicates over a history participation. They live here because they
// describe the API shape, which is this layer responsibility. No DOM.
const isAnonymousParticipation = (entry) => entry?.is_anonymous === true

// There is detail to open whenever the backend sends evaluation_id.
const hasVisibleDetail = (entry) => entry?.evaluation_id != null

export const evaluationService = {
  getForm,
  create,
  getByEvaluator,
  getByEvaluatee,
  isAnonymousParticipation,
  hasVisibleDetail
}
