import { request, jsonOptions } from './api.service.js'

const getForm = async (targetRole) => await request(`/forms?target_role=${targetRole}`)

const create = async (evaluationData) => await request('/evaluations', jsonOptions('POST', evaluationData))

const getByEvaluator = async (evaluatorId) => await request(`/evaluations?evaluator_id=${evaluatorId}`)

const getByEvaluatee = async (evaluateeId) => await request(`/evaluations?evaluatee_id=${evaluateeId}`)

export const evaluationService = {
  getForm,
  create,
  getByEvaluator,
  getByEvaluatee
}
