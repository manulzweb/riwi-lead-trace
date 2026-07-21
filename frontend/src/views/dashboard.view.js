import { authService } from "../services/auth.service";
import { navBarComponent, setupNavBar } from "../components/navbar";
import { escapeHtml } from "../utils/validators";
import { Card, StatsCard } from "../components/cards_ui";
import { metricsService } from "../services/metrics.service";
import { evaluationService } from "../services/evaluation.service";
import { periodService } from "../services/periods.service";
import { dropdownComponent, setupDropdown } from "../components/dropdown";
import { Chart } from 'chart.js/auto';

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
        <div class="flex items-center justify-center h-64">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-[var(--brand-bg)] border-t-transparent"></div>
        </div>
      </div>
    </main>
  `;
};

let currentPeriods = [];
let selectedPeriodId = null;
// Evaluables validos del periodo ya cargado, para que el filtro por clan no
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
      currentPeriods = await periodService.get();
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
        <div class="flex flex-col sm:flex-row gap-4 z-20 relative w-full sm:w-auto">
          <div class="w-full sm:w-48">
            <label class="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider" for="dashboard-period-filter-btn">Periodo</label>
            ${dropdownComponent('dashboard-period-filter', currentPeriods.map(p => ({
              value: String(p.id), 
              label: p.name + (p.is_active ? ' (Activo)' : '')
            })), selectedPeriodId)}
          </div>
          <div class="w-full sm:w-48">
            <label class="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider" for="dashboard-cohort-filter-btn">Cohorte</label>
            ${dropdownComponent('dashboard-cohort-filter', [{value: 'all', label: 'Todas'}], 'all')}
          </div>
        </div>
      ` : ''}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="dashboard-cards">
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
        value: alertIconColor === "text-green-500" ? "Todo OK" : "Atención", 
        icon: `<svg aria-hidden="true" focusable="false" class="w-6 h-6 ${alertIconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`, 
        description: alertMsg 
      })}
      ${StatsCard({ title: "ICP Global Promedio", value: kpis.average_score + "/100", icon: icons.star, description: "Desempeño de la plataforma" })}
      
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
    `;

    // Extract unique clans
    const validEvaluatees = summary.evaluatees?.filter(e => e.average_score !== null) || [];
    const clans = [...new Set(validEvaluatees.map(e => e.clan_name).filter(Boolean))].sort();
    
    // Se guarda para que el filtro por clan no vuelva a pedir la API.
    dashboardEvaluatees = validEvaluatees;
    
    const renderTable = (title, data) => `
      <div class="bg-[var(--bg-panel)] rounded-3xl border border-[var(--border-main)] shadow-sm overflow-hidden flex-1">
        <div class="p-4 border-b border-[var(--border-main)] bg-[var(--bg-base)]">
          <h3 class="text-lg font-bold text-[var(--text-main)]">${title}</h3>
        </div>
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-[var(--border-main)] text-[var(--text-muted)] text-sm bg-[var(--bg-panel)]">
              <th class="px-4 py-3 font-semibold w-16 text-center">#</th>
              <th class="px-4 py-3 font-semibold">Nombre</th>
              <th class="px-4 py-3 font-semibold text-right">ICP</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--border-main)]">
            ${data.length > 0 ? data.map((e, index) => {
              let medalIcon = "";
              let rowClass = "hover:bg-[var(--bg-base)] transition-colors";
              
              if (index === 0) {
                medalIcon = '<svg aria-hidden="true" focusable="false" class="w-6 h-6 mx-auto text-yellow-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7.4-6.3-4.8-6.3 4.8 2.3-7.4-6-4.6h7.6z"/></svg>';
                rowClass = "bg-amber-500/10 hover:bg-amber-500/20 transition-colors";
              } else if (index === 1) {
                medalIcon = '<svg aria-hidden="true" focusable="false" class="w-6 h-6 mx-auto text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7.4-6.3-4.8-6.3 4.8 2.3-7.4-6-4.6h7.6z"/></svg>';
                rowClass = "bg-gray-500/10 hover:bg-gray-500/20 transition-colors";
              } else if (index === 2) {
                medalIcon = '<svg aria-hidden="true" focusable="false" class="w-6 h-6 mx-auto text-orange-700" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7.4-6.3-4.8-6.3 4.8 2.3-7.4-6-4.6h7.6z"/></svg>';
                rowClass = "bg-orange-500/10 hover:bg-orange-500/20 transition-colors";
              } else {
                medalIcon = `<span class="font-bold text-[var(--text-muted)]">${index + 1}</span>`;
              }
              
              return `
                <tr class="${rowClass}">
                  <td class="px-4 py-3 text-center">${medalIcon}</td>
                  <td class="px-4 py-3 font-bold text-[var(--text-main)] truncate">
                    ${escapeHtml(e.name)}
                    <span class="block text-xs font-normal text-[var(--text-muted)]">${escapeHtml(e.clan_name || 'Sin clan')}</span>
                  </td>
                  <td class="px-4 py-3 text-right font-black text-[var(--text-main)]">${e.average_score}</td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="3" class="px-4 py-6 text-center text-[var(--text-muted)]">No hay suficientes datos.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    `;

    const topTutors = validEvaluatees.filter(e => e.role === "tutor").sort((a, b) => b.average_score - a.average_score).slice(0, 3);
    const topLeaders = validEvaluatees.filter(e => e.role === "team_leader").sort((a, b) => b.average_score - a.average_score).slice(0, 3);

    html += `
      <div class="col-span-1 md:col-span-2 lg:col-span-3 mt-4">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h2 class="text-xl font-bold text-[var(--text-main)]">Top Rendimiento (ICP)</h2>
          <div class="w-full sm:w-64 z-10 relative">
            <label class="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider" for="dashboard-clan-filter-btn">Filtrar por Clan</label>
            ${dropdownComponent('dashboard-clan-filter', [{value: 'all', label: 'Todos los clanes'}, ...clans.map(c => ({value: c, label: c}))], 'all')}
          </div>
        </div>
        <div class="flex flex-col md:flex-row gap-6" id="dashboard-top-tables">
          ${renderTable("Top Team Leaders", topLeaders)}
          ${renderTable("Top Tutores", topTutors)}
        </div>
      </div>
    `;
  } else if (role === "team_leader" || role === "tutor") {
    // Leader / Tutor View
    const summary = selectedPeriodId ? await metricsService.getSummary(selectedPeriodId) : { evaluatees: [] };
    const myStats = summary.evaluatees?.find(e => e.id === user.id) || { n_evals: 0, average_score: 0, status: "Sin datos" };
    
    html += `
      ${StatsCard({ title: "Evaluaciones Recibidas", value: myStats.n_evals, icon: icons.users, description: "En el periodo actual" })}
      ${StatsCard({ title: "Puntaje Promedio ICP", value: (myStats.average_score ?? 0) + "/100", icon: icons.star, description: "Estado: " + myStats.status })}
    `;
    
    if (role === "tutor") {
      const myEvals = await evaluationService.getByEvaluator(user.id, 100);
      const pending = myEvals.filter(isPendingParticipation).length;
      html += StatsCard({ title: "Evaluaciones por Hacer", value: pending, icon: icons.clock, description: "Pendientes de enviar" });
    }
  } else {
    // Coder View
    const myEvals = await evaluationService.getByEvaluator(user.id, 100);
    const completed = myEvals.filter(e => !isPendingParticipation(e)).length;
    const pending = myEvals.filter(isPendingParticipation).length;

    html += `
      ${StatsCard({ title: "Evaluaciones Completadas", value: completed, icon: icons.check, description: "Historial total" })}
      ${StatsCard({ title: "Evaluaciones Pendientes", value: pending, icon: icons.clock, description: "En borrador o por hacer" })}
    `;
  }
  
  html += `</div>`;
  content.innerHTML = html;
  
  if (role === "admin") {
    const ctx = document.getElementById('participation-chart');
    if (ctx && currentKpis) {
      const rootStyle = getComputedStyle(document.documentElement);
      const brandColor = rootStyle.getPropertyValue('--brand-bg').trim() || '#4f46e5';
      const emptyColor = rootStyle.getPropertyValue('--border-main').trim() || '#e5e7eb';
      
      const total = currentKpis.total_evaluations;
      const rate = currentKpis.participation_rate;
      const possible = rate > 0 ? Math.round((total / rate) * 100) : 0;
      const pending = possible - total;
      
      new Chart(ctx, {
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
          cutout: '80%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  let label = context.label || '';
                  if (label) {
                    label += ': ';
                  }
                  if (context.parsed !== null) {
                    label += context.parsed + ' ';
                    const p = context.dataIndex === 0 ? rate : (100 - rate);
                    label += '(' + p + '%)';
                  }
                  return label;
                }
              }
            }
          },
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            animateScale: true,
            animateRotate: true
          }
        }
      });
    }

    setupDropdown('dashboard-clan-filter', (val) => {
      const evaluatees = dashboardEvaluatees;
      const filtered = val === 'all' ? evaluatees : evaluatees.filter(e => e.clan_name === val);
      
      const topTutors = filtered.filter(e => e.role === "tutor").sort((a, b) => b.average_score - a.average_score).slice(0, 3);
      const topLeaders = filtered.filter(e => e.role === "team_leader").sort((a, b) => b.average_score - a.average_score).slice(0, 3);
      
      // We must extract renderTable again locally or just re-render tables
      // For simplicity, we just rebuild the HTML for tables here.
      const buildTable = (title, data) => `
        <div class="bg-[var(--bg-panel)] rounded-3xl border border-[var(--border-main)] shadow-sm overflow-hidden flex-1">
          <div class="p-4 border-b border-[var(--border-main)] bg-[var(--bg-base)]">
            <h3 class="text-lg font-bold text-[var(--text-main)]">${title}</h3>
          </div>
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-[var(--border-main)] text-[var(--text-muted)] text-sm bg-[var(--bg-panel)]">
                <th class="px-4 py-3 font-semibold w-16 text-center">#</th>
                <th class="px-4 py-3 font-semibold">Nombre</th>
                <th class="px-4 py-3 font-semibold text-right">ICP</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--border-main)]">
              ${data.length > 0 ? data.map((e, index) => {
                let medalIcon = "";
                let rowClass = "hover:bg-[var(--bg-base)] transition-colors";
                if (index === 0) {
                  medalIcon = '<svg aria-hidden="true" focusable="false" class="w-6 h-6 mx-auto text-yellow-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7.4-6.3-4.8-6.3 4.8 2.3-7.4-6-4.6h7.6z"/></svg>';
                  rowClass = "bg-amber-500/10 hover:bg-amber-500/20 transition-colors";
                } else if (index === 1) {
                  medalIcon = '<svg aria-hidden="true" focusable="false" class="w-6 h-6 mx-auto text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7.4-6.3-4.8-6.3 4.8 2.3-7.4-6-4.6h7.6z"/></svg>';
                  rowClass = "bg-gray-500/10 hover:bg-gray-500/20 transition-colors";
                } else if (index === 2) {
                  medalIcon = '<svg aria-hidden="true" focusable="false" class="w-6 h-6 mx-auto text-orange-700" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7.4-6.3-4.8-6.3 4.8 2.3-7.4-6-4.6h7.6z"/></svg>';
                  rowClass = "bg-orange-500/10 hover:bg-orange-500/20 transition-colors";
                } else {
                  medalIcon = `<span class="font-bold text-[var(--text-muted)]">${index + 1}</span>`;
                }
                return `
                  <tr class="${rowClass}">
                    <td class="px-4 py-3 text-center">${medalIcon}</td>
                    <td class="px-4 py-3 font-bold text-[var(--text-main)] truncate">
                      ${escapeHtml(e.name)}
                      <span class="block text-xs font-normal text-[var(--text-muted)]">${escapeHtml(e.clan_name || 'Sin clan')}</span>
                    </td>
                    <td class="px-4 py-3 text-right font-black text-[var(--text-main)]">${e.average_score}</td>
                  </tr>
                `;
              }).join('') : `
                <tr>
                  <td colspan="3" class="px-4 py-6 text-center text-[var(--text-muted)]">No hay suficientes datos.</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      `;
      document.getElementById('dashboard-top-tables').innerHTML = buildTable("Top Team Leaders", topLeaders) + buildTable("Top Tutores", topTutors);
    });

    if (currentPeriods.length > 0) {
      setupDropdown('dashboard-period-filter', async (val) => {
        selectedPeriodId = val;
        content.innerHTML = `
          <div class="flex items-center justify-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-4 border-[var(--brand-bg)] border-t-transparent"></div>
          </div>
        `;
        await renderDashboardContent(content, user, name, role);
      });
    }
  }
};

