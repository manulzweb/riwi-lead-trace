import { request } from './api.service.js'

// Tutores y Team Leaders que ESTE evaluador puede evaluar.
//
// Mandar `evaluator_id` no es opcional en la practica: sin el, el backend
// devuelve la lista completa sin filtrar por clan (es su comportamiento
// documentado) y la UI ofreceria gente que luego POST /evaluations rechaza
// con 403.
//
// El filtro por clan NO se hace en el cliente. Vive en el servidor
// (can_evaluate_by_clan), porque un Team Leader tiene `clan_id = NULL` y su
// relacion con clanes esta en `team_leader_clans` -- comparar `clan_id`
// contra `clan_id` en el front deja fuera a todos los TL.
const get = async (evaluatorId) => {
  const query = evaluatorId ? `?evaluator_id=${encodeURIComponent(evaluatorId)}` : ''
  return await request(`/evaluables${query}`)
}

export const evaluablesService = {
  get
}
