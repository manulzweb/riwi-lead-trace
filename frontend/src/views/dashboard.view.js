import { authService } from "../services/auth.service";
import { navBarComponent } from "../components/navbar";
import { escapeHtml } from "../utils/validators";
import { Card, StatsCard } from "../components/cards_ui";
import { metricsService } from "../services/metrics.service";
import { evaluationService } from "../services/evaluation.service";
import { periodService } from "../services/periods.service";
import { cohortsService } from "../services/cohorts.service";
import { clansService } from "../services/clans.service";
import { dropdownComponent, setupDropdown } from "../components/dropdown";
import { evaluablesService } from "../services/evaluables.service";
import { getMedalIcon } from "../components/icons";
import { tableComponent } from "../components/table";

const icons = {
  check: `<svg aria-hidden="true" focusable="false" class="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  star: `<svg aria-hidden="true" focusable="false" class="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>`,
  clock: `<svg aria-hidden="true" focusable="false" class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  users: `<svg aria-hidden="true" focusable="false" class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`,
  chartPie: `<svg aria-hidden="true" focusable="false" class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>`
};

// El historial del evaluador devuelve PARTICIPACIONES, y las anonimas llegan
// con `status` en null: el vinculo con el contenido no existe, asi que no hay
// estado que consultar. Una participacion anonima SI esta hecha -- contarla
// como pendiente (que es lo que hacia `e.status !== "submitted"`) inflaba el
// contador de pendientes y le decia al coder que le faltaba trabajo ya hecho.
const isPendingParticipation = (entry) =>
  !evaluationService.isAnonymousParticipation(entry) && entry.status !== "submitted";

const renderDoughnutContainer = (percentage) => {
  return `
    <div class="relative flex flex-col items-center justify-center h-48 w-48 mx-auto">
      <canvas id="participation-chart"></canvas>
      <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span class="text-2xl font-black text-[var(--text-main)] leading-none">${percentage}%</span>
      </div>
    </div>
  `;
};

export const renderDashboard = () => {
  return `
    ${navBarComponent()}
    <main class="min-h-screen bg-[var(--bg-base)] p-6 transition-all duration-300 ease-in-out">
      <div id="dashboard-content" class="max-w-7xl mx-auto space-y-6" aria-live="polite" aria-busy="true">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          ${Array(4).fill(`
            <div class="h-32 rounded-[2rem] bg-[var(--bg-panel)] p-6 shadow-sm border border-[var(--border-main)] flex flex-col justify-between">
              <div class="h-4 w-24 skeleton-shimmer rounded-sm"></div>
              <div class="h-8 w-16 skeleton-shimmer rounded-sm"></div>
            </div>
          `).join("")}
        </div>
        <div class="h-64 rounded-[2rem] bg-[var(--bg-panel)] p-6 shadow-sm border border-[var(--border-main)] flex flex-col">
          <div class="h-6 w-48 skeleton-shimmer rounded-sm mb-6"></div>
          <div class="flex-1 skeleton-shimmer rounded-xl"></div>
        </div>
      </div>
    </main>
  `;
};

let currentPeriods = [];
let masterCohorts = [];
let masterClans = [];
let selectedPeriodId = null;
// tenga que volver a pedir /metrics. Antes vivia en window.__dashboardEvaluatees:
// un global sobrevive a la navegacion y podia servir datos rancios de una
// sesion o un periodo anterior. Como variable de modulo se reasigna en cada
// render y no se expone fuera del archivo.
let dashboardEvaluatees = [];

export const setupDashboard = async () => {
  const content = document.getElementById("dashboard-content");
  if (!content) return;

  const user = authService.getSession();
  const name = user?.name ? escapeHtml(user.name) : "Usuario";
  const role = user?.roles ? user.roles[0] : "coder";

  // Carga extraida para poder reintentarla sin recargar la pagina: el estado
  // de error dejaba al usuario sin salida salvo F5.
  const load = async () => {
    content.setAttribute("aria-busy", "true");
    try {
      const results = await Promise.all([
        periodService.get(),
        cohortsService.get(),
        clansService.get()
      ]);
      currentPeriods = results[0];
      masterCohorts = results[1];
      masterClans = results[2];
      
      const activePeriod = currentPeriods.find(p => p.is_active) || currentPeriods[0];
      selectedPeriodId = activePeriod ? String(activePeriod.id) : null;

      await renderDashboardContent(content, user, name, role);

    } catch (err) {
      content.innerHTML = `
        <div class="bg-[var(--danger-bg)] text-[var(--danger-text)] p-6 rounded-xl border border-[var(--danger-border)] text-center">
          <p>Hubo un error al cargar los datos del dashboard. Verifica tu conexión.</p>
          <button type="button" id="dashboard-retry"
            class="mt-4 inline-flex items-center justify-center rounded-2xl bg-[var(--brand-bg)] px-5 py-2.5 text-sm font-bold text-[var(--brand-text)] hover:bg-[var(--brand-hover)] transition cursor-pointer focus:ring-4 focus:ring-[var(--border-main)]">
            Reintentar
          </button>
        </div>
      `;
      document.getElementById("dashboard-retry")?.addEventListener("click", load);
      console.error(err);
    } finally {
      content.setAttribute("aria-busy", "false");
    }
  };

  await load();
};

const renderDashboardContent = async (content, user, name, role) => {
  // Se limpia en cada render para no arrastrar los evaluables del periodo o
  // del usuario anterior.
  dashboardEvaluatees = [];

  let html = `
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
      <div>
        <h1 class="text-3xl font-bold text-[var(--text-main)]">Bienvenido, ${name}</h1>
        <p class="text-[var(--text-muted)] mt-1">Aquí tienes un resumen de tu actividad en LeadTrace.</p>
      </div>
      ${role === 'admin' && currentPeriods.length > 0 ? `
        <div class="flex flex-col md:flex-row gap-4 z-20 relative w-full md:w-auto flex-wrap justify-end">
          <div class="w-full sm:w-48">
            <label class="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider" for="dashboard-period-filter-btn">Periodo</label>
            ${dropdownComponent('dashboard-period-filter', currentPeriods.map(p => ({
    value: String(p.id),
    label: p.name + (p.is_active ? ' (Activo)' : '')
  })), selectedPeriodId)}
          </div>
          <div class="w-full sm:w-48" id="dashboard-cohort-filter-container">
            <label class="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider" for="dashboard-cohort-filter-btn">Cohorte</label>
            ${dropdownComponent('dashboard-cohort-filter', [{ value: 'all', label: 'Todas' }], 'all')}
          </div>
          <div class="w-full sm:w-48" id="clan-filter-container">
            <label class="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider" for="dashboard-clan-filter-btn">Clan</label>
            ${dropdownComponent('dashboard-clan-filter', [{ value: 'all', label: 'Todos' }], 'all')}
          </div>
        </div>
      ` : ''}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-0 transition-opacity duration-500 ease-out" id="dashboard-cards">
  `;

  let currentKpis = null;

  if (role === "admin") {
    // Admin View
    const summary = selectedPeriodId ? await metricsService.getSummary(selectedPeriodId) : { kpis: { total_evaluations: 0, average_score: 0, participation_rate: 0 }, evaluatees: [] };
    const kpis = summary.kpis || { total_evaluations: 0, average_score: 0, participation_rate: 0 };
    currentKpis = kpis;

    // Alertas Activas logic
    let alertMsg = "Ninguna por el momento";
    let alertIconColor = "text-green-500";
    if (selectedPeriodId) {
      const p = currentPeriods.find(x => String(x.id) === String(selectedPeriodId));
      if (p && p.is_active) {
        const daysLeft = Math.ceil((new Date(p.ends_at) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 5 && kpis.participation_rate < 50) {
          alertMsg = "¡Cierre próximo y baja participación!";
          alertIconColor = "text-rose-500";
        } else if (daysLeft <= 5) {
          alertMsg = `Cierre en ${daysLeft} días.`;
          alertIconColor = "text-amber-500";
        }
      }
    }

    html += `
      ${StatsCard({
      title: "Alertas Activas",
      value: `<span class="animate-number" data-value="${alertIconColor === "text-green-500" ? 0 : 1}">${alertIconColor === "text-green-500" ? "Todo OK" : "Atención"}</span>`,
      icon: `<svg aria-hidden="true" focusable="false" class="w-6 h-6 ${alertIconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      description: alertMsg
    })}
      ${StatsCard({ title: "ICP Global Promedio", value: `<span class="animate-number" data-value="${kpis.average_score}">${kpis.average_score}</span><span class="text-2xl text-[var(--text-muted)] ml-1">/100</span>`, icon: icons.star, description: "Desempeño de la plataforma" })}
      
      <div class="col-span-1 md:col-span-2 lg:col-span-1">
        ${Card({
      className: "h-full flex flex-col p-6",
      children: `
            <h3 class="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider text-left w-full mb-4">Tasa de Participación</h3>
            <div class="flex-1 flex flex-col items-center justify-center w-full">
              ${renderDoughnutContainer(kpis.participation_rate)}
            </div>
          `
    })}
      </div>
      <div class="col-span-1 md:col-span-2 lg:col-span-3 mt-4">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h2 class="text-xl font-bold text-[var(--text-main)]">Top Rendimiento (ICP)</h2>
        </div>
        <div class="flex flex-col md:flex-row gap-6" id="dashboard-top-tables">
        </div>
      </div>
    </div>
    `;

    content.innerHTML = html;

    // Initialize participation doughnut chart
    const pChartCtx = document.getElementById('participation-chart');
    if (pChartCtx && currentKpis) {
      const rootStyle = getComputedStyle(document.documentElement);
      const brandColor = rootStyle.getPropertyValue('--brand-bg').trim() || '#4f46e5';
      const emptyColor = rootStyle.getPropertyValue('--border-main').trim() || '#e5e7eb';
      
      const total = currentKpis.total_evaluations;
      const rate = currentKpis.participation_rate;
      const possible = rate > 0 ? Math.round((total / (rate / 100))) : 0;
      const pending = Math.max(0, possible - total);

      import('chart.js/auto').then(({ default: Chart }) => {
        new Chart(pChartCtx, {
          type: 'doughnut',
          data: {
            labels: ['Participación', 'Pendiente'],
            datasets: [{
              data: [total, pending],
              backgroundColor: [brandColor, emptyColor],
              borderWidth: 0,
              hoverOffset: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
              legend: { display: false }
            }
          }
        });
      }).catch(e => console.error("Chart load error:", e));
    }

    // Extract unique clans
    const validEvaluatees = summary.evaluatees?.filter(e => e.average_score !== null) || [];
    const clans = [...new Set(validEvaluatees.map(e => e.clan_name).filter(Boolean))].sort();

    // Se guarda para que el filtro por clan no vuelva a pedir la API.
    dashboardEvaluatees = validEvaluatees;

    const uniqueCohorts = [...new Set(validEvaluatees.map(e => e.cohort_name).filter(Boolean))].sort();
    const cohortContainer = document.getElementById('dashboard-cohort-filter-container');
    const clanContainer = document.getElementById('clan-filter-container');

    const updateDashboardTables = () => {
      const clanSelector = document.getElementById('dashboard-clan-filter');
      const currentClan = clanSelector ? clanSelector.dataset.value || 'all' : 'all';
      const cohortSelector = document.getElementById('dashboard-cohort-filter');
      const currentCohort = cohortSelector ? cohortSelector.dataset.value || 'all' : 'all';

      let filtered = dashboardEvaluatees;
      if (currentClan !== 'all') filtered = filtered.filter(e => e.clan_name === currentClan);
      if (currentCohort !== 'all') filtered = filtered.filter(e => e.cohort_name === currentCohort);

      const topTutors = filtered.filter(e => e.role === "tutor").sort((a, b) => b.average_score - a.average_score).slice(0, 3);
      const topLeaders = filtered.filter(e => e.role === "team_leader").sort((a, b) => b.average_score - a.average_score).slice(0, 3);

      const buildTable = (title, data) => tableComponent({
        title,
        columns: [
          { label: "#", align: "center", width: "16" },
          { label: "Nombre", align: "left" },
          { label: "ICP", align: "right" }
        ],
        data,
        emptyStateHtml: `
          <div class="flex flex-col items-center justify-center gap-3">
            <svg class="w-12 h-12 text-[var(--border-main)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
            <p class="text-sm font-medium">Aún no hay suficientes datos en este segmento.</p>
          </div>
        `,
        renderRow: (e, index) => {
          let medalIcon = "";
          let rowClass = "hover:bg-[var(--bg-base)] transition-colors";
          
          const rankIcon = getMedalIcon(index + 1);
          if (rankIcon) {
            const titles = ["1er Puesto - Oro", "2do Puesto - Plata", "3er Puesto - Bronce"];
            medalIcon = `<span title="${titles[index]}" class="cursor-help inline-block mx-auto flex justify-center">${rankIcon}</span>`;
          } else {
            medalIcon = `<span class="font-bold text-[var(--text-muted)]">${index + 1}</span>`;
          }
          
          return `
            <tr class="${rowClass}">
              <td class="px-4 py-3 text-center">${medalIcon}</td>
              <td class="px-4 py-3 font-bold text-[var(--text-main)] truncate">
                ${escapeHtml(e.name)}
                <span class="block text-xs font-normal text-[var(--text-muted)]">${escapeHtml(e.cohort_name || 'Sin cohorte')} - ${escapeHtml(e.clan_name || 'Sin clan')}</span>
              </td>
              <td class="px-4 py-3 text-right font-black text-[var(--text-main)]">${e.average_score}</td>
            </tr>
          `;
        }
      });
      document.getElementById('dashboard-top-tables').innerHTML = buildTable("Top Team Leaders", topLeaders) + buildTable("Top Tutores", topTutors);
    };

    const updateClanDropdown = (selectedCohort) => {
      let filteredClans = masterClans;
      if (selectedCohort && selectedCohort !== 'all') {
        filteredClans = filteredClans.filter(c => c.cohort_name === selectedCohort);
      }
      const opts = [{ value: 'all', label: 'Todos' }, ...filteredClans.map(c => ({ value: c.name, label: c.name }))];
      clanContainer.innerHTML = `
        <label class="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider" for="dashboard-clan-filter-btn">Clan</label>
        ${dropdownComponent('dashboard-clan-filter', opts, 'all')}
      `;
      setupDropdown('dashboard-clan-filter', updateDashboardTables);
    };

    if (cohortContainer) {
      const opts = [{ value: 'all', label: 'Todas' }, ...masterCohorts.map(c => ({ value: c.name, label: c.name }))];
      cohortContainer.innerHTML = `
        <label class="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider" for="dashboard-cohort-filter-btn">Cohorte</label>
        ${dropdownComponent('dashboard-cohort-filter', opts, 'all')}
      `;
      setupDropdown('dashboard-cohort-filter', (val) => {
        updateClanDropdown(val);
        updateDashboardTables();
      });
    }

    if (clanContainer) {
      updateClanDropdown('all');
    }

    setupDropdown('dashboard-clan-filter', updateDashboardTables);
    setupDropdown('dashboard-cohort-filter', updateDashboardTables);

    updateDashboardTables();

    if (currentPeriods.length > 0) {
      setupDropdown('dashboard-period-filter', async (val) => {
        selectedPeriodId = val;
        content.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          ${Array(4).fill(`
            <div class="h-32 rounded-[2rem] bg-[var(--bg-panel)] p-6 shadow-sm border border-[var(--border-main)] flex flex-col justify-between">
              <div class="h-4 w-24 skeleton-shimmer rounded-sm"></div>
              <div class="h-8 w-16 skeleton-shimmer rounded-sm"></div>
            </div>
          `).join("")}
        </div>
        <div class="h-64 rounded-[2rem] bg-[var(--bg-panel)] p-6 shadow-sm border border-[var(--border-main)] flex flex-col mt-6">
          <div class="h-6 w-48 skeleton-shimmer rounded-sm mb-6"></div>
          <div class="flex-1 skeleton-shimmer rounded-xl"></div>
        </div>
        `;
        await renderDashboardContent(content, user, name, role);
      });
    }
  } else if (role === "team_leader" || role === "tutor") {
    // Leader / Tutor View
    const summary = selectedPeriodId ? await metricsService.getSummary(selectedPeriodId) : { evaluatees: [] };
    const myStats = summary.evaluatees?.find(e => e.id === user.id) || { n_evals: 0, average_score: 0, status: "Sin datos" };

    html += `
      ${StatsCard({ title: "Evaluaciones Recibidas", value: `<span class="animate-number" data-value="${myStats.n_evals}">${myStats.n_evals}</span>`, icon: icons.users, description: "En el periodo actual" })}
      ${StatsCard({ title: "Puntaje Promedio ICP", value: `<span class="animate-number" data-value="${myStats.average_score ?? 0}">${myStats.average_score ?? 0}</span><span class="text-2xl text-[var(--text-muted)] ml-1">/100</span>`, icon: icons.star, description: "Estado: " + myStats.status })}
    `;

    if (role === "tutor") {
      const myEvals = await evaluationService.getByEvaluator(user.id, 100);
      const pending = myEvals.filter(isPendingParticipation).length;
      html += StatsCard({ title: "Evaluaciones por Hacer", value: `<span class="animate-number" data-value="${pending}">${pending}</span>`, icon: icons.clock, description: "Pendientes de enviar" });
    }
    
    html += `</div>`;
    content.innerHTML = html;

  } else {
    // Coder View
    const [myEvals, evaluables] = await Promise.all([
      evaluationService.getByEvaluator(user.id, 100),
      evaluablesService.get()
    ]);
    const completed = myEvals.filter(e => !isPendingParticipation(e)).length;
    const drafts = myEvals.filter(isPendingParticipation).length;
    const totalEvaluables = evaluables ? evaluables.length : 0;
    const pending = Math.max(0, totalEvaluables - completed);

    html += `
      ${StatsCard({ title: "Completadas", value: `<span class="animate-number" data-value="${completed}">${completed}</span>`, icon: icons.check, description: "Evaluaciones enviadas" })}
      ${StatsCard({ title: "Por Evaluar / Borradores", value: `<span class="animate-number" data-value="${pending}">${pending}</span>`, icon: icons.clock, description: "Pendientes o en curso" })}
      
      ${Card({
      className: "h-full flex flex-col p-6 lg:row-span-2 shadow-sm border border-[var(--border-main)]",
      children: `
          <h3 class="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider text-left w-full mb-4">Progreso Actual</h3>
          <div class="flex-1 flex flex-col items-center justify-center w-full min-h-[200px]">
            ${completed + pending === 0
          ? `<div class="text-center text-[var(--text-muted)] italic my-auto">Aún no hay datos para graficar.</div>`
          : `<div class="relative w-48 h-48 my-4"><canvas id="coder-participation-chart"></canvas></div>`
        }
          </div>
        `
    })}
      
      <div class="col-span-1 md:col-span-2 lg:col-span-2 mt-4 lg:mt-0">
        <div class="bg-[var(--bg-panel)] rounded-3xl border border-[var(--border-main)] p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 h-full">
          <div>
            <h2 class="text-2xl font-bold text-[var(--text-main)] mb-2">¡Hola, ${escapeHtml(user.name.split(' ')[0])}!</h2>
          </div>
        </div>
      </div>
    </div>
    `;

    content.innerHTML = html;

    const ctx = document.getElementById('coder-participation-chart');
    if (ctx) {
      const rootStyle = getComputedStyle(document.documentElement);
      const brandColor = rootStyle.getPropertyValue('--brand-bg').trim() || '#4f46e5';
      const draftColor = rootStyle.getPropertyValue('--accent-amber').trim() || '#f59e0b';

      const chartCompleted = completed;
      const chartPending = pending;
      const total = chartCompleted + chartPending;

      import('chart.js/auto').then(({ default: Chart }) => {
        new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Completadas', 'Pendientes'],
            datasets: [{
              data: [chartCompleted, chartPending],
              backgroundColor: [brandColor, draftColor],
              borderWidth: 0,
              hoverOffset: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                padding: 12,
                cornerRadius: 12,
                callbacks: {
                  label: function (context) {
                    const label = context.label || '';
                    const value = context.parsed || 0;
                    return ` ${label}: ${value}`;
                  }
                }
              }
            }
          },
          plugins: [{
            id: 'centerTextCoder',
            beforeDraw: function (chart) {
              const width = chart.width,
                height = chart.height,
                ctx = chart.ctx;

              ctx.restore();
              const fontSize = (height / 110).toFixed(2);
              ctx.font = "bold " + fontSize + "em sans-serif";
              ctx.textBaseline = "middle";
              ctx.fillStyle = rootStyle.getPropertyValue('--text-main').trim() || "#000";

              const text = completed.toString(),
                textX = Math.round((width - ctx.measureText(text).width) / 2),
                textY = height / 2;

              ctx.fillText(text, textX, textY);

              ctx.font = "normal " + (fontSize * 0.4).toFixed(2) + "em sans-serif";
              ctx.fillStyle = rootStyle.getPropertyValue('--text-muted').trim() || "#666";
              const label = "Enviadas";
              const labelX = Math.round((width - ctx.measureText(label).width) / 2);
              ctx.fillText(label, labelX, textY + 25);

              ctx.save();
            }
          }]
        });
      }).catch(err => console.error("Error loading Chart.js", err));
    }
  }
  
  // Trigger reflow to start fade-in animation for all roles
  const dashboardCards = document.getElementById('dashboard-cards');
  if (dashboardCards) {
    void dashboardCards.offsetWidth;
    dashboardCards.classList.remove('opacity-0');
    dashboardCards.classList.add('opacity-100');
  }

  // Run counter animations for all roles
  document.querySelectorAll('.animate-number').forEach(el => {
    const text = el.innerText;
    const target = parseFloat(el.getAttribute('data-value'));
    if (isNaN(target) || target === 0) return; // Skip non-numeric or 0 values

    const duration = 1200;
    const startTime = performance.now();
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
      const current = (easeProgress * target);
      
      el.innerText = Number.isInteger(target) ? Math.round(current) : current.toFixed(1);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        el.innerText = text;
      }
    };
    requestAnimationFrame(animate);
  });
};
