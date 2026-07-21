import { authService } from "../services/auth.service";
import { navBarComponent, setupNavBar } from "../components/navbar";
import { escapeHtml } from "../utils/validators";
import { Card, StatsCard } from "../components/cards_ui";
import { metricsService } from "../services/metrics.service";
import { request } from "../services/api.service";
import { periodService } from "../services/periods.service";
import { dropdownComponent, setupDropdown } from "../components/dropdown";
import { Chart } from 'chart.js/auto';

const icons = {
  check: `<svg class="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  star: `<svg class="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>`,
  clock: `<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  users: `<svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`,
  chartPie: `<svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>`
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
      <div id="dashboard-content" class="max-w-7xl mx-auto space-y-6">
        <div class="flex items-center justify-center h-64">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-[var(--brand-bg)] border-t-transparent"></div>
        </div>
      </div>
    </main>
  `;
};

let currentPeriods = [];
let selectedPeriodId = null;

export const setupDashboard = async () => {
  const content = document.getElementById("dashboard-content");
  if (!content) return;
  
  const user = authService.getSession();
  const name = user?.name ? escapeHtml(user.name) : "Usuario";
  const role = user?.roles ? user.roles[0] : "coder";

  try {
    currentPeriods = await periodService.get();
    const activePeriod = currentPeriods.find(p => p.is_active) || currentPeriods[0];
    selectedPeriodId = activePeriod ? String(activePeriod.id) : null;
    
    await renderDashboardContent(content, user, name, role);
    
  } catch (err) {
    content.innerHTML = `
      <div class="bg-[var(--danger-bg)] text-[var(--danger-text)] p-4 rounded-xl border border-[var(--danger-border)]">
        Hubo un error al cargar los datos del dashboard. Verifica tu conexión.
      </div>
    `;
    console.error(err);
  }
};

const renderDashboardContent = async (content, user, name, role) => {
  let html = `
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
      <div>
        <h1 class="text-3xl font-bold text-[var(--text-main)]">Bienvenido, ${name}</h1>
        <p class="text-[var(--text-muted)] mt-1">Aquí tienes un resumen de tu actividad en LeadTrace.</p>
      </div>
      ${role === 'admin' && currentPeriods.length > 0 ? `
        <div class="flex flex-col sm:flex-row gap-4 z-20 relative w-full sm:w-auto">
          <div class="w-full sm:w-48">
            <label class="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Periodo</label>
            ${dropdownComponent('dashboard-period-filter', currentPeriods.map(p => ({
              value: String(p.id), 
              label: p.name + (p.is_active ? ' (Activo)' : '')
            })), selectedPeriodId)}
          </div>
          <div class="w-full sm:w-48">
            <label class="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Cohorte</label>
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
        icon: `<svg class="w-6 h-6 ${alertIconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`, 
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
    
    // Store data globally to handle clan filter without fetching API again
    window.__dashboardEvaluatees = validEvaluatees;
    
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
                medalIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 14.7v4.6"/></svg>';
                //rowClass = "bg-amber-500/10 hover:bg-amber-400/20 transition-colors";
              } else if (index === 1) {
                medalIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B8B8B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/> <path d="M11 12 5.12 2.2"/> <path d="m13 12 5.88-9.8"/> <path d="M8 7h8"/> <circle cx="12" cy="17" r="5"/> <path d="M10.4 15.6c.4-.6 1-.9 1.7-.9.8 0 1.4.4 1.4 1 0 .6-.3.9-1.1 1.5l-1.8 1.3H14"/> </svg>';
                //rowClass = "bg-gray-500/10 hover:bg-gray-400/20 transition-colors";
              } else if (index === 2) {
                medalIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B87333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/> <path d="M11 12 5.12 2.2"/> <path d="m13 12 5.88-9.8"/> <path d="M8 7h8"/> <circle cx="12" cy="17" r="5"/> <!-- 3 --> <path d="M10.5 15h2c.6 0 1 .3 1 .8s-.4.8-1 .8"/> <path d="M12.5 16.6c.8 0 1.2.4 1.2 1s-.5 1-1.4 1c-.6 0-1.1-.2-1.5-.6"/> </svg>';
                //rowClass = "bg-orange-500/10 hover:bg-orange-400/20 transition-colors";
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
            <label class="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Filtrar por Clan</label>
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
      const myEvals = await request(`/evaluations?evaluator_id=${user.id}&limit=100`);
      const pending = myEvals.filter(e => e.status !== "submitted").length;
      html += StatsCard({ title: "Evaluaciones por Hacer", value: pending, icon: icons.clock, description: "Pendientes de enviar" });
    }
  } else {
    // Coder View
    const myEvals = await request(`/evaluations?evaluator_id=${user.id}&limit=100`);
    const completed = myEvals.filter(e => e.status === "submitted").length;
    const pending = myEvals.filter(e => e.status !== "submitted").length;
    
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
      const evaluatees = window.__dashboardEvaluatees || [];
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
                  medalIcon = '<svg class="w-8 h-8 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#D4AF37" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4 L28 20" /><path d="M42 4 L36 20" /><path d="M28 20 H36" /><circle cx="32" cy="38" r="18"/><text x="32" y="45" text-anchor="middle" font-size="16" font-family="Arial" font-weight="bold" fill="#D4AF37" stroke="none">1</text></svg>';
                  rowClass = "bg-amber-500/10 hover:bg-amber-500/20 transition-colors";
                } else if (index === 1) {
                  medalIcon = '<svg class="w-8 h-8 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#A7A7A7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4 L28 20"/><path d="M42 4 L36 20"/><path d="M28 20 H36"/><circle cx="32" cy="38" r="18"/><text x="32" y="45" text-anchor="middle" font-size="16" font-family="Arial" font-weight="bold" fill="#A7A7A7" stroke="none">2</text></svg>';
                  rowClass = "bg-gray-500/10 hover:bg-gray-500/20 transition-colors";
                } else if (index === 2) {
                  medalIcon = '<svg class="w-8 h-8 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#B87333" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4 L28 20"/><path d="M42 4 L36 20"/><path d="M28 20 H36"/><circle cx="32" cy="38" r="18"/><text x="32" y="45" text-anchor="middle" font-size="16" font-family="Arial" font-weight="bold" fill="#B87333" stroke="none">3</text></svg>';
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

