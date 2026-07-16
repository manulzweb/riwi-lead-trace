<<<<<<< HEAD
import { navBarComponent } from "../../components/navbar";
import { dropdownComponent, setupDropdown } from "../../components/dropdown";
=======
import html2pdf from "html2pdf.js";
import { navBarComponent } from "../../components/navbar";
import { metricsService } from "../../services/metrics.service";
import { periodService } from "../../services/periods.service";
import { showToast } from "../../components/alerts";
>>>>>>> upstream/develop

export const renderMetrics = () => `
  ${navBarComponent()}
  <main class="mx-auto max-w-6xl px-6 py-10">
<<<<<<< HEAD
    <section>
      <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Admin</p>
      <h1 class="mt-1 text-4xl font-black tracking-tight text-[var(--text-main)]">Métricas ICA</h1>
      <p class="mt-4 text-[var(--text-muted)]">Índice de Calidad de Acompañamiento por área y periodo.</p>
    </section>

    <section class="mt-6 flex gap-4 flex-wrap">
      <div class="w-48">
        ${dropdownComponent('filter-area', [
          { value: '', label: 'Todas las áreas' }
        ], '')}
      </div>
      <div class="w-48">
        ${dropdownComponent('filter-period', [
          { value: '', label: 'Todos los periodos' }
        ], '')}
      </div>
    </section>

    <section id="metrics-grid" class="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div class="h-32 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
      <div class="h-32 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
      <div class="h-32 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
    </section>
  </main>
`;

export const setupMetrics = () => {
  setupDropdown('filter-area');
  setupDropdown('filter-period');
=======
    <section class="flex items-start justify-between gap-4">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Admin</p>
        <h1 class="mt-1 text-4xl font-black tracking-tight text-[var(--text-main)]">Métricas ICP</h1>
        <p class="mt-4 text-[var(--text-muted)]">Índice de Calidad Percibida general por líder, tutor y periodo.</p>
      </div>
      <button id="download-pdf-btn" type="button"
        class="shrink-0 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-panel)] px-4 py-2 text-sm font-semibold text-[var(--text-main)] transition-all hover:bg-[var(--brand-hover)] hover:text-white">
        Descargar PDF
      </button>
    </section>

    <section class="mt-6 flex gap-4 flex-wrap items-center">
      <div class="flex items-center gap-2">
        <label for="filter-period" class="text-sm font-semibold text-[var(--text-muted)]">Periodo:</label>
        <select id="filter-period"
          class="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-panel)] px-4 py-2 text-sm text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:outline-none">
          <option value="">Cargando periodos...</option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <label for="filter-role" class="text-sm font-semibold text-[var(--text-muted)]">Filtrar por rol:</label>
        <select id="filter-role"
          class="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-panel)] px-4 py-2 text-sm text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:outline-none">
          <option value="all">Todos</option>
          <option value="team_leader">Team Leaders</option>
          <option value="tutor">Tutores</option>
        </select>
      </div>
    </section>

    <!-- Todo lo de aca adentro (id="metrics-report") es lo que se exporta a PDF -->
    <div id="metrics-report" class="mt-8 bg-[var(--bg-base)]">
      <p id="report-period-label" class="mb-4 text-sm text-[var(--text-muted)]"></p>

      <section id="kpis-section" class="grid gap-6 sm:grid-cols-3">
        <article class="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-lg">
          <p class="text-sm text-[var(--text-muted)]">Evaluaciones recibidas</p>
          <div id="kpi-total-evals" class="mt-3 text-3xl font-black text-[var(--text-main)]">--</div>
        </article>
        <article class="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-lg">
          <p class="text-sm text-[var(--text-muted)]">Promedio ICP Global</p>
          <div id="kpi-avg-icp" class="mt-3 text-3xl font-black text-[var(--text-main)]">--</div>
        </article>
        <article class="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-lg">
          <p class="text-sm text-[var(--text-muted)]">Participación</p>
          <div id="kpi-participation" class="mt-3 text-3xl font-black text-[var(--text-main)]">--</div>
        </article>
      </section>

      <section id="highlights-section" class="mt-10 grid gap-4 sm:grid-cols-2"></section>

      <section class="mt-10">
        <h2 class="text-2xl font-bold text-[var(--text-main)] mb-6">Resultados Detallados</h2>
        <div id="metrics-grid" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div class="h-32 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
          <div class="h-32 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
          <div class="h-32 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
        </div>
      </section>
    </div>
  </main>
`;

export const setupMetrics = async () => {
  const periodSelector = document.getElementById("filter-period");
  const roleSelector = document.getElementById("filter-role");
  const kpiEvals = document.getElementById("kpi-total-evals");
  const kpiIcp = document.getElementById("kpi-avg-icp");
  const kpiPart = document.getElementById("kpi-participation");
  const gridContainer = document.getElementById("metrics-grid");
  const highlightsContainer = document.getElementById("highlights-section");
  const downloadBtn = document.getElementById("download-pdf-btn");
  const reportPeriodLabel = document.getElementById("report-period-label");
  const reportElement = document.getElementById("metrics-report");

  if (!periodSelector || !roleSelector || !kpiEvals || !kpiIcp || !kpiPart || !gridContainer) return;

  downloadBtn?.addEventListener("click", async () => {
    downloadBtn.disabled = true;
    showToast("Generando PDF...", "info");
    try {
      const periodName = periods.find(p => p.id === currentPeriodId)?.name ?? "periodo";
      await html2pdf()
        .set({
          filename: `metricas-icp-${periodName}.pdf`,
          margin: 10,
          html2canvas: { backgroundColor: "#ffffff" }
        })
        .from(reportElement)
        .save();
      showToast("PDF descargado", "success");
    } catch (err) {
      showToast("Error", "error", "No se pudo generar el PDF.");
      console.error(err);
    } finally {
      downloadBtn.disabled = false;
    }
  });

  let periods = [];
  let currentPeriodId = null;
  let currentRoleFilter = "all";

  try {
    periods = await periodService.get();
    
    if (periods.length === 0) {
      periodSelector.innerHTML = '<option value="">No hay periodos</option>';
      gridContainer.innerHTML = '<p class="text-[var(--text-muted)]">No hay periodos registrados.</p>';
      return;
    }

    periodSelector.innerHTML = periods.map(p => 
      `<option value="${p.id}" ${p.is_active ? 'selected' : ''}>${p.name}</option>`
    ).join("");

    const activePeriod = periods.find(p => p.is_active) || periods[0];
    currentPeriodId = activePeriod.id;

    await loadMetrics(currentPeriodId, currentRoleFilter);

    periodSelector.addEventListener("change", async () => {
      currentPeriodId = parseInt(periodSelector.value);
      await loadMetrics(currentPeriodId, currentRoleFilter);
    });

    roleSelector.addEventListener("change", async () => {
      currentRoleFilter = roleSelector.value;
      await loadMetrics(currentPeriodId, currentRoleFilter);
    });

  } catch (err) {
    showToast("Error", "error", "No se pudieron obtener las métricas.");
    console.error(err);
  }

  // Destaca al mejor evaluado y, en tono constructivo, a quien mas se
  // beneficiaria de apoyo ("oportunidad de mejora", no "el peor").
  // Reutiliza los datos que ya trae /metrics/summary, sin endpoints nuevos.
  function renderHighlights(list) {
    if (!highlightsContainer) return;

    const withScore = list.filter(e => e.average_score !== null);
    if (withScore.length === 0) {
      highlightsContainer.innerHTML = "";
      return;
    }

    const sorted = [...withScore].sort((a, b) => b.average_score - a.average_score);
    const best = sorted[0];
    const needsSupport = sorted[sorted.length - 1];

    const highlightCard = (label, person, colorClasses) => `
      <article class="rounded-3xl border p-6 ${colorClasses.border} ${colorClasses.bg}">
        <p class="text-xs font-semibold uppercase tracking-wider ${colorClasses.text}">${label}</p>
        <h3 class="mt-2 text-lg font-bold text-[var(--text-main)]">${person.name}</h3>
        <p class="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">${person.role.replace('_', ' ')}</p>
        <p class="text-3xl font-black mt-2 ${colorClasses.text}">${person.average_score}/100</p>
      </article>
    `;

    const bestCard = highlightCard("Mejor evaluado", best, {
      border: "border-emerald-200 dark:border-emerald-900/50",
      bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
      text: "text-emerald-600 dark:text-emerald-400"
    });

    // Si solo hay una persona con datos, no tiene sentido mostrarla dos veces.
    const opportunityCard = withScore.length > 1
      ? highlightCard("Oportunidad de mejora", needsSupport, {
          border: "border-amber-200 dark:border-amber-900/50",
          bg: "bg-amber-50/50 dark:bg-amber-950/20",
          text: "text-amber-600 dark:text-amber-400"
        })
      : "";

    highlightsContainer.innerHTML = bestCard + opportunityCard;
  }

  async function loadMetrics(periodId, roleFilter) {
    try {
      gridContainer.innerHTML = `
        <div class="h-32 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
        <div class="h-32 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
        <div class="h-32 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
      `;

      const summary = await metricsService.getSummary(periodId);

      // Actualizar KPIs
      kpiEvals.textContent = summary.kpis.total_evaluations;
      kpiIcp.textContent = `${summary.kpis.average_score}/100`;
      kpiPart.textContent = `${summary.kpis.participation_rate}%`;

      if (reportPeriodLabel) {
        const periodName = periods.find(p => p.id === periodId)?.name ?? "";
        reportPeriodLabel.textContent = `Periodo: ${periodName} — generado el ${new Date().toLocaleDateString()}`;
      }

      // Filtrar evaluados
      let list = summary.evaluatees;
      if (roleFilter !== "all") {
        list = list.filter(e => e.role === roleFilter);
      }

      renderHighlights(list);

      if (list.length === 0) {
        gridContainer.innerHTML = `
          <div class="col-span-full rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-10 text-center text-[var(--text-muted)]">
            No se encontraron líderes o tutores con este filtro.
          </div>
        `;
        return;
      }

      gridContainer.innerHTML = list.map(ev => {
        const scoreText = ev.average_score !== null ? `${ev.average_score}` : "--";

        let statusBadgeClass = "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-400";
        if (ev.status === "Sólido") statusBadgeClass = "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400";
        if (ev.status === "En riesgo") statusBadgeClass = "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400";
        if (ev.status === "Estable") statusBadgeClass = "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400";

        return `
          <article class="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-md transition-all hover:shadow-lg">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="text-lg font-bold text-[var(--text-main)]">${ev.name}</h3>
                <p class="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">${ev.role.replace('_', ' ')}</p>
              </div>
              <span class="rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass}">${ev.status}</span>
            </div>

            <div class="mt-6 flex justify-between items-end border-t border-[var(--border-main)] pt-4">
              <div>
                <p class="text-xs text-[var(--text-muted)]">Evaluaciones</p>
                <p class="text-sm mt-1 text-[var(--text-main)]">${ev.n_evals}</p>
              </div>
              <div class="text-right">
                <p class="text-xs text-[var(--text-muted)]">ICP</p>
                <p class="text-3xl font-black text-[var(--brand-bg)] mt-1">${scoreText}</p>
              </div>
            </div>
          </article>
        `;
      }).join("");

    } catch (err) {
      showToast("Error", "error", "No se pudieron actualizar las métricas.");
      console.error(err);
    }
  }
>>>>>>> upstream/develop
};
