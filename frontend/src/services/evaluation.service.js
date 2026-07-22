import { request, jsonOptions } from './api.service.js'

const getForm = async (targetRole) => {
    const forms = await request(`/forms?target_role=${targetRole}`);
    if (forms && forms.length > 0) {
        return forms[0];
    }
    throw new Error("No hay un formulario activo para este rol.");
}

const create = async (evaluationData) => await request('/evaluations', jsonOptions('POST', evaluationData))

// Historial del evaluador. `limit` es opcional: sin el, la URL queda igual que
// siempre y manda el default del backend (limit=100 en GET /evaluations). El
// dashboard lo pasa explicito para no depender de ese default.
//
// OJO con la forma que devuelve: NO son evaluaciones, son PARTICIPACIONES
// (`EvaluationHistoryOut`, filas de `evaluation_submissions`). No traen `id`
// sino `participation_id`. Si es anónima, `is_anonymous` viene en `true`, pero
// el backend aún envía el `evaluation_id` y las respuestas para que el coder
// pueda revisarlas en su historial privado.
const getByEvaluator = async (evaluatorId, limit) =>
  await request(`/evaluations?evaluator_id=${evaluatorId}${limit ? `&limit=${limit}` : ''}`)

const getByEvaluatee = async (evaluateeId) => await request(`/evaluations?evaluatee_id=${evaluateeId}`)

// Predicados puros sobre una participacion del historial. Viven aca (y no
// duplicados en cada vista) porque describen la FORMA que devuelve la API, que
// es responsabilidad de esta capa. No tocan el DOM.
const isAnonymousParticipation = (entry) => entry?.is_anonymous === true

// Hay detalle que abrir siempre que el backend mande el evaluation_id
const hasVisibleDetail = (entry) => entry?.evaluation_id != null

export const evaluationService = {
  getForm,
  create,
  getByEvaluator,
  getByEvaluatee,
  isAnonymousParticipation,
  hasVisibleDetail
}
