import { formsService } from "../services/forms.service";
import { evaluationService } from "../services/evaluation.service";
import { request } from "../services/api.service";

// Promedio (1-5) -> escala 0-100, igual formula que metrics_service.calculate_average_score
// en el backend (ver docs/06-arquitectura.md), pero sin ponderar por weight_percent: el
// desglose por categoria es informativo, no reemplaza el ICP global ponderado.
const to100Scale = (avg1to5) => Math.round(((avg1to5 - 1) / 4) * 100);

// Desglose de puntaje promedio por categoria para una persona en un periodo.
// No hay endpoint dedicado en el backend para esto -- se arma en el cliente
// cruzando las respuestas de evaluations con las preguntas de sus forms.
export const getCategoryBreakdown = async (evaluateeId, periodId) => {
  try {
    const forms = await formsService.getForms();
    const questionsMap = new Map();

    for (const temp of forms) {
      try {
        const questions = await request(`/questions?form_id=${temp.id}`);
        questions.forEach((q) => questionsMap.set(q.id, q));
      } catch (e) {
        console.error(e);
      }
    }

    const evaluations = await evaluationService.getByEvaluatee(evaluateeId);
    const periodEvals = evaluations.filter((e) => e.period_id === periodId && e.status === "submitted");

    const categoryScores = {};
    periodEvals.forEach((ev) => {
      ev.answers.forEach((ans) => {
        if (ans.score !== null && questionsMap.has(ans.question_id)) {
          const q = questionsMap.get(ans.question_id);
          if (q.input_type === "scale") {
            if (!categoryScores[q.category]) {
              categoryScores[q.category] = { sum: 0, count: 0 };
            }
            categoryScores[q.category].sum += ans.score;
            categoryScores[q.category].count += 1;
          }
        }
      });
    });

    const breakdown = [];
    for (const [catName, data] of Object.entries(categoryScores)) {
      breakdown.push({ category: catName, score: to100Scale(data.sum / data.count) });
    }
    return breakdown;
  } catch (e) {
    console.error(e);
    return [];
  }
};
