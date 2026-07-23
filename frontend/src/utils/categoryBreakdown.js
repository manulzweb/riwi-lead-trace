import { evaluationService } from "../services/evaluation.service";
import { request } from "../services/api.service";

// Average (1-5) -> 0-100 scale, same formula as the backend but WITHOUT
// weight_percent: this breakdown is informative, it does not replace the ICP.
const to100Scale = (avg1to5) => Math.round(((avg1to5 - 1) / 4) * 100);

// Average score per category for one person in one period. There is no
// dedicated endpoint, so it is built client-side by crossing evaluation
// answers with the questions of their forms.
export const getCategoryBreakdown = async (evaluateeId, periodId) => {
  try {
    const evaluations = await evaluationService.getByEvaluatee(evaluateeId);
    const periodEvals = evaluations.filter((e) => e.period_id === periodId && e.status === "submitted");

    if (periodEvals.length === 0) return [];

    const uniqueFormIds = [...new Set(periodEvals.map(e => e.form_id))];
    const questionsMap = new Map();

    for (const formId of uniqueFormIds) {
      try {
        const questions = await request(`/questions?form_id=${formId}&include_inactive=true`);
        questions.forEach((q) => questionsMap.set(q.id, q));
      } catch (e) {
        console.error(e);
      }
    }


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
