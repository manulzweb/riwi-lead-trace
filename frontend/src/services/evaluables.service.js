import { request } from './api.service.js'

// Tutores y Team Leaders que ESTE evaluador puede evaluar. Sin `evaluator_id`
// el backend devuelve la lista sin filtrar y la UI ofrece gente que luego
// POST /evaluations rechaza con 403.
//
// El filtro por clan lo aplica el SERVIDOR (can_evaluate_by_clan), no el
// cliente: un Team Leader tiene `clan_id = NULL` (vive en team_leader_clans),
// asi que comparar clan_id en el front los deja fuera a todos.
const get = async (evaluatorId) => {
  const query = evaluatorId ? `?evaluator_id=${encodeURIComponent(evaluatorId)}` : ''
  return await request(`/evaluables${query}`)
}

export const evaluablesService = {
  get
}
