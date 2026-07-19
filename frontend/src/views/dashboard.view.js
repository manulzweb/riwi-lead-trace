import { authService } from "../services/auth.service";
import { navBarComponent, setupNavBar } from "../components/navbar";
import { showToast } from "../components/alerts";
import { escapeHtml } from "../utils/validators";
import { metricsService } from "../services/metrics.service";
import { periodService } from "../services/periods.service";
import { getCategoryBreakdown } from "../utils/categoryBreakdown";

export const renderDashboard = () => {
  const user = authService.getSession();
  const name = user?.name ? escapeHtml(user.name) : "Usuario";
  const roles = user?.roles ?? [];

  if (roles.includes("admin")) {
    return renderAdminDashboard(name);
  } else {
    return renderUserDashboard(name, roles);
  }
};

const renderAdminDashboard = (name) => {
  return `
    ${navBarComponent()}
    <main class="mx-auto max-w-7xl px-6 py-10">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <!-- Contenido Central / Izquierda -->
        <div id="left-column-wrapper" class="col-span-12 transition-all duration-300 space-y-8">
          
          <!-- Encabezado de la página -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 class="text-3xl font-black text-[var(--text-main)] tracking-tight">Dashboard Overview</h1>
              <p class="text-sm text-[var(--text-muted)] mt-1">High-level insights and performance metrics.</p>
            </div>
            <div class="text-xs text-[var(--text-muted)] font-bold bg-[var(--bg-panel)] px-4 py-2 border border-[var(--border-main)] rounded-2xl shadow-sm" id="dashboard-period-label">
              Cargando periodo activo...
            </div>
          </div>

          <!-- Fila de Tarjetas de Métricas (Círculos de Porcentaje SVG dinámicos) -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <!-- Tarjeta 1: Total Evaluations -->
            <div class="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-sm flex flex-col items-center justify-between text-center min-h-[240px] transition-all hover:shadow-md">
              <div class="bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 rounded-2xl p-3 w-12 h-12 flex items-center justify-center">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <div class="relative flex items-center justify-center my-4">
                <svg class="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" stroke="var(--border-main)" stroke-width="6" fill="transparent" class="opacity-20" />
                  <circle id="total-evals-circle" cx="50" cy="50" r="38" stroke="#4f46e5" stroke-width="6" fill="transparent"
                    stroke-dasharray="238.76" stroke-dashoffset="238.76" style="transition: stroke-dashoffset 0.8s ease-in-out;" />
                </svg>
                <span id="total-evals-value" class="absolute text-2xl font-black text-[var(--text-main)]">--</span>
              </div>
              <p class="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest">Total Evaluations</p>
            </div>

            <!-- Tarjeta 2: Average Score -->
            <div class="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-sm flex flex-col items-center justify-between text-center min-h-[240px] transition-all hover:shadow-md">
              <div class="bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400 rounded-2xl p-3 w-12 h-12 flex items-center justify-center">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.246.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.971-2.883a1 1 0 00-1.175 0l-3.97 2.883c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118l-3.97-2.883c-.773-.565-.373-1.81.587-1.81h4.908a1 1 0 00.95-.69l1.519-4.674z"/>
                </svg>
              </div>
              <div class="relative flex items-center justify-center my-4">
                <svg class="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" stroke="var(--border-main)" stroke-width="6" fill="transparent" class="opacity-20" />
                  <circle id="avg-score-circle" cx="50" cy="50" r="38" stroke="#a855f7" stroke-width="6" fill="transparent"
                    stroke-dasharray="238.76" stroke-dashoffset="238.76" style="transition: stroke-dashoffset 0.8s ease-in-out;" />
                </svg>
                <span id="avg-score-value" class="absolute text-2xl font-black text-[var(--text-main)]">--</span>
              </div>
              <p class="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest">Average Score</p>
            </div>

            <!-- Tarjeta 3: Participation -->
            <div class="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-sm flex flex-col items-center justify-between text-center min-h-[240px] transition-all hover:shadow-md">
              <div class="bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 rounded-2xl p-3 w-12 h-12 flex items-center justify-center">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
              </div>
              <div class="relative flex items-center justify-center my-4">
                <svg class="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" stroke="var(--border-main)" stroke-width="6" fill="transparent" class="opacity-20" />
                  <circle id="participation-circle" cx="50" cy="50" r="38" stroke="#f97316" stroke-width="6" fill="transparent"
                    stroke-dasharray="238.76" stroke-dashoffset="238.76" style="transition: stroke-dashoffset 0.8s ease-in-out;" />
                </svg>
                <span id="participation-value" class="absolute text-2xl font-black text-[var(--text-main)]">--</span>
              </div>
              <p class="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest">Participation</p>
            </div>

          </div>

          <!-- Tabla de Desempeño Leader Performance (ICA) -->
          <div class="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-sm">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h2 class="text-lg font-bold text-[var(--text-main)]">Leader Performance (ICA)</h2>
                <p class="text-xs text-[var(--text-muted)] mt-0.5">Instructor Competency Assessment scores.</p>
              </div>
              <button id="filter-btn" class="flex items-center gap-1.5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-panel)] px-3 py-1.5 text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-base)] transition-colors cursor-pointer">
                <svg class="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
                </svg>
                <span id="filter-label">Todos</span>
              </button>
            </div>

            <!-- Cabecera de la Tabla -->
            <div class="grid grid-cols-12 text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest px-4 py-2 border-b border-[var(--border-main)]">
              <span class="col-span-5">Leader / Tutor</span>
              <span class="col-span-3">Clan</span>
              <span class="col-span-2">ICA Score</span>
              <span class="col-span-2">Status</span>
            </div>

            <!-- Cuerpo de la Tabla -->
            <div id="leaders-list" class="divide-y divide-[var(--border-main)] mt-2">
              <div class="text-center py-8 text-[var(--text-muted)] animate-pulse text-sm">Cargando líderes y tutores...</div>
            </div>
          </div>

        </div>

        <!-- Panel Lateral de Detalles (Se muestra al hacer clic en un evaluable) -->
        <aside id="detail-panel" class="hidden lg:col-span-4 rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-sm h-fit sticky top-24 transition-all duration-300">
          <div class="flex items-start justify-between border-b border-[var(--border-main)] pb-4 mb-6">
            <div class="flex items-center gap-3">
              <div class="h-12 w-12 rounded-full bg-[var(--brand-bg)] text-white flex items-center justify-center border border-[var(--border-main)] text-sm font-bold shadow-inner" id="detail-avatar">
                --
              </div>
              <div>
                <h3 class="text-base font-bold text-[var(--text-main)]" id="detail-name"></h3>
                <p class="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider" id="detail-dept"></p>
              </div>
            </div>
            <button id="close-detail-btn" class="p-1.5 rounded-full hover:bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div>
            <p class="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest">OVERALL ICA</p>
            <div class="flex items-baseline gap-3 mt-1 mb-6">
              <span class="text-4xl font-black text-[var(--text-main)]" id="detail-overall-score">--</span>
              <span class="rounded-full px-2.5 py-0.5 text-xs font-bold" id="detail-overall-status">--</span>
            </div>

            <div class="mb-6">
              <h4 class="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest mb-4">Category Breakdown</h4>
              <div class="space-y-4" id="detail-categories">
                <!-- Se llena dinámicamente -->
              </div>
            </div>

            <!-- Bloque de Resumen de IA -->
            <div class="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] p-4 mb-6" id="detail-ai-summary-box">
              <div class="flex items-center gap-2 text-[var(--brand-bg)] mb-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
                <span class="text-xs font-bold uppercase tracking-wider">AI Summary</span>
              </div>
              <p class="text-xs text-[var(--text-muted)] leading-relaxed italic" id="detail-ai-summary-text">
                Selecciona un líder para generar su resumen por Inteligencia Artificial.
              </p>
            </div>

            <div class="flex items-center justify-between text-xs text-[var(--text-muted)] mb-6 border-t border-[var(--border-main)] pt-4">
              <span>Evaluaciones recibidas</span>
              <span class="font-bold text-[var(--text-main)]" id="detail-participation-text">--</span>
            </div>

            <a href="/admin/metrics" class="block w-full py-3 rounded-2xl bg-[var(--bg-base)] text-[var(--text-main)] hover:bg-[var(--border-main)] text-center text-xs font-bold transition-colors">
              Ver Reporte Completo
            </a>
          </div>
        </aside>

      </div>
    </main>
  `;
};

const renderUserDashboard = (name, roles) => {
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
  };

  const linksByHref = new Map();
  roles.forEach(r => (quickLinks[r] ?? []).forEach(link => linksByHref.set(link.href, link)));
  const links = [...linksByHref.values()];

  const linksHtml = links.map(({ href, label, title }) => `
    <a class="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-sm transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-0.5 hover:border-[var(--brand-bg)] group" href="${href}">
      <p class="text-xs font-bold uppercase tracking-wider text-[var(--brand-bg)]">${label}</p>
      <h3 class="mt-2 text-lg font-bold text-[var(--text-main)] group-hover:text-[var(--brand-hover)] transition-colors">${title}</h3>
      <div class="mt-4 flex items-center text-xs text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">
        <span>Acceder ahora</span>
        <svg class="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      </div>
    </a>
  `).join("");

  return `
    ${navBarComponent()}
    <main class="mx-auto max-w-6xl px-6 py-10 space-y-8">
      <section class="rounded-3xl bg-gradient-to-r from-[var(--topbar-grad-mid)] to-[var(--topbar-grad-end)] p-8 text-white shadow-lg transition-colors duration-300">
        <p class="text-[10px] font-bold uppercase tracking-[0.3em] opacity-80">Dashboard</p>
        <h1 class="mt-2 text-4xl font-black tracking-tight">Bienvenido, ${name}</h1>
        <p class="mt-2 max-w-2xl text-sm opacity-90">Accede a tus herramientas de evaluación y consulta tus resultados en la plataforma.</p>
      </section>

      <section class="space-y-6">
        <h2 class="text-xl font-bold text-[var(--text-main)]">Accesos rápidos</h2>
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          ${linksHtml || '<p class="text-[var(--text-muted)] text-sm">No hay accesos configurados para tu rol.</p>'}
        </div>
      </section>
    </main>
  `;
};

export const setupDashboard = async () => {
  const user = authService.getSession();
  const roles = user?.roles ?? [];

  if (!roles.includes("admin")) return;

  const periodLabel = document.getElementById("dashboard-period-label");
  const leadersList = document.getElementById("leaders-list");
  const filterBtn = document.getElementById("filter-btn");
  const filterLabel = document.getElementById("filter-label");

  let activePeriod = null;
  let evaluatees = [];
  let currentFilter = "all";

  const updateCircle = (circleId, valueId, value, percentage) => {
    const circle = document.getElementById(circleId);
    const valueSpan = document.getElementById(valueId);
    if (circle) {
      const circumference = 238.76;
      const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;
      circle.style.strokeDashoffset = offset;
    }
    if (valueSpan) {
      valueSpan.textContent = value;
    }
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const renderTable = () => {
    if (!leadersList) return;

    let filtered = evaluatees;
    if (currentFilter !== "all") {
      filtered = evaluatees.filter((e) => e.role === currentFilter);
    }

    if (filtered.length === 0) {
      leadersList.innerHTML = `
        <div class="text-center py-8 text-[var(--text-muted)] text-sm">
          No hay líderes o tutores registrados para este filtro.
        </div>
      `;
      return;
    }

    leadersList.innerHTML = filtered.map((ev) => {
      const scoreText = ev.average_score !== null ? `${ev.average_score}` : "--";
      const initials = getInitials(ev.name);
      const clanName = ev.clan_name || "Sin clan asignado";

      let badgeClass = "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-400";
      let displayStatus = ev.status;
      if (ev.status === "Sólido") {
        badgeClass = "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400";
        displayStatus = "SOLID";
      } else if (ev.status === "Estable") {
        badgeClass = "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400";
        displayStatus = "STABLE";
      } else if (ev.status === "En riesgo") {
        badgeClass = "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400";
        displayStatus = "AT RISK";
      } else if (ev.status === "Datos insuficientes") {
        badgeClass = "bg-gray-100 text-gray-500 dark:bg-gray-900/50 dark:text-gray-400";
        displayStatus = "NO DATA";
      }

      return `
        <div data-id="${ev.id}" class="leader-row grid grid-cols-12 items-center px-4 py-3 rounded-2xl hover:bg-[var(--bg-base)] transition-all cursor-pointer">
          <div class="col-span-5 flex items-center gap-3">
            <div class="h-10 w-10 rounded-full bg-[var(--border-main)] text-[var(--text-main)] flex items-center justify-center overflow-hidden border border-[var(--border-main)] font-bold text-xs shadow-inner">
              <span>${initials}</span>
            </div>
            <div>
              <p class="text-sm font-bold text-[var(--text-main)]">${ev.name}</p>
              <p class="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">${ev.role.replace('_', ' ')}</p>
            </div>
          </div>
          <div class="col-span-3 text-sm text-[var(--text-muted)]">
            ${escapeHtml(clanName)}
          </div>
          <div class="col-span-2 text-sm font-extrabold text-[var(--text-main)]">
            ${scoreText}
          </div>
          <div class="col-span-2 flex items-center justify-between">
            <span class="rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeClass}">${displayStatus}</span>
            <svg class="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </div>
        </div>
      `;
    }).join("");

    const rows = document.querySelectorAll(".leader-row");
    rows.forEach((row) => {
      row.addEventListener("click", () => {
        const id = parseInt(row.getAttribute("data-id"));
        showLeaderDetails(id);
      });
    });
  };

  const showLeaderDetails = async (leaderId) => {
    const ev = evaluatees.find((e) => e.id === leaderId);
    if (!ev) return;

    const detailPanel = document.getElementById("detail-panel");
    const leftColumnWrapper = document.getElementById("left-column-wrapper");

    if (detailPanel && leftColumnWrapper) {
      detailPanel.classList.remove("hidden");
      leftColumnWrapper.classList.remove("col-span-12");
      leftColumnWrapper.classList.add("lg:col-span-8");
    }

    document.getElementById("detail-avatar").textContent = getInitials(ev.name);
    document.getElementById("detail-name").textContent = ev.name;
    document.getElementById("detail-dept").textContent = ev.clan_name || "Sin clan asignado";
    document.getElementById("detail-overall-score").textContent = ev.average_score !== null ? ev.average_score : "--";
    document.getElementById("detail-participation-text").textContent = `${ev.n_evals} evaluaciones`;

    const statusBadge = document.getElementById("detail-overall-status");
    if (statusBadge) {
      let badgeClass = "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-400";
      let displayStatus = ev.status;
      if (ev.status === "Sólido") {
        badgeClass = "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400";
        displayStatus = "SOLID";
      } else if (ev.status === "Estable") {
        badgeClass = "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400";
        displayStatus = "STABLE";
      } else if (ev.status === "En riesgo") {
        badgeClass = "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400";
        displayStatus = "AT RISK";
      } else if (ev.status === "Datos insuficientes") {
        badgeClass = "bg-gray-100 text-gray-500 dark:bg-gray-900/50 dark:text-gray-400";
        displayStatus = "NO DATA";
      }
      statusBadge.className = `rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeClass}`;
      statusBadge.textContent = displayStatus;
    }

    const categoriesContainer = document.getElementById("detail-categories");
    if (categoriesContainer) {
      categoriesContainer.innerHTML = `<div class="text-center text-xs text-[var(--text-muted)] py-4 animate-pulse">Cargando desglose...</div>`;
      const breakdown = await getCategoryBreakdown(leaderId, activePeriod.id);

      if (breakdown.length === 0) {
        categoriesContainer.innerHTML = `<div class="text-xs text-[var(--text-muted)] py-2">No hay puntajes por categorías disponibles.</div>`;
      } else {
        categoriesContainer.innerHTML = breakdown.map((cat) => `
          <div class="flex flex-col gap-1">
            <div class="flex justify-between items-center text-xs">
              <span class="font-semibold text-[var(--text-main)]">${cat.category}</span>
              <span class="font-extrabold text-[var(--text-main)]">${cat.score}/100</span>
            </div>
            <div class="w-full bg-[var(--border-main)] h-2 rounded-full overflow-hidden">
              <div class="bg-[var(--brand-bg)] h-full rounded-full transition-all duration-500 ease-out" style="width: ${cat.score}%"></div>
            </div>
          </div>
        `).join("");
      }
    }

    const aiSummaryText = document.getElementById("detail-ai-summary-text");
    if (aiSummaryText) {
      aiSummaryText.innerHTML = `<span class="animate-pulse">Generando resumen con IA...</span>`;
      try {
        const aiRes = await metricsService.getAiSummary(leaderId, activePeriod.id);
        aiSummaryText.textContent = aiRes.summary || "No hay comentarios suficientes para generar un resumen.";
      } catch (err) {
        console.error(err);
        aiSummaryText.textContent = "Error al conectar con la IA.";
      }
    }
  };

  const closeDetailBtn = document.getElementById("close-detail-btn");
  if (closeDetailBtn) {
    closeDetailBtn.addEventListener("click", () => {
      const detailPanel = document.getElementById("detail-panel");
      const leftColumnWrapper = document.getElementById("left-column-wrapper");
      if (detailPanel && leftColumnWrapper) {
        detailPanel.classList.add("hidden");
        leftColumnWrapper.classList.remove("lg:col-span-8");
        leftColumnWrapper.classList.add("col-span-12");
      }
    });
  }

  try {
    const periods = await periodService.get();
    if (periods.length === 0) {
      if (periodLabel) periodLabel.textContent = "No hay periodos registrados.";
      return;
    }

    activePeriod = periods.find((p) => p.is_active) || periods[0];
    if (periodLabel) periodLabel.textContent = `Periodo: ${activePeriod.name}`;

    const summary = await metricsService.getSummary(activePeriod.id);
    evaluatees = summary.evaluatees;

    updateCircle("total-evals-circle", "total-evals-value", summary.kpis.total_evaluations, summary.kpis.participation_rate);
    updateCircle("avg-score-circle", "avg-score-value", summary.kpis.average_score, summary.kpis.average_score);
    updateCircle("participation-circle", "participation-value", `${summary.kpis.participation_rate}%`, summary.kpis.participation_rate);

    renderTable();

    if (filterBtn && filterLabel) {
      filterBtn.addEventListener("click", () => {
        if (currentFilter === "all") {
          currentFilter = "team_leader";
          filterLabel.textContent = "Team Leaders";
        } else if (currentFilter === "team_leader") {
          currentFilter = "tutor";
          filterLabel.textContent = "Tutores";
        } else {
          currentFilter = "all";
          filterLabel.textContent = "Todos";
        }
        renderTable();
      });
    }

  } catch (err) {
    console.error(err);
    showToast("Error", "error", "No se pudo cargar el dashboard. Intenta recargar la página.");
    if (periodLabel) periodLabel.textContent = "No se pudo cargar el periodo.";
    if (leadersList) {
      leadersList.innerHTML = `
        <div class="text-center py-8 text-[var(--text-muted)] text-sm">
          No se pudieron cargar los líderes y tutores. Recarga la página para reintentar.
        </div>
      `;
    }
  }
};
