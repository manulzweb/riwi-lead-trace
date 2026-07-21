import { navBarComponent } from "../../components/navbar";
import { dropdownComponent, setupDropdown } from "../../components/dropdown";
import { metricsService } from "../../services/metrics.service";
import { evaluationService } from "../../services/evaluation.service";
import { periodService } from "../../services/periods.service";
import { authService } from "../../services/auth.service";
import { showToast } from "../../components/alerts";
import { emptyStateComponent } from "../../components/emptyState";
import { escapeHtml } from "../../utils/validators";

export const renderMyResults = () => `
  ${navBarComponent()}
  <main class="mx-auto max-w-6xl px-6 py-10">
    <section class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Retroalimentación</p>
        <h1 class="mt-1 text-4xl font-black tracking-tight text-[var(--text-main)]">Mis resultados</h1>
        <p class="mt-4 text-[var(--text-muted)]">Consulta cómo te han evaluado los Coders de tu clan.</p>
      </div>
      <div id="period-selector-container" class="w-64">
        <label class="mb-2 block text-sm font-medium text-[var(--text-main)] sr-only" for="period-selector-btn">Periodo</label>
        ${dropdownComponent('period-selector', [{ value: '', label: 'Cargando periodos...' }], '')}
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
      <div id="feedback-list" class="grid gap-4" aria-live="polite" aria-busy="true">
        <div class="h-20 skeleton-shimmer rounded-3xl"></div>
      </div>
    </section>
  </main>
`;

// Estado de error del contenedor de feedback, con reintento. `retryId` permite
// distinguir el reintento de la carga inicial del de un periodo puntual.
const renderLoadError = (message, retryId) => `
  <article class="rounded-3xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-10 text-center">
    <p class="text-[var(--danger-text)] font-bold">${escapeHtml(message)}</p>
    <p class="mt-2 text-sm text-[var(--text-muted)]">Revisa tu conexión e inténtalo de nuevo.</p>
    <button type="button" id="${retryId}"
      class="mt-6 inline-flex items-center justify-center rounded-2xl bg-[var(--brand-bg)] px-5 py-3 text-sm font-bold text-[var(--brand-text)] hover:bg-[var(--brand-hover)] transition shadow-md cursor-pointer focus:ring-4 focus:ring-[var(--border-main)]">
      Reintentar
    </button>
  </article>
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

  // Carga inicial extraida para poder reintentarla desde el estado de error.
  const init = async () => {
  feedbackList.setAttribute("aria-busy", "true");
  try {
    periods = await periodService.get();

    if (periods.length === 0) {
      document.getElementById('period-selector-container').outerHTML = `
        <div id="period-selector-container" class="w-64">
          ${dropdownComponent('period-selector', [{ value: '', label: 'No hay periodos' }], '')}
        </div>`;
      setupDropdown('period-selector');
      feedbackList.innerHTML = '<p class="text-[var(--text-muted)]">No hay periodos registrados.</p>';
      return;
    }

    const activePeriod = periods.find(p => p.is_active) || periods[0];
    const periodOptions = periods.map(p => ({ value: p.id, label: p.name }));

    document.getElementById('period-selector-container').outerHTML = `
      <div id="period-selector-container" class="w-64">
        <label class="mb-2 block text-sm font-medium text-[var(--text-main)] sr-only" for="period-selector-btn">Periodo</label>
        ${dropdownComponent('period-selector', periodOptions, activePeriod.id)}
      </div>`;
    setupDropdown('period-selector');

    // After re-rendering, get the new input
    const periodInput = document.getElementById("period-selector");

    // Cargar datos del periodo inicial
    await loadResultsForPeriod(currentUser.id, activePeriod.id);

    if (periodInput) {
      periodInput.addEventListener("change", async () => {
        const selectedPeriodId = parseInt(periodInput.value);
        await loadResultsForPeriod(currentUser.id, selectedPeriodId);
      });
    }

  } catch (err) {
    showToast("Error", "error", "No se pudo cargar la información de resultados.");
    console.error(err);
    feedbackList.innerHTML = renderLoadError("No se pudo cargar la información de resultados.", "my-results-retry");
    document.getElementById("my-results-retry")?.addEventListener("click", init);
  } finally {
    feedbackList.setAttribute("aria-busy", "false");
  }
  };

  await init();

  async function loadResultsForPeriod(userId, periodId) {
    try {
      feedbackList.setAttribute("aria-busy", "true");
      feedbackList.innerHTML = `
        <div class="flex flex-col gap-4">
          <div class="h-20 skeleton-shimmer rounded-3xl"></div>
          <div class="h-20 skeleton-shimmer rounded-3xl"></div>
        </div>
      `;

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

        evalStatus.innerHTML = `<span class="${statusColor}">${escapeHtml(myMetrics.status)}</span>`;
      }

      // Filtrar evaluaciones pertenecientes al periodo seleccionado
      const periodEvaluations = evaluations.filter(e => e.period_id === periodId && e.status === "submitted");

      if (periodEvaluations.length === 0) {
        feedbackList.innerHTML = emptyStateComponent(
          "Sin feedback",
          "No has recibido evaluaciones para este periodo."
        );
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
          <p class="text-[var(--text-main)] italic">"${escapeHtml(ans.comment)}"</p>
        </article>
      `).join("");

    } catch (err) {
      showToast("Error", "error", "No se pudieron obtener tus resultados.");
      console.error(err);
      feedbackList.innerHTML = renderLoadError("No se pudieron obtener tus resultados.", "period-results-retry");
      document.getElementById("period-results-retry")
        ?.addEventListener("click", () => loadResultsForPeriod(userId, periodId));
    } finally {
      feedbackList.setAttribute("aria-busy", "false");
    }
  }
};
