import { authService } from "../services/auth.service";
import { navBarComponent, setupNavBar } from "../components/navbar";
import { escapeHtml } from "../utils/validators";
import { Card, StatsCard } from "../components/cards_ui";
import { metricsService } from "../services/metrics.service";
import { request } from "../services/api.service";
import { periodService } from "../services/periods.service";
import { dropdownComponent, setupDropdown } from "../components/dropdown";

const icons = {
  check: `<svg class="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  star: `<svg class="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>`,
  clock: `<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  users: `<svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`,
  chartPie: `<svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>`
};

const renderDoughnut = (percentage) => {
  const dashArray = `${percentage} ${100 - percentage}`;
  return `
    <div class="relative flex flex-col items-center justify-center">
      <svg viewBox="0 0 36 36" class="w-28 h-28">
        <path class="text-[var(--border-main)]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="4"/>
        <path class="text-[var(--brand-bg)]" stroke-dasharray="${dashArray}" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="4"/>
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center pt-1">
        <span class="text-2xl font-bold text-[var(--text-main)] leading-none">${percentage}%</span>
        <span class="text-[8px] font-medium text-[var(--text-muted)] uppercase tracking-wider mt-1">Participación</span>
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
        <div class="w-full sm:w-64 z-20 relative">
          <label class="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Filtrar por Periodo</label>
          ${dropdownComponent('dashboard-period-filter', currentPeriods.map(p => ({
            value: String(p.id), 
            label: p.name + (p.is_active ? ' (Activo)' : '')
          })), selectedPeriodId)}
        </div>
      ` : ''}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="dashboard-cards">
  `;

  if (role === "admin") {
    // Admin View
    const summary = selectedPeriodId ? await metricsService.getSummary(selectedPeriodId) : { kpis: { total_evaluations: 0, average_score: 0, participation_rate: 0 }, evaluatees: [] };
    const kpis = summary.kpis || { total_evaluations: 0, average_score: 0, participation_rate: 0 };
    
    html += `
      ${StatsCard({ title: "Encuestas Resueltas", value: kpis.total_evaluations, icon: icons.check, description: "En el periodo seleccionado" })}
      ${StatsCard({ title: "ICP Global Promedio", value: kpis.average_score + "/100", icon: icons.star, description: "Desempeño de la plataforma" })}
      
      <div class="col-span-1 md:col-span-2 lg:col-span-1">
        ${Card({
          className: "h-full flex flex-col p-6",
          children: `
            <h3 class="text-sm font-medium text-[var(--text-muted)] text-left w-full mb-4">Tasa de Participación</h3>
            <div class="flex-1 flex flex-col items-center justify-center w-full">
              ${renderDoughnut(kpis.participation_rate)}
              <p class="text-xs text-[var(--text-muted)] mt-6 text-center">(${kpis.total_evaluations} evaluaciones realizadas)</p>
            </div>
          `
        })}
      </div>
    `;

    // Añadir tabla de Top Evaluados por rol
    const validEvaluatees = summary.evaluatees?.filter(e => e.average_score !== null) || [];
    const topTutors = validEvaluatees.filter(e => e.role === "tutor").sort((a, b) => b.average_score - a.average_score).slice(0, 3);
    const topLeaders = validEvaluatees.filter(e => e.role === "team_leader").sort((a, b) => b.average_score - a.average_score).slice(0, 3);
    
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
              let medal = index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉";
              return `
                <tr class="hover:bg-[var(--bg-base)] transition-colors">
                  <td class="px-4 py-3 font-medium text-lg text-center">${medal}</td>
                  <td class="px-4 py-3 font-bold text-[var(--text-main)] truncate">${escapeHtml(e.name)}</td>
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

    html += `
      <div class="col-span-1 md:col-span-2 lg:col-span-3 mt-4">
        <h2 class="text-xl font-bold text-[var(--text-main)] mb-4">Top Rendimiento (ICP)</h2>
        <div class="flex flex-col md:flex-row gap-6">
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
  
  if (role === "admin" && currentPeriods.length > 0) {
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
};

