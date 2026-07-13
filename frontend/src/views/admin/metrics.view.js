import { navBarComponent } from "../../components/navbar";
import { metricsService } from "../../services/metrics.service";
import { periodService } from "../../services/periods.service";
import { showToast } from "../../components/alerts";

export const renderMetrics = () => `
  ${navBarComponent()}
  <main class="mx-auto max-w-6xl px-6 py-10">
    <section>
      <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Admin</p>
      <h1 class="mt-1 text-4xl font-black tracking-tight text-[var(--text-main)]">Métricas ICA</h1>
      <p class="mt-4 text-[var(--text-muted)]">Índice de Calidad de Acompañamiento general por líder, tutor y periodo.</p>
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

    <!-- KPIs Cards -->
    <section id="kpis-section" class="mt-8 grid gap-6 sm:grid-cols-3">
      <article class="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-lg">
        <p class="text-sm text-[var(--text-muted)]">Evaluaciones recibidas</p>
        <div id="kpi-total-evals" class="mt-3 text-3xl font-black text-[var(--text-main)]">--</div>
      </article>
      <article class="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-lg">
        <p class="text-sm text-[var(--text-muted)]">Promedio ICA Global</p>
        <div id="kpi-avg-ica" class="mt-3 text-3xl font-black text-[var(--text-main)]">--</div>
      </article>
      <article class="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-lg">
        <p class="text-sm text-[var(--text-muted)]">Participación</p>
        <div id="kpi-participation" class="mt-3 text-3xl font-black text-[var(--text-main)]">--</div>
      </article>
    </section>

    <section class="mt-10">
      <h2 class="text-2xl font-bold text-[var(--text-main)] mb-6">Resultados Detallados</h2>
      <div id="metrics-grid" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div class="h-32 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
        <div class="h-32 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
        <div class="h-32 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
      </div>
    </section>
  </main>
`;

export const setupMetrics = async () => {
  const periodSelector = document.getElementById("filter-period");
  const roleSelector = document.getElementById("filter-role");
  const kpiEvals = document.getElementById("kpi-total-evals");
  const kpiIca = document.getElementById("kpi-avg-ica");
  const kpiPart = document.getElementById("kpi-participation");
  const gridContainer = document.getElementById("metrics-grid");

  if (!periodSelector || !roleSelector || !kpiEvals || !kpiIca || !kpiPart || !gridContainer) return;

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
      kpiIca.textContent = summary.kpis.average_ica ? `${summary.kpis.average_ica}/100` : "--";
      kpiPart.textContent = `${summary.kpis.participation_rate}%`;

      // Filtrar evaluados
      let list = summary.evaluatees;
      if (roleFilter !== "all") {
        list = list.filter(e => e.role === roleFilter);
      }

      if (list.length === 0) {
        gridContainer.innerHTML = `
          <div class="col-span-full rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-10 text-center text-[var(--text-muted)]">
            No se encontraron líderes o tutores con este filtro.
          </div>
        `;
        return;
      }

      gridContainer.innerHTML = list.map(ev => {
        const scoreText = ev.score !== null ? `${ev.score}` : "--";
        const trendText = ev.trend !== null 
          ? (ev.trend > 0 ? `+${ev.trend}` : ev.trend < 0 ? `${ev.trend}` : "0")
          : "--";
        
        let statusBadgeClass = "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-400";
        if (ev.status === "Sólido") statusBadgeClass = "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400";
        if (ev.status === "En riesgo") statusBadgeClass = "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400";
        if (ev.status === "Estable") statusBadgeClass = "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400";

        let trendClass = "text-gray-500";
        if (ev.trend > 0) trendClass = "text-emerald-500 font-bold";
        if (ev.trend < 0) trendClass = "text-red-500 font-bold";

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
                <p class="text-xs text-[var(--text-muted)]">Tendencia</p>
                <p class="text-sm mt-1 ${trendClass}">${trendText}</p>
              </div>
              <div class="text-right">
                <p class="text-xs text-[var(--text-muted)]">ICA</p>
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
};
