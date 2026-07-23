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
import { dayjs } from "../utils/date";
import { setupPagination } from "../components/pagination";

const icons = {
  check: `<svg aria-hidden="true" focusable="false" class="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  star: `<svg aria-hidden="true" focusable="false" class="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>`,
  clock: `<svg aria-hidden="true" focusable="false" class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  users: `<svg aria-hidden="true" focusable="false" class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`,
  chartPie: `<svg aria-hidden="true" focusable="false" class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>`
};

const isPendingParticipation = (entry) =>
  !evaluationService.isAnonymousParticipation(entry) && entry.status !== "submitted";

const runDashboardAnimations = () => {
  const dashboardCards = document.getElementById('dashboard-cards');
  if (dashboardCards) {
    void dashboardCards.offsetWidth;
    dashboardCards.classList.remove('opacity-0');
    dashboardCards.classList.add('opacity-100');
  }

  document.querySelectorAll('.animate-number').forEach(el => {
    const text = el.innerText;
    const target = parseFloat(el.getAttribute('data-value'));
    if (isNaN(target) || target === 0) return;

    const duration = 1200;
    const startTime = performance.now();
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
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
            ${dropdownComponent('dashboard-period-filter', [
    // "Todos" (value '0') igual que en Métricas: el backend agrega sobre todos
    // los periodos cuando period_id == 0 (ver metrics_repository). El resto del
    // flujo ya lo soporta (getSummary('0') y la lógica de alertas tratan el 0).
    { value: '0', label: 'Todos' },
    ...currentPeriods.map(p => ({
      value: String(p.id),
      label: p.name + (p.is_active ? ' (Activo)' : '')
    }))
  ], selectedPeriodId)}
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
      ${role !== 'admin' ? `
        <span class="text-sm font-bold text-[var(--text-muted)] bg-[var(--bg-base)] border border-[var(--border-main)] px-4 py-2 rounded-full whitespace-nowrap">
          Hoy, ${dayjs().format('D [de] MMMM')}
        </span>
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
        Chart.defaults.font.family = rootStyle.getPropertyValue('--font-body').trim() || "'Open Sans', sans-serif";
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
        
        // Disable dropdowns to show loading state
        const periodBtn = document.getElementById("dashboard-period-filter-btn");
        if (periodBtn) {
            periodBtn.disabled = true;
            periodBtn.innerHTML = '<span class="flex items-center gap-2"><svg class="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Cargando...</span>';
        }
        
        const dashboardCards = document.getElementById("dashboard-cards");
        if (dashboardCards) {
          dashboardCards.innerHTML = `
            <div class="col-span-full">
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
            </div>
          `;
        }
        
        await renderDashboardContent(content, user, name, role);
      });
    }
  } else {
    let tlHistory = [];
    let tlReceivedEvals = [];

    // Leader, Tutor and Coder combined view
    if (role === "team_leader" || role === "tutor") {
      const summaryPromise = selectedPeriodId ? metricsService.getSummary(selectedPeriodId) : Promise.resolve({ evaluatees: [] });
      const [summary, history, receivedEvals] = await Promise.all([
        summaryPromise,
        metricsService.getHistory(user.id).catch(() => []),
        evaluationService.getByEvaluatee(user.id).catch(() => [])
      ]);
      
      tlHistory = history;
      tlReceivedEvals = receivedEvals;

      const myStats = summary.evaluatees?.find(e => String(e.id) === String(user.id)) || { n_evals: 0, average_score: 0, status: "Sin datos" };

      const validEvaluatees = summary.evaluatees?.filter(e => e.average_score !== null) || [];
      
      let motivationalCard = '';
      let comparisonHtml = "";

      if (role === "team_leader" && validEvaluatees.length > 0) {
        // Ranking Motivacional
        const tlList = validEvaluatees.filter(e => e.role === "team_leader").sort((a, b) => b.average_score - a.average_score);
        const myIndex = tlList.findIndex(e => String(e.id) === String(user.id));
        
        if (myIndex !== -1) {
          const myRank = myIndex + 1;
          const total = tlList.length;
          const percentile = Math.round(((total - myRank) / total) * 100);
          let msg = "";
          let medalIcon = "";
          
          if (myRank === 1) {
            msg = `¡Felicidades! Eres el Team Leader #1 de la plataforma en este periodo.`;
            medalIcon = '<span title="1er Puesto - Oro" class="cursor-help inline-block"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto"><title>1er Puesto - Oro</title><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 14.7v4.6"/></svg></span>';
          } else if (myRank === 2) {
            msg = `¡Excelente trabajo! Eres el Team Leader #2 de la plataforma en este periodo.`;
            medalIcon = '<span title="2do Puesto - Plata" class="cursor-help inline-block"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B8B8B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto"><title>2do Puesto - Plata</title><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/> <path d="M11 12 5.12 2.2"/> <path d="m13 12 5.88-9.8"/> <path d="M8 7h8"/> <circle cx="12" cy="17" r="5"/> <path d="M10.4 15.6c.4-.6 1-.9 1.7-.9.8 0 1.4.4 1.4 1 0 .6-.3.9-1.1 1.5l-1.8 1.3H14"/> </svg></span>';
          } else if (myRank === 3) {
            msg = `¡Gran esfuerzo! Eres el Team Leader #3 de la plataforma en este periodo.`;
            medalIcon = '<span title="3er Puesto - Bronce" class="cursor-help inline-block"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B87333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto"><title>3er Puesto - Bronce</title><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/> <path d="M11 12 5.12 2.2"/> <path d="m13 12 5.88-9.8"/> <path d="M8 7h8"/> <circle cx="12" cy="17" r="5"/> <path d="M10.5 15h2c.6 0 1 .3 1 .8s-.4.8-1 .8"/> <path d="M12.5 16.6c.8 0 1.2.4 1.2 1s-.5 1-1.4 1c-.6 0-1.1-.2-1.5-.6"/> </svg></span>';
          } else if (percentile >= 50) {
            msg = `Estás superando al ${percentile}% de los líderes. ¡Continúa así!`;
          } else {
            msg = `¡Sigue esforzándote para subir en el ranking!`;
          }

          motivationalCard = `
            <div class="col-span-1 md:col-span-2 lg:col-span-3 mb-2">
              <div class="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-main)] shadow-sm px-6 py-4 flex items-center gap-4">
                ${medalIcon ? `<div class="flex-shrink-0 p-2 bg-[var(--bg-base)] rounded-xl border border-[var(--border-main)]">${medalIcon}</div>` : ''}
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-lg font-black text-[var(--text-main)]">Puesto #${myRank}</span>
                  </div>
                  <p class="text-[var(--text-muted)] text-sm">${msg}</p>
                </div>
              </div>
            </div>
          `;
        }
      }

      // Comparativa de periodo actual con anterior
      if (selectedPeriodId) {
        const sortedPeriods = [...currentPeriods].sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at));
        const currIdx = sortedPeriods.findIndex(p => String(p.id) === String(selectedPeriodId));
        if (currIdx !== -1 && currIdx + 1 < sortedPeriods.length) {
          const prevPeriod = sortedPeriods[currIdx + 1];
          try {
            const prevSummary = await metricsService.getSummary(prevPeriod.id);
            const prevMyStats = prevSummary.evaluatees?.find(e => String(e.id) === String(user.id));
            
            if (prevMyStats) {
              const prevScore = prevMyStats.average_score ?? 0;
              const currScore = myStats.average_score ?? 0;
              let compMsg = "Te mantuviste igual respecto al periodo anterior.";
              let compIconColor = "text-[var(--text-muted)]";
              let compIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14" /></svg>`;
              
              if (currScore > prevScore) {
                compMsg = `¡Mejoraste tu calificación en ${Math.round(currScore - prevScore)} puntos!`;
                compIconColor = "text-green-500";
                compIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>`;
              } else if (currScore < prevScore) {
                compMsg = `Tu calificación bajó ${Math.round(prevScore - currScore)} puntos. ¡No te desanimes!`;
                compIconColor = "text-red-500";
                compIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>`;
              }

              const valueHtml = `${currScore} <span class="text-sm text-[var(--text-muted)] font-bold">Actual</span> <span class="text-2xl text-[var(--brand-bg)] mx-1">VS</span> ${prevScore} <span class="text-sm text-[var(--text-muted)] font-bold">Anterior</span>`;
              
              comparisonHtml = Card({
                className: "p-6 shadow-sm border border-[var(--border-main)] flex flex-col h-full",
                children: `
                  <div class="flex items-center gap-3 mb-4">
                    <div class="p-2 rounded-xl bg-[var(--bg-base)] text-[var(--text-main)] border border-[var(--border-main)] shrink-0">
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                    </div>
                    <div>
                      <h3 class="text-xs font-bold text-[var(--text-muted)] tracking-wider uppercase">Comparativa ICP</h3>
                    </div>
                  </div>
                  <div class="mb-2">
                    <span class="text-2xl font-black text-[var(--text-main)]">${valueHtml}</span>
                  </div>
                  <p class="text-sm ${compIconColor} font-medium mb-4">${compMsg}</p>
                  <div class="flex-1 min-h-[100px] w-full relative">
                    <canvas id="tl-comparison-chart" data-curr="${currScore}" data-prev="${prevScore}"></canvas>
                  </div>
                `
              });
            }
          } catch (e) {
            console.warn("Could not fetch previous period metrics", e);
          }
        }
      }
      
      if (!comparisonHtml) {
        comparisonHtml = StatsCard({
          title: "Comparativa ICP",
          value: "N/A",
          icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
          description: "No hay periodo anterior para comparar"
        });
      }

      html += motivationalCard;
      html += `
        ${StatsCard({ title: "Evaluaciones Recibidas", value: `<span class="animate-number" data-value="${myStats.n_evals}">${myStats.n_evals}</span>`, icon: icons.users, description: "En el periodo actual", extraValueHtml: `<div class="text-sm text-[var(--text-muted)] font-medium mt-1">Objetivo: 20 evaluaciones</div>` })}
        ${StatsCard({ title: "Puntaje Promedio ICP", value: `<span class="animate-number" data-value="${myStats.average_score ?? 0}">${myStats.average_score ?? 0}</span><span class="text-2xl text-[var(--text-muted)] ml-1">/100</span>`, icon: icons.star, description: "Estado: " + myStats.status })}
        ${comparisonHtml}
      `;

      if (role === "team_leader") {
        html += `
          <div class="col-span-1 md:col-span-2 lg:col-span-2 mt-2">
            ${Card({
              className: "p-6 shadow-sm border border-[var(--border-main)] h-full flex flex-col",
              children: `
                <h3 class="text-lg font-bold text-[var(--text-main)] mb-4">Actividad Reciente y Evaluaciones</h3>
                <div class="flex-1 w-full" id="tl-recent-activity">
                  <div class="h-48 skeleton-shimmer rounded-xl"></div>
                </div>
              `
            })}
          </div>
          <div class="col-span-1 lg:col-span-1 mt-2">
            ${Card({
              className: "p-6 shadow-sm border border-[var(--border-main)] h-full flex flex-col",
              children: `
                <h3 class="text-lg font-bold text-[var(--text-main)] mb-4">Tendencia Mensual del Puntaje ICP</h3>
                <div class="flex-1 w-full min-h-[250px] relative">
                  <canvas id="tl-trend-chart"></canvas>
                </div>
              `
            })}
          </div>
        `;
      }
    }

    const initTLCharts = () => {
      // Comparativa ICP Bar Chart
      const compCtx = document.getElementById('tl-comparison-chart');
      if (compCtx) {
        const curr = parseFloat(compCtx.dataset.curr);
        const prev = parseFloat(compCtx.dataset.prev);
        import('chart.js/auto').then(({ default: Chart }) => {
          new Chart(compCtx, {
            type: 'bar',
            data: {
              labels: ['Actual', 'Anterior'],
              datasets: [{
                data: [curr, prev],
                backgroundColor: [curr >= prev ? '#10b981' : '#ef4444', '#9ca3af'],
                borderRadius: 4,
                barPercentage: 0.6
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: { enabled: true } },
              scales: { 
                y: { beginAtZero: true, max: 100, display: false },
                x: { grid: { display: false } }
              }
            }
          });
        }).catch(err => console.error(err));
      }

      // Tendencia Mensual Line Chart
      const trendCtx = document.getElementById('tl-trend-chart');
      if (trendCtx && tlHistory.length > 0) {
        import('chart.js/auto').then(({ default: Chart }) => {
          const rootStyle = getComputedStyle(document.documentElement);
          const brandColor = rootStyle.getPropertyValue('--brand-bg').trim() || '#4f46e5';
          Chart.defaults.font.family = rootStyle.getPropertyValue('--font-body').trim() || "'Open Sans', sans-serif";
          
          const labels = tlHistory.map(h => dayjs(h.starts_at).format('MMM'));
          const data = tlHistory.map(h => h.average_score);
          
          new Chart(trendCtx, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [{
                data: data,
                borderColor: brandColor,
                backgroundColor: brandColor + '20', // 20% opacity
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: brandColor
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { 
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: function(context) { return 'ICP: ' + context.parsed.y; }
                  }
                }
              },
              scales: { 
                y: { beginAtZero: true, max: 100, ticks: { stepSize: 20 } },
                x: { grid: { display: false } }
              }
            }
          });
        }).catch(err => console.error(err));
      } else if (trendCtx) {
        trendCtx.parentElement.innerHTML = '<div class="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">No hay datos suficientes para la tendencia</div>';
      }

      // Tabla de Actividad Reciente Paginada
      const activityContainer = document.getElementById('tl-recent-activity');
      if (activityContainer) {
        // Obtenemos todos los items de respuestas de texto y los aplanamos
        const allComments = [];
        tlReceivedEvals.forEach(ev => {
           ev.answers?.forEach(ans => {
             if (ans.comment && ans.comment.toLowerCase() !== "sí" && ans.comment.toLowerCase() !== "no") {
                allComments.push({
                   date: ev.created_at,
                   score: ans.score,
                   comment: ans.comment,
                   status: ev.status,
                   id: ev.id
                });
             }
           });
        });

        // Ordenar por fecha descendente
        allComments.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (allComments.length === 0) {
           activityContainer.innerHTML = '<div class="p-4 text-center text-[var(--text-muted)] italic">No hay comentarios recientes.</div>';
        } else {
           activityContainer.innerHTML = '';
           setupPagination({
             data: allComments,
             itemsPerPage: 5,
             container: activityContainer,
             renderItem: (item) => {
               const shortComment = item.comment.length > 50 ? item.comment.substring(0, 50) + '...' : item.comment;
               const badgeClass = item.status === 'submitted' ? 'bg-[var(--success-bg)] text-[var(--success-text)]' : 'bg-[var(--warning-bg)] text-[var(--warning-text)]';
               const badgeText = item.status === 'submitted' ? 'Enviado' : 'Pendiente';
               
               return `
                 <div class="px-6 py-4 flex items-center justify-between border-b border-[var(--border-main)] last:border-0 hover:bg-[var(--bg-base)] transition group">
                   <div class="flex-1 grid grid-cols-12 gap-4 items-center">
                     <div class="col-span-2 text-sm text-[var(--text-muted)] font-medium">${dayjs(item.date).format('D MMM')}</div>
                     <div class="col-span-2 text-sm font-bold text-[var(--text-main)]">Anónimo</div>
                     <div class="col-span-2 text-sm font-bold text-[var(--brand-bg)]">${item.score || '-'} ICP</div>
                     <div class="col-span-4 text-sm text-[var(--text-muted)] truncate">${escapeHtml(shortComment)}</div>
                     <div class="col-span-2 text-right">
                       <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${badgeClass}">
                         ${badgeText}
                       </span>
                     </div>
                   </div>
                   <div class="ml-4 opacity-0 group-hover:opacity-100 transition">
                     <a href="/my-results" data-navigo class="p-2 inline-flex rounded-lg bg-[var(--bg-panel)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--brand-bg)] shadow-sm">
                       <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                     </a>
                   </div>
                 </div>
               `;
             }
           });
        }
      }
    };

    if (role === "team_leader") {
      html += `</div>`;
      content.innerHTML = html;
      initTLCharts();
      runDashboardAnimations();
      return;
    }

    if (role === "tutor") {
      html += `
        <div class="col-span-1 md:col-span-2 lg:col-span-3 mt-2 mb-2 flex items-center gap-4">
          <div class="h-px bg-[var(--border-main)] flex-1"></div>
          <span class="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Tu progreso como coder</span>
          <div class="h-px bg-[var(--border-main)] flex-1"></div>
        </div>
      `;
    }

    // Tutor or Coder View
    const [myEvals, allEvaluables] = await Promise.all([
      evaluationService.getByEvaluator(user.id, 100),
      evaluablesService.get(user.id)
    ]);
    
    // El filtro por clan NO se hace aqui: lo aplica el servidor, que es la
    // autoridad (evaluation_service._validate_permissions). Filtrarlo en el
    // cliente por `clan_id` estaba EXCLUYENDO a todos los Team Leaders --
    // un TL tiene `users.clan_id = NULL` y su relacion con clanes vive en la
    // tabla `team_leader_clans` (N:M, un TL puede llevar varios clanes).
    // Aqui solo se descarta al propio usuario, que no es una regla de clan.
    const evaluables = allEvaluables ? allEvaluables.filter(u => u.id !== user.id) : [];

    const completedEvals = myEvals.filter(e => !isPendingParticipation(e));
    const completed = completedEvals.length;
    const totalEvaluables = evaluables.length;
    const pending = Math.max(0, totalEvaluables - completed);
    
    // Averiguar si hay formularios disponibles y para que roles
    // Para no hacer 2 peticiones mas, usamos evaluables que ya estan filtrados
    const evaluatedIds = completedEvals.map(e => String(e.evaluatee_id));
    const pendingUsers = evaluables.filter(u => !evaluatedIds.includes(String(u.id)));
    
    let pendingRoles = new Set();
    pendingUsers.forEach(u => {
        if (u.roles && u.roles.includes("team_leader")) pendingRoles.add("Team Leader");
        if (u.roles && u.roles.includes("tutor")) pendingRoles.add("Tutor");
    });

    // Nombres para "Actividad reciente": `evaluables` ya trae a todo evaluable
    // del clan (evaluado o no), asi que sirve como diccionario id -> nombre sin
    // pedir /users aparte.
    const evaluableNameById = new Map(evaluables.map(u => [String(u.id), u.name]));

    const recentActivity = completedEvals
      .map(ev => {
        const isAnonymous = evaluationService.isAnonymousParticipation(ev);
        // En una participacion anonima no hay `submitted_at`; `created_at`
        // (cuando se registro la participacion) si existe y es la fecha honesta.
        const dateSource = isAnonymous ? ev.created_at : (ev.submitted_at || ev.created_at);
        return { ev, isAnonymous, dateSource };
      })
      .filter(({ dateSource }) => !!dateSource)
      .sort((a, b) => new Date(b.dateSource) - new Date(a.dateSource))
      .slice(0, 4);

    html += `
      ${StatsCard({ title: "Completadas", value: `<span class="animate-number" data-value="${completed}">${completed}</span>`, icon: icons.check, description: "Evaluaciones enviadas" })}
      ${StatsCard({ title: "Personas por Evaluar", value: `<span class="animate-number" data-value="${pending}">${pending}</span>`, icon: icons.clock, description: "Pendientes de evaluar" })}

      ${Card({
      className: "h-full flex flex-col p-6 lg:row-span-2 shadow-sm border border-[var(--border-main)]",
      children: `
          <h3 class="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider text-left w-full mb-4">Progreso Actual</h3>
          <div class="flex-1 flex flex-col items-center justify-center w-full min-h-[160px]">
            ${completed + pending === 0
          ? `<div class="text-center text-[var(--text-muted)] italic my-auto">Aún no hay datos para graficar.</div>`
          : `<div class="relative w-40 h-40 my-2"><canvas id="coder-participation-chart"></canvas></div>`
        }
          </div>
          <div class="w-full space-y-3 mt-2">
            <div class="flex items-center justify-between p-3.5 bg-[var(--bg-base)] rounded-xl border border-[var(--border-main)]">
              <div class="flex items-center gap-2.5">
                <span class="w-2.5 h-2.5 rounded-full bg-[var(--border-main)]"></span>
                <span class="text-sm font-semibold text-[var(--text-main)]">Total evaluaciones</span>
              </div>
              <span class="text-sm font-bold text-[var(--text-main)]">${totalEvaluables}</span>
            </div>
            <div class="flex items-center justify-between p-3.5 bg-[var(--bg-base)] rounded-xl border border-[var(--border-main)]">
              <div class="flex items-center gap-2.5">
                <span class="w-2.5 h-2.5 rounded-full bg-[var(--brand-bg)]"></span>
                <span class="text-sm font-semibold text-[var(--text-main)]">Completadas</span>
              </div>
              <span class="text-sm font-bold text-[var(--text-main)]">${completed}</span>
            </div>
          </div>
        `
    })}

      <!-- Banner de recordatorio, independiente (ya no envuelto en la tarjeta
           de saludo). Cuando no hay pendientes se muestra un estado "al dia"
           para que la celda de 2 columnas no quede vacia. -->
      <div class="col-span-1 md:col-span-2 lg:col-span-2 mt-4 lg:mt-0">
        ${pendingRoles.size > 0 ? `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6 rounded-3xl bg-[var(--brand-bg)] text-[var(--brand-text)] px-6 py-6 sm:px-8 sm:py-7 shadow-md h-full">
            <div class="flex items-start gap-4">
              <div class="shrink-0 rounded-full bg-white/15 p-3">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <div>
                <span class="inline-block text-[10px] font-bold uppercase tracking-widest bg-white/15 px-2.5 py-1 rounded-full mb-2">Recordatorio prioritario</span>
                <h3 class="text-xl sm:text-2xl font-extrabold leading-tight">¡Es hora de evaluar!</h3>
                <p class="text-sm mt-2 opacity-90 max-w-md">Aún te falta evaluar a <strong>${escapeHtml(Array.from(pendingRoles).join(" y "))}</strong>. Tu feedback es clave para el crecimiento del equipo.</p>
              </div>
            </div>
            <a href="/evaluables" data-navigo class="shrink-0 whitespace-nowrap inline-flex items-center justify-center rounded-xl bg-white/80 hover:bg-white/25 px-6 py-3 text-sm font-bold text-[var(--text-main)] transition shadow-sm">
              Ir a evaluar
            </a>
          </div>
        ` : `
          <div class="flex flex-col items-center justify-center text-center gap-3 rounded-3xl bg-[var(--bg-panel)] border border-[var(--border-main)] px-6 py-10 shadow-sm h-full">
            <div class="rounded-full bg-[var(--success-bg)] text-[var(--success-text)] p-3">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h3 class="text-lg font-bold text-[var(--text-main)]">¡Estás al día!</h3>
            <p class="text-sm text-[var(--text-muted)]">Has completado todas tus evaluaciones disponibles.</p>
          </div>
        `}
      </div>
    </div>

    <div class="mt-6">
      <div class="flex items-center justify-between mb-4 gap-4">
        <h2 class="text-xl font-bold text-[var(--text-main)]">Actividad reciente</h2>
        <a href="/evaluations" data-navigo class="text-sm font-bold text-[var(--brand-bg)] hover:text-[var(--brand-hover)] transition whitespace-nowrap">
          Ver historial completo
        </a>
      </div>
      ${Card({
      className: "overflow-hidden",
      children: `
          <div class="divide-y divide-[var(--border-main)]">
            ${recentActivity.length === 0 ? `
              <div class="px-6 py-8 text-center text-sm text-[var(--text-muted)]">
                Aún no has enviado evaluaciones. Cuando envíes una, aparecerá aquí.
              </div>
            ` : recentActivity.map(({ ev, isAnonymous, dateSource }) => {
        const evaluateeName = isAnonymous ? "Envío anónimo" : (evaluableNameById.get(String(ev.evaluatee_id)) || `Usuario #${ev.evaluatee_id}`);
        const badge = isAnonymous
          ? `<span class="px-3 py-1 rounded-full text-[11px] font-bold bg-[var(--info-bg)] text-[var(--info-text)] uppercase tracking-wide whitespace-nowrap">Anónima</span>`
          : `<span class="px-3 py-1 rounded-full text-[11px] font-bold bg-[var(--success-bg)] text-[var(--success-text)] uppercase tracking-wide whitespace-nowrap">Enviada</span>`;
        return `
                <div class="px-6 py-4 flex items-center gap-4">
                  <div class="w-10 h-10 rounded-lg bg-[var(--bg-base)] border border-[var(--border-main)] flex items-center justify-center text-[var(--brand-bg)] shrink-0">
                    ${icons.check}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-bold text-[var(--text-main)] truncate">${escapeHtml(evaluateeName)}</p>
                    <p class="text-xs text-[var(--text-muted)] font-medium mt-0.5">Enviada el ${escapeHtml(dayjs(dateSource).format('D [de] MMMM [de] YYYY'))}</p>
                  </div>
                  ${badge}
                </div>
              `;
      }).join("")}
          </div>
        `
    })}
    </div>
    `;

    content.innerHTML = html;

    if (role === "tutor") {
      initTLCharts();
    }

    const ctx = document.getElementById('coder-participation-chart');
    if (ctx) {
      const rootStyle = getComputedStyle(document.documentElement);
      const brandColor = rootStyle.getPropertyValue('--brand-bg').trim() || '#4f46e5';
      // Color neutro para el segmento "sin completar" -- el mismo criterio que
      // el donut del admin (ver mas arriba en este archivo). Antes usaba
      // `--accent-amber`, un token que no existe en global.css: getPropertyValue
      // devolvia "" y caia siempre al hardcode '#f59e0b' (ambar), pintando el
      // anillo entero de "alerta" en vez de "pendiente neutral" cuando
      // completadas = 0.
      const pendingColor = rootStyle.getPropertyValue('--border-main').trim() || '#e5e7eb';

      const chartCompleted = completed;
      const chartPending = pending;
      const total = chartCompleted + chartPending;

      import('chart.js/auto').then(({ default: Chart }) => {
        Chart.defaults.font.family = rootStyle.getPropertyValue('--font-body').trim() || "'Open Sans', sans-serif";
        new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Completadas', 'Pendientes'],
            datasets: [{
              data: [chartCompleted, chartPending],
              backgroundColor: [brandColor, pendingColor],
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
              const fontFamily = rootStyle.getPropertyValue('--font-body').trim() || "'Open Sans', sans-serif";
              ctx.font = `bold ${fontSize}em ${fontFamily}`;
              ctx.textBaseline = "middle";
              ctx.fillStyle = rootStyle.getPropertyValue('--text-main').trim() || "#000";

              const text = completed.toString(),
                textX = Math.round((width - ctx.measureText(text).width) / 2),
                textY = height / 2;

              ctx.fillText(text, textX, textY);

              ctx.font = `normal ${(fontSize * 0.4).toFixed(2)}em ${fontFamily}`;
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
  runDashboardAnimations();
};
