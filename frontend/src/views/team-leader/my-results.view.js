import { navBarComponent } from "../../components/navbar";
import { metricsService } from "../../services/metrics.service";
import { evaluationService } from "../../services/evaluation.service";
import { periodService } from "../../services/periods.service";
import { authService } from "../../services/auth.service";
import { showToast } from "../../components/alerts";

export const renderMyResults = () => `
  ${navBarComponent()}
  <main class="mx-auto max-w-6xl px-6 py-10">
    <section class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Retroalimentación</p>
        <h1 class="mt-1 text-4xl font-black tracking-tight text-[var(--text-main)]">Mis resultados</h1>
        <p class="mt-4 text-[var(--text-muted)]">Consulta cómo te han evaluado los Coders de tu clan.</p>
      </div>
      <div>
        <select id="period-selector" 
          class="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-panel)] px-4 py-3 text-sm text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:outline-none">
          <option value="">Cargando periodos...</option>
        </select>
      </div>
    </section>

    <section class="mt-8 grid gap-6 md:grid-cols-3">
      <article class="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-lg">
        <p class="text-sm text-[var(--text-muted)]">ICP actual</p>
        <div id="ica-score" class="mt-3 text-3xl font-black text-[var(--text-main)]">--</div>
      </article>
      <article class="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-lg">
        <p class="text-sm text-[var(--text-muted)]">Evaluaciones recibidas</p>
        <div id="eval-count" class="mt-3 text-3xl font-black text-[var(--text-main)]">--</div>
      </article>
      <article class="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-lg">
        <p class="text-sm text-[var(--text-muted)]">Estado</p>
        <div id="eval-status" class="mt-3 text-2xl font-bold text-[var(--text-main)]">--</div>
      </article>
    </section>

    <section class="mt-10">
      <h2 class="text-2xl font-bold text-[var(--text-main)] mb-6">Comentarios y Detalles</h2>
      <div id="feedback-list" class="grid gap-4">
        <div class="h-20 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
      </div>
    </section>
  </main>
`;

export const setupMyResults = async () => {
  const periodSelector = document.getElementById("period-selector");
  const icaScore = document.getElementById("ica-score");
  const evalCount = document.getElementById("eval-count");
  const evalStatus = document.getElementById("eval-status");
  const feedbackList = document.getElementById("feedback-list");

  if (!periodSelector || !icaScore || !evalCount || !evalStatus || !feedbackList) return;

  const currentUser = authService.getSession();
  let periods = [];

  try {
    periods = await periodService.get();

    if (periods.length === 0) {
      periodSelector.innerHTML = '<option value="">No hay periodos</option>';
      feedbackList.innerHTML = '<p class="text-[var(--text-muted)]">No hay periodos registrados.</p>';
      return;
    }

    periodSelector.innerHTML = periods.map(p =>
      `<option value="${p.id}" ${p.is_active ? 'selected' : ''}>${p.name}</option>`
    ).join("");

    const activePeriod = periods.find(p => p.is_active) || periods[0];

    // Cargar datos del periodo inicial
    await loadResultsForPeriod(currentUser.id, activePeriod.id);

    periodSelector.addEventListener("change", async () => {
      const selectedPeriodId = parseInt(periodSelector.value);
      await loadResultsForPeriod(currentUser.id, selectedPeriodId);
    });

  } catch (err) {
    showToast("Error", "error", "No se pudo cargar la información de resultados.");
    console.error(err);
  }

  async function loadResultsForPeriod(userId, periodId) {
    try {
      feedbackList.innerHTML = '<div class="text-center py-4 text-[var(--text-muted)] animate-pulse">Cargando comentarios...</div>';

      const [summary, evaluations] = await Promise.all([
        metricsService.getSummary(periodId),
        evaluationService.getByEvaluatee(userId)
      ]);

      const myMetrics = summary.evaluatees.find(e => e.id === userId);

      if (!myMetrics || myMetrics.average_score === null) {
        icaScore.textContent = "--";
        evalCount.textContent = myMetrics ? myMetrics.n_evals : "0";
        evalStatus.innerHTML = `<span class="text-gray-400">Datos insuficientes</span>`;
      } else {
        icaScore.textContent = `${myMetrics.average_score}/100`;
        evalCount.textContent = myMetrics.n_evals;

        let statusColor = "text-gray-500";
        if (myMetrics.status === "Sólido") statusColor = "text-emerald-500";
        if (myMetrics.status === "En riesgo") statusColor = "text-red-500";
        if (myMetrics.status === "Estable") statusColor = "text-amber-500";

        evalStatus.innerHTML = `<span class="${statusColor}">${myMetrics.status}</span>`;
      }

      // Filtrar evaluaciones pertenecientes al periodo seleccionado
      const periodEvaluations = evaluations.filter(e => e.period_id === periodId && e.status === "submitted");

      if (periodEvaluations.length === 0) {
        feedbackList.innerHTML = `
          <article class="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-10 text-center text-[var(--text-muted)]">
            No has recibido ninguna evaluación para este periodo.
          </article>
        `;
        return;
      }

      // Recopilar comentarios de texto y puntajes
      const allAnswers = [];
      periodEvaluations.forEach(ev => {
        ev.answers.forEach(ans => {
          if (ans.comment || ans.score) {
            allAnswers.push(ans);
          }
        });
      });

      const textAnswers = allAnswers.filter(ans => ans.comment);

      if (textAnswers.length === 0) {
        feedbackList.innerHTML = `
          <article class="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-10 text-center text-[var(--text-muted)]">
            No hay comentarios escritos detallados todavía para este periodo.
          </article>
        `;
        return;
      }

      feedbackList.innerHTML = textAnswers.map(ans => `
        <article class="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-5 shadow-sm">
          <p class="text-sm font-semibold uppercase tracking-wider text-[var(--brand-bg)] mb-2">Comentario de Coder</p>
          <p class="text-[var(--text-main)] italic">"${ans.comment}"</p>
        </article>
      `).join("");

    } catch (err) {
      showToast("Error", "error", "No se pudieron obtener tus resultados.");
      console.error(err);
    }
  }
};
