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
// sino `participation_id`, y en las anonimas `evaluation_id`, `form_id`,
// `status` y `submitted_at` llegan en `null` con `answers` vacio, porque el
// vinculo entre la persona y su contenido no existe en la BD. No es un dato
// que falte: es la garantia de anonimato (regla 1 de CLAUDE.md).
const getByEvaluator = async (evaluatorId, limit) =>
  await request(`/evaluations?evaluator_id=${evaluatorId}${limit ? `&limit=${limit}` : ''}`)

const getByEvaluatee = async (evaluateeId) => await request(`/evaluations?evaluatee_id=${evaluateeId}`)

// Predicados puros sobre una participacion del historial. Viven aca (y no
// duplicados en cada vista) porque describen la FORMA que devuelve la API, que
// es responsabilidad de esta capa. No tocan el DOM.
//
// Son defensivos a proposito: el backend manda `is_anonymous` calculado, pero
// la senal estructural real es `evaluation_id === null`. Si una de las dos
// faltara, la otra sigue clasificando bien, y ante la duda se asume anonima
// (fallar hacia "no muestres el detalle" nunca rompe el anonimato).
const isAnonymousParticipation = (entry) =>
  entry?.is_anonymous === true || entry?.evaluation_id == null

// Solo hay detalle que abrir si existe el vinculo con el contenido.
const hasVisibleDetail = (entry) => !isAnonymousParticipation(entry)

export const evaluationService = {
  getForm,
  create,
  getByEvaluator,
  getByEvaluatee,
  isAnonymousParticipation,
  hasVisibleDetail
}
