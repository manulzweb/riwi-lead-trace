import { authService } from "../services/auth.service";
import { navBarComponent, setupNavBar } from "../components/navbar";
import { escapeHtml } from "../utils/validators";
import { periodService } from "../services/periods.service";
import { metricsService } from "../services/metrics.service";

export const renderDashboard = () => {
  const user = authService.getSession();
  const name = user?.name ? escapeHtml(user.name) : "Usuario";
  const roles = user?.roles ?? [];
  
  const quickLinks = {
    coder: [
      { href: "/evaluations/new", label: "Evaluar", title: "Nueva evaluación" },
      { href: "/evaluations", label: "Historial", title: "Mis evaluaciones" },
    ],
    team_leader: [
      { href: "/my-results", label: "Resultados", title: "Mi retroalimentación" },
    ],
    tutor: [
      { href: "/evaluations/new", label: "Evaluar", title: "Nueva evaluación" },
      { href: "/evaluations", label: "Historial", title: "Mis evaluaciones" },
      { href: "/my-results", label: "Resultados", title: "Mi retroalimentación" },
    ],
    admin: [
      { href: "/admin/metrics", label: "Métricas", title: "ICA por área" },
      { href: "/admin/ai-summary", label: "Resumen IA", title: "Feedback con IA" },
    ],
  };

  const linksByHref = new Map();
  roles.forEach(r => (quickLinks[r] ?? []).forEach(link => linksByHref.set(link.href, link)));
  const links = [...linksByHref.values()];

  const linksHtml = links.map(({ href, label, title }) => `
    <a class="rounded-2xl bg-[var(--bg-panel)] p-6 shadow-md border border-[var(--border-main)] transition-all duration-300 ease-in-out hover:border-indigo-500/50 hover:shadow-lg hover:-translate-y-1" href="${href}">
      <p class="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">${label}</p>
      <h3 class="text-xl font-bold text-[var(--text-main)]">${title}</h3>
    </a>
  `).join("");

  return `
    ${navBarComponent()}
    
    <main class="min-h-screen bg-[var(--bg-base)] text-[var(--text-main)] p-6 sm:p-8 lg:p-10 transition-all duration-300 overflow-x-hidden">
      <div class="mx-auto max-w-7xl">
        
        <!-- Saludo -->
        <header class="mb-10">
          <h1 class="text-4xl font-black tracking-tight mb-2">Bienvenido de vuelta, ${name.split(' ')[0]}</h1>
          <p class="text-[var(--text-muted)] text-sm font-medium">Este es tu panel de control y accesos rápidos de hoy.</p>
        </header>

        <!-- Accesos rápidos (Estilo Proyecto) -->
        <section class="mb-12">
          <h2 class="text-lg font-bold mb-4">Tus Herramientas</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            ${linksHtml || '<p class="text-[var(--text-muted)] text-sm">No hay accesos configurados para tu rol.</p>'}
          </div>
        </section>

        <!-- KPI Premium Dashboard (Carga asíncrona) -->
        <section id="metrics-dashboard" class="hidden">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-bold">Métricas del Periodo Activo <span id="period-name" class="text-indigo-500 ml-2">...</span></h2>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            
            <!-- Card 1 -->
            <div class="bg-[var(--bg-panel)] rounded-2xl p-6 shadow-lg border border-[var(--border-main)] hover:border-indigo-500/30 transition-colors">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <p class="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-1">Evaluados</p>
                  <h3 id="kpi-evaluated" class="text-3xl font-black">--</h3>
                </div>
                <div class="bg-indigo-500/10 p-3 rounded-xl">
                  <svg class="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                </div>
              </div>
            </div>

            <!-- Card 2 -->
            <div class="bg-[var(--bg-panel)] rounded-2xl p-6 shadow-lg border border-[var(--border-main)] hover:border-orange-500/30 transition-colors">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <p class="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-1">Evaluadores</p>
                  <h3 id="kpi-evaluators" class="text-3xl font-black">--</h3>
                </div>
                <div class="bg-orange-500/10 p-3 rounded-xl">
                  <svg class="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                </div>
              </div>
            </div>

            <!-- Card 3 -->
            <div class="bg-[var(--bg-panel)] rounded-2xl p-6 shadow-lg border border-[var(--border-main)] hover:border-emerald-500/30 transition-colors">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <p class="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-1">Total Respuestas</p>
                  <h3 id="kpi-responses" class="text-3xl font-black">--</h3>
                </div>
                <div class="bg-emerald-500/10 p-3 rounded-xl">
                  <svg class="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
              </div>
            </div>

            <!-- Card 4 -->
            <div class="bg-[var(--bg-panel)] rounded-2xl p-6 shadow-lg border border-[var(--border-main)] hover:border-purple-500/30 transition-colors">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <p class="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-1">ICP Promedio</p>
                  <h3 id="kpi-icp" class="text-3xl font-black">--</h3>
                </div>
                <div class="bg-purple-500/10 p-3 rounded-xl">
                  <svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg>
                </div>
              </div>
            </div>

          </div>
        </section>

      </div>
    </main>
  `;
};

export const setupDashboard = async () => {
  setupNavBar();
  
  const user = authService.getSession();
  const isAdmin = user?.roles?.includes("admin");

  if (!isAdmin) return; // Solo admins ven las KPIs globales en el Home

  const metricsDashboard = document.getElementById("metrics-dashboard");
  metricsDashboard.classList.remove("hidden");

  try {
    const periods = await periodService.get();
    const activePeriod = periods.find(p => p.is_active);

    if (!activePeriod) {
      document.getElementById("period-name").textContent = "(Ningún periodo activo)";
      return;
    }

    document.getElementById("period-name").textContent = `(${activePeriod.name})`;

    const data = await metricsService.getSummary(activePeriod.id);
    if (!data || !data.kpis) return;

    document.getElementById("kpi-evaluated").textContent = data.kpis.total_evaluated || 0;
    document.getElementById("kpi-evaluators").textContent = data.kpis.total_evaluators || 0;
    document.getElementById("kpi-responses").textContent = data.kpis.total_responses || 0;

    // Calcular promedio ICP general
    let avgIcp = 0;
    let icps = data.evaluatee_icps || [];
    let validIcps = icps.filter(i => i.average_score !== null);
    
    if (validIcps.length > 0) {
      let sum = validIcps.reduce((acc, curr) => acc + curr.average_score, 0);
      avgIcp = (sum / validIcps.length).toFixed(1);
    }
    
    document.getElementById("kpi-icp").textContent = validIcps.length > 0 ? avgIcp : "N/A";

  } catch (err) {
    console.error("Error fetching dashboard metrics:", err);
  }
};
