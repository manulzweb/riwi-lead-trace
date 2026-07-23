import { request } from './api.service.js'

// Tutors and Team Leaders THIS evaluator may evaluate. Without evaluator_id
// the backend returns the list unfiltered and the UI offers people that
// POST /evaluations later rejects with 403.
//
// The clan filter is applied by the SERVER (can_evaluate_by_clan), not the
// client: a Team Leader has clan_id = NULL (their clans live in
// team_leader_clans), so comparing clan_id in the front would exclude them all.
const get = async (evaluatorId) => {
  const query = evaluatorId ? `?evaluator_id=${encodeURIComponent(evaluatorId)}` : ''
  return await request(`/evaluables${query}`)
}

export const evaluablesService = {
  get
}
