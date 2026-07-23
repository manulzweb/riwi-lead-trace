import { navBarComponent } from "../../components/navbar";
import { dropdownComponent, setupDropdown } from "../../components/dropdown";
import { metricsService } from "../../services/metrics.service";
import { periodService } from "../../services/periods.service";
import { cohortsService } from "../../services/cohorts.service";
import { clansService } from "../../services/clans.service";
import { showToast } from "../../components/alerts";
import { getCategoryBreakdown } from "../../utils/categoryBreakdown";
import { formatDate } from "../../utils/date";
import { emptyStateComponent } from "../../components/emptyState.js";
import { escapeHtml } from "../../utils/validators";
import {
  Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler,
} from "chart.js";
import { settingsService } from "../../services/settings.service.js";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const renderMetricsError = () => `
  <div class="col-span-full rounded-3xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-6 text-center">
    <p class="text-sm font-semibold text-[var(--danger-text)]">No se pudieron cargar las métricas.</p>
    <button id="btn-retry-metrics" type="button"
      class="mt-4 rounded-2xl bg-[var(--brand-bg)] px-5 py-2.5 text-sm font-bold text-[var(--brand-text)] transition hover:bg-[var(--brand-hover)]">
      Reintentar
    </button>
  </div>
`;

export const renderMetrics = () => `
  ${navBarComponent()}
  <main class="px-6 py-10 transition-all duration-300 ease-in-out">
    <div class="mx-auto max-w-6xl">
    <section class="flex items-start justify-between gap-4">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Admin</p>
        <h1 class="mt-1 text-4xl font-black tracking-tight text-[var(--text-main)]">Métricas ICP</h1>
        <p class="mt-4 text-[var(--text-muted)]">Índice de Calidad Percibida general por líder, tutor y periodo.</p>
      </div>
      <div class="flex flex-col items-end print:hidden">
        <button id="download-pdf-btn" type="button"
          class="shrink-0 rounded-2xl border border-[var(--border-main)] bg-[var(--brand-bg)] px-4 py-2 text-sm font-semibold text-[var(--brand-text)] transition-all hover:bg-[var(--brand-hover)] flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          Descargar PDF
        </button>
        <p class="text-[10px] text-[var(--text-muted)] mt-1.5 max-w-[200px] text-right leading-tight">Solo se incluirán los resultados visibles según tus filtros y búsqueda.</p>
      </div>
    </section>

    <section class="mt-6 flex gap-4 flex-wrap items-center print:hidden">
      <div class="flex flex-col gap-1 w-48">
        <label class="text-sm font-semibold text-[var(--text-muted)]">Periodo:</label>
        <div id="period-dropdown-container">
          <div class="h-10 skeleton-shimmer rounded-2xl"></div>
        </div>
      </div>

      <div class="flex flex-col gap-1 w-48">
        <label class="text-sm font-semibold text-[var(--text-muted)]">Filtrar por rol:</label>
        ${dropdownComponent('filter-role', [
  { value: 'all', label: 'Todos' },
  { value: 'team_leader', label: 'Team Leaders' },
  { value: 'tutor', label: 'Tutores' }
], 'all')}
      </div>

      <div class="flex flex-col gap-1 w-48">
        <label class="text-sm font-semibold text-[var(--text-muted)]">Filtrar por cohorte:</label>
        <div id="real-cohort-dropdown-container">
          <!-- Filled by initMasterFilters -->
        </div>
      </div>
      <div class="flex flex-col gap-1 w-48">
        <label class="text-sm font-semibold text-[var(--text-muted)]">Filtrar por clan:</label>
        <div id="clan-dropdown-container">
          <!-- Filled by initMasterFilters -->
        </div>
      </div>
    </section>

    <div id="metrics-report" class="mt-8 bg-[var(--bg-base)]">
      <p id="report-period-label" class="mb-2 text-sm text-[var(--text-muted)]"></p>
      <div id="print-filters-label" class="hidden print:block text-sm text-[var(--text-muted)] mb-4 pb-4 border-b border-[var(--border-main)]"></div>

      <section id="kpis-section" class="grid gap-6 sm:grid-cols-3" aria-live="polite">
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
      
      <!-- ----- Highlights ----- -->
      <section id="highlights-section" class="mt-10 grid gap-4 sm:grid-cols-2" aria-live="polite"></section>

      <!-- ----- Detailed results ----- -->
      <section class="mt-10">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 print:hidden">
          <h2 class="text-2xl font-bold text-[var(--text-main)]">Resultados Detallados</h2>
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div class="relative w-full sm:w-64">
              <input type="text" id="search-metrics" placeholder="Buscar por nombre..." class="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-panel)] px-4 py-2 pl-10 text-sm focus:border-[var(--brand-bg)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-bg)]">
              <svg class="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm font-semibold text-[var(--text-muted)]">Ordenar por:</span>
              <div id="sort-dropdown-container">
                ${dropdownComponent('sort-metrics', [
                  {value: 'score_desc', label: 'Mayor ICP'},
                  {value: 'score_asc', label: 'Menor ICP'},
                  {value: 'evals_desc', label: 'Más evaluaciones'},
                  {value: 'name_asc', label: 'Nombre (A-Z)'}
                ], 'score_desc')}
              </div>
            </div>
          </div>
        </div>
        <div id="metrics-grid" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-live="polite">
          <div class="h-32 skeleton-shimmer rounded-3xl"></div>
          <div class="h-32 skeleton-shimmer rounded-3xl"></div>
          <div class="h-32 skeleton-shimmer rounded-3xl"></div>
        </div>
        <div id="pagination-container" class="mt-8 flex justify-center items-center gap-2 flex-wrap print:hidden"></div>
      </section>
    </div>
    </div>
  </main>
`;

export const setupMetrics = async () => {
  const kpiEvals = document.getElementById("kpi-total-evals");
  const kpiIcp = document.getElementById("kpi-avg-icp");
  const kpiPart = document.getElementById("kpi-participation");
  const gridContainer = document.getElementById("metrics-grid");
  const highlightsContainer = document.getElementById("highlights-section");
  const downloadBtn = document.getElementById("download-pdf-btn");
  const reportPeriodLabel = document.getElementById("report-period-label");
  const reportElement = document.getElementById("metrics-report");
  const periodContainer = document.getElementById("period-dropdown-container");

  // Role dropdown already exists in the static markup
  setupDropdown('filter-role', (val) => {
    currentRoleFilter = val;
    applyFilters();
  });

  if (!kpiEvals || !kpiIcp || !kpiPart || !gridContainer || !periodContainer) return;

  downloadBtn?.addEventListener("click", async () => {
    renderGrid(currentPeriodId, true);

    setTimeout(() => {
      window.print();
      renderGrid(currentPeriodId, false);
    }, 500);
  });

  let periods = [];
  let masterCohorts = [];
  let masterClans = [];
  let currentPeriodId = null;
  let currentRoleFilter = "all";
  let currentCohortFilter = "all";
  let currentRealCohortFilter = "all";
  let currentClanFilter = "all";
  let currentSummaryKpis = null;
  const settings = await settingsService.getSettings();
  const MIN_EVALUATIONS_FOR_ICP = settings?.required_evaluations || 3;
  
  let currentSearchQuery = "";
  let currentFilteredList = [];
  let currentPage = 1;
  const itemsPerPage = 6;
  let currentSort = "score_desc";
  const historyCharts = new Map();

  function runCounter(el, target, suffix = '') {
    if (!el) return;
    const duration = 1200;
    const startTime = performance.now();
    const numTarget = parseFloat(target);
    if (isNaN(numTarget) || numTarget === 0) {
      el.textContent = target + suffix;
      return;
    }
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = easeProgress * numTarget;
      el.textContent = (Number.isInteger(numTarget) ? Math.round(current) : current.toFixed(1)) + suffix;
      if (progress < 1) requestAnimationFrame(animate);
      else el.textContent = target + suffix;
    };
    requestAnimationFrame(animate);
  }

  async function initPeriods() {
    try {
      [periods, masterCohorts, masterClans] = await Promise.all([
        periodService.get(),
        cohortsService.get(),
        clansService.get()
      ]);
      
      initMasterFilters();

      if (periods.length === 0) {
        periodContainer.innerHTML = '<p class="text-sm text-[var(--text-muted)]">No hay periodos</p>';
        gridContainer.innerHTML = '<p class="text-[var(--text-muted)]">No hay periodos registrados.</p>';
        return;
      }

      const periodOptions = [
        { value: 0, label: 'Todos' },
        ...periods.map(p => ({
          value: p.id,
          label: p.name
        }))
      ];

      currentPeriodId = 0;

      periodContainer.innerHTML = dropdownComponent('filter-period', periodOptions, currentPeriodId);

      setupDropdown('filter-period', async (val) => {
        currentPeriodId = parseInt(val);
        await loadMetrics(currentPeriodId);
      });

      setupDropdown('sort-metrics', (val) => {
        currentSort = val;
        currentPage = 1;
        renderGrid();
      });

      const searchInput = document.getElementById("search-metrics");
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          currentSearchQuery = e.target.value.toLowerCase().trim();
          currentPage = 1;
          applyFilters();
        });
      }

      await loadMetrics(currentPeriodId);

    } catch (err) {
      showToast("Error", "error", "No se pudieron obtener las métricas.");
      console.error(err);
      periodContainer.innerHTML = '<p class="text-sm text-[var(--danger-text)]">No se pudo cargar</p>';
      gridContainer.innerHTML = renderMetricsError();
      document.getElementById("btn-retry-metrics")
        ?.addEventListener("click", initPeriods);
    }
  }

  await initPeriods();

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
      <article class="rounded-3xl border p-6 ${colorClasses.border}  ${colorClasses.bg}">
        <p class="text-xs font-semibold uppercase tracking-wider ${colorClasses.text}">${label}</p>
        <h3 class="mt-2 text-lg font-bold text-[var(--text-main)]">${escapeHtml(person.name)}</h3>
        <p class="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">${escapeHtml(person.role.replace('_', ' '))}</p>
        <p class="text-3xl font-black mt-2 ${colorClasses.text}">${escapeHtml(person.average_score)}/100</p>
      </article>
    `;

    const bestCard = highlightCard("Mejor evaluado", best, {
      border: "border-[var(--success-text)]/30",
      bg: "bg-[var(--success-bg)]",
      text: "text-[var(--success-text)]"
    });

    const opportunityCard = withScore.length > 1
      ? highlightCard("Oportunidad de mejora", needsSupport, {
        border: "border-[var(--warning-text)]/30",
        bg: "bg-[var(--warning-bg)]",
        text: "text-[var(--warning-text)]"
      })
      : "";

    highlightsContainer.innerHTML = bestCard + opportunityCard;
  }

  function initMasterFilters() {
    const realCohortContainer = document.getElementById("real-cohort-dropdown-container");

    if (realCohortContainer) {
      const cohortOptions = [
        { value: 'all', label: 'Todas las cohortes' },
        ...masterCohorts.map(c => ({ value: c.name, label: c.name }))
      ];
      realCohortContainer.innerHTML = dropdownComponent('filter-real-cohort', cohortOptions, currentRealCohortFilter);
      setupDropdown('filter-real-cohort', (val) => {
        currentRealCohortFilter = val;
        currentClanFilter = "all";
        updateClanDropdown();
        applyFilters();
      });
    }
    updateClanDropdown();
  }

  function updateClanDropdown() {
    const clanContainer = document.getElementById("clan-dropdown-container");
    if (!clanContainer) return;
    
    let possibleClans = masterClans;
    if (currentRealCohortFilter !== 'all') {
      possibleClans = possibleClans.filter(c => c.cohort_name === currentRealCohortFilter);
    }
    
    const clanOptions = [
      { value: 'all', label: 'Todos los clanes' },
      ...possibleClans.map(c => ({ value: c.name, label: c.name }))
    ];
    clanContainer.innerHTML = dropdownComponent('filter-clan', clanOptions, currentClanFilter);
    setupDropdown('filter-clan', (val) => {
      currentClanFilter = val;
      applyFilters();
    });
  }

  async function loadMetrics(periodId, roleFilter) {
    try {
      // Open history canvases are about to be replaced: destroy their Chart.js
      // instances or they leak.
      historyCharts.forEach((chart) => chart.destroy());
      historyCharts.clear();

      gridContainer.innerHTML = `
        <div class="h-32 skeleton-shimmer rounded-3xl"></div>
        <div class="h-32 skeleton-shimmer rounded-3xl"></div>
        <div class="h-32 skeleton-shimmer rounded-3xl"></div>
      `;

      const summary = await metricsService.getSummary(periodId);
      currentSummaryKpis = summary.kpis;

      if (reportPeriodLabel) {
        const periodName = periods.find(p => p.id === periodId)?.name ?? "";
        reportPeriodLabel.textContent = `Periodo: ${periodName} - generado el ${formatDate(new Date())}`;
      }

      // Keep the unfiltered list before applying local filters
      window.currentMasterList = summary.evaluatees;
      applyFilters();

    } catch (err) {
      showToast("Error", "error", "No se pudieron actualizar las métricas.");
      console.error(err);
    }
  }

  function applyFilters() {
    let list = window.currentMasterList || [];
    
    if (currentRoleFilter !== "all") {
      list = list.filter(e => e.role === currentRoleFilter);
    }
    if (currentRealCohortFilter !== "all") {
      list = list.filter(e => e.cohort_name === currentRealCohortFilter);
    }
    if (currentClanFilter !== "all") {
      list = list.filter(e => e.clan_name === currentClanFilter);
    }
    if (currentSearchQuery) {
      list = list.filter(e => e.name.toLowerCase().includes(currentSearchQuery));
    }

    const isFiltered = currentRoleFilter !== "all" || currentRealCohortFilter !== "all" || currentClanFilter !== "all" || Boolean(currentSearchQuery);

    let displayEvals = currentSummaryKpis?.total_evaluations ?? 0;
    let displayIcp = currentSummaryKpis?.average_score ?? 0;
    let displayPart = currentSummaryKpis?.participation_rate ?? 0;

    if (isFiltered) {
      displayEvals = list.reduce((acc, e) => acc + (e.n_evals || 0), 0);
      const validScores = list.map(e => e.average_score).filter(s => s !== null && s !== undefined);
      displayIcp = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;

      const masterTotalEvals = (window.currentMasterList || []).reduce((acc, e) => acc + (e.n_evals || 0), 0);
      const basePart = currentSummaryKpis?.participation_rate ?? 0;
      if (masterTotalEvals > 0) {
        displayPart = Math.min(100, Math.round((displayEvals / masterTotalEvals) * basePart));
      } else {
        displayPart = 0;
      }
    }

    runCounter(kpiEvals, displayEvals);
    runCounter(kpiIcp, displayIcp, '/100');
    runCounter(kpiPart, displayPart, '%');

    renderHighlights(list);
    currentFilteredList = list;
    
    // Update the print label
    const printLbl = document.getElementById("print-filters-label");
    if (printLbl) {
      let fText = [];
      if (currentRoleFilter !== "all") fText.push(`Rol: ${currentRoleFilter === "team_leader" ? "Team Leaders" : "Tutores"}`);
      if (currentRealCohortFilter !== "all") fText.push(`Cohorte: ${currentRealCohortFilter}`);
      if (currentClanFilter !== "all") fText.push(`Clan: ${currentClanFilter}`);
      if (currentSearchQuery) fText.push(`Búsqueda: "${currentSearchQuery}"`);
      
      if (fText.length > 0) {
        printLbl.innerHTML = `<strong>Filtros aplicados:</strong> ${fText.join(" | ")}`;
      } else {
        printLbl.innerHTML = `<strong>Filtros aplicados:</strong> Ninguno (Mostrando todos)`;
      }
    }

    renderGrid(currentPeriodId);
  }

  function renderGrid(periodId = currentPeriodId, printMode = false) {
    const paginationContainer = document.getElementById("pagination-container");
    if (currentFilteredList.length === 0) {
      gridContainer.innerHTML = emptyStateComponent(
        "Sin resultados",
        "No se encontraron líderes o tutores con este filtro."
      );
      if (paginationContainer) paginationContainer.innerHTML = "";
      return;
    }

    const hasValidScores = currentFilteredList.some(e => e.average_score !== null);
    if (!hasValidScores) {
      gridContainer.innerHTML = emptyStateComponent(
        "Esperando más evaluaciones",
        `Aún no hay suficientes datos. Debemos recibir un mínimo de evaluaciones (al menos ${MIN_EVALUATIONS_FOR_ICP} por persona) para poder calcular y mostrar las métricas del ICP.`
      );
      if (paginationContainer) paginationContainer.innerHTML = "";
      return;
    }

    // Apply sorting
    let sortedList = [...currentFilteredList];
    sortedList.sort((a, b) => {
      switch (currentSort) {
        case 'score_desc':
          return (b.average_score || 0) - (a.average_score || 0);
        case 'score_asc':
          return (a.average_score || 0) - (b.average_score || 0);
        case 'evals_desc':
          return (b.n_evals || 0) - (a.n_evals || 0);
        case 'name_asc':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    // Pagination
    let paginatedList = sortedList;
    let totalPages = 1;

    if (!printMode) {
      totalPages = Math.ceil(sortedList.length / itemsPerPage);
      if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
      
      const startIndex = (currentPage - 1) * itemsPerPage;
      paginatedList = sortedList.slice(startIndex, startIndex + itemsPerPage);
    }

    gridContainer.innerHTML = paginatedList.map(ev => {
      const scoreText = ev.average_score !== null ? `${ev.average_score}` : "--";

      // Neutral badge uses tokens, not literal Tailwind grays: bg-gray-* does
      // not react to the theme and breaks dark mode.
      let statusBadgeClass = "bg-[var(--bg-base)] text-[var(--text-muted)]";
      if (ev.status === "Sólido") statusBadgeClass = "bg-[var(--success-bg)] text-[var(--success-text)]";
      if (ev.status === "En riesgo") statusBadgeClass = "bg-[var(--danger-bg)] text-[var(--danger-text)]";
      if (ev.status === "Estable") statusBadgeClass = "bg-[var(--warning-bg)] text-[var(--warning-text)]";

      return `
        <article class="metrics-card rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-md transition-all hover:shadow-lg cursor-pointer" data-id="${ev.id}" data-period="${periodId}">
          <div class="flex items-start justify-between pointer-events-none">
            <div>
              <h3 class="text-lg font-bold text-[var(--text-main)]">${escapeHtml(ev.name)}</h3>
              <p class="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">${escapeHtml(ev.role.replace('_', ' '))}</p>
            </div>
            <span class="rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass}">${escapeHtml(ev.status)}</span>
          </div>

          <div class="mt-6 flex justify-between items-end border-t border-[var(--border-main)] pt-4 pointer-events-none">
            <div>
              <p class="text-xs text-[var(--text-muted)]">Evaluaciones</p>
              <p class="text-sm mt-1 text-[var(--text-main)]">${ev.n_evals}</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-[var(--text-muted)]">ICP</p>
              <p class="text-3xl font-black text-[var(--brand-bg)] mt-1">${scoreText}</p>
            </div>
          </div>

          <button class="btn-toggle-detail mt-4 w-full text-center text-xs font-semibold text-[var(--brand-bg)] pointer-events-none">
            Ver detalle ↓
          </button>
          <div id="detail-${ev.id}" data-detail-panel class="mt-4 hidden border-t border-[var(--border-main)] pt-4 cursor-default"></div>
        </article>
      `;
    }).join("");

    document.querySelectorAll(".metrics-card").forEach(card => {
      card.addEventListener("click", () => toggleDetail(card));
      // A click inside the detail panel must not collapse the card.
      card.querySelector("[data-detail-panel]")
        ?.addEventListener("click", (e) => e.stopPropagation());
    });

    if (paginationContainer) {
      if (totalPages > 1) {
        let paginationHtml = '';
        for (let i = 1; i <= totalPages; i++) {
          const isActive = i === currentPage;
          paginationHtml += `
            <button class="btn-page w-10 h-10 rounded-xl font-bold transition-all ${isActive ? 'bg-[var(--brand-bg)] text-[var(--brand-text)] shadow-md' : 'bg-[var(--bg-panel)] text-[var(--text-muted)] border border-[var(--border-main)] hover:border-[var(--brand-bg)] hover:text-[var(--brand-bg)]'}" data-page="${i}">
              ${i}
            </button>
          `;
        }
        paginationContainer.innerHTML = paginationHtml;

        document.querySelectorAll(".btn-page").forEach(btn => {
          btn.addEventListener("click", (e) => {
            currentPage = parseInt(e.currentTarget.dataset.page);
            renderGrid(periodId);
            // Scroll back to top of grid
            document.getElementById('metrics-grid').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          });
        });
      } else {
        paginationContainer.innerHTML = "";
      }
    }
  }

  // Category breakdown (same calc as the dashboard panel) plus the ICP history
  // across periods. Loaded lazily on open, not on every grid render.
  async function toggleDetail(card) {
    const evaluateeId = parseInt(card.dataset.id);
    const periodId = parseInt(card.dataset.period);
    const container = document.getElementById(`detail-${evaluateeId}`);
    const btn = card.querySelector(".btn-toggle-detail");
    if (!container) return;

    if (!container.classList.contains("hidden")) {
      container.classList.add("hidden");
      if (btn) btn.textContent = "Ver detalle por categoría e historial ↓";
      historyCharts.get(evaluateeId)?.destroy();
      historyCharts.delete(evaluateeId);
      return;
    }

    if (btn) btn.textContent = "Ocultar detalle ↑";
    container.classList.remove("hidden");
    container.innerHTML = `<div class="h-20 skeleton-shimmer rounded-2xl"></div>`;

    try {
      const [breakdown, history] = await Promise.all([
        getCategoryBreakdown(evaluateeId, periodId),
        metricsService.getHistory(evaluateeId),
      ]);

      const breakdownHtml = breakdown.length === 0
        ? `<p class="text-xs text-[var(--text-muted)]">Sin puntajes por categoría en este periodo.</p>`
        : breakdown.map(cat => `
            <div class="mb-2">
              <div class="flex justify-between text-xs mb-1">
                <span class="font-semibold text-[var(--text-main)]">${escapeHtml(cat.category)}</span>
                <span class="font-bold text-[var(--text-main)]">${escapeHtml(cat.score)}/100</span>
              </div>
              <div class="w-full bg-[var(--border-main)] h-1.5 rounded-full overflow-hidden">
                <div class="bg-[var(--brand-bg)] h-full rounded-full" style="width: ${cat.score}%"></div>
              </div>
            </div>
          `).join("");

      const historyHtml = history.length === 0
        ? `<p class="text-xs text-[var(--text-muted)]">Sin historial en otros periodos.</p>`
        : `<div class="h-40"><canvas id="history-chart-${evaluateeId}"></canvas></div>`;

      container.innerHTML = `
        <p class="text-xs font-semibold uppercase tracking-wider text-[var(--brand-bg)] mt-4 mb-2">Historial de ICP</p>
        ${historyHtml}
      `;

      if (history.length > 0) {
        historyCharts.get(evaluateeId)?.destroy();
        const canvas = document.getElementById(`history-chart-${evaluateeId}`);
        const brandColor = cssVar('--brand-bg') || '#4f46e5';
        const mutedColor = cssVar('--text-muted') || '#64748b';
        const ctx = canvas.getContext("2d");
        const gradient = ctx.createLinearGradient(0, 0, 0, 160);
        gradient.addColorStop(0, `${brandColor}66`);
        gradient.addColorStop(1, `${brandColor}00`);

        const chart = new Chart(canvas, {
          type: 'line',
          data: {
            labels: history.map(h => h.period_name),
            datasets: [{
              data: history.map(h => h.average_score),
              borderColor: brandColor,
              backgroundColor: gradient,
              pointBackgroundColor: brandColor,
              pointHoverBackgroundColor: "#ffffff",
              pointHoverBorderColor: brandColor,
              pointBorderWidth: 2,
              pointHoverBorderWidth: 3,
              pointRadius: 4,
              pointHoverRadius: 6,
              borderWidth: 3,
              tension: 0.4, // smooth curve
              fill: true,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: (ctx) => `ICP: ${ctx.parsed.y}/100` } },
            },
            scales: {
              y: { min: 0, max: 100, ticks: { color: mutedColor, font: { size: 10 } }, grid: { color: `${mutedColor}22` } },
              x: { ticks: { color: mutedColor, font: { size: 10 } }, grid: { display: false } },
            },
          },
        });
        historyCharts.set(evaluateeId, chart);
      }
    } catch (err) {
      console.error(err);
      container.innerHTML = `<p class="text-xs text-[var(--danger-text)]">No se pudo cargar el detalle.</p>`;
    }
  }
};
