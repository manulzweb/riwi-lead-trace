import { authService } from "../services/auth.service";
import { escapeHtml } from "../utils/validators";

const renderNavLinks = (links, isActive) => {
  return links.map(link => {
    if (link.submenu) {
      const isSubmenuActive = link.submenu.some(sub => isActive(sub.href));
      return `
        <div class="accordion-item mb-0">
          <button class="accordion-header flex w-full items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${isSubmenuActive ? 'bg-indigo-50/50 text-[var(--brand-bg)] dark:bg-indigo-900/20' : 'text-[var(--text-muted)] hover:bg-[var(--bg-base)]'}">
            <div class="flex items-center gap-3">
              ${link.icon}
              <span class="nav-label">${link.label}</span>
            </div>
            <svg class="w-4 h-4 transition-transform duration-300 ${isSubmenuActive ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <div class="accordion-content overflow-hidden transition-all duration-300 ${isSubmenuActive ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}">
            <div class="flex flex-col gap-1 lg:pl-11 pr-4 py-2 submenu-container">
              ${link.submenu.map(sub => `
                <a href="${sub.href}" class="flex items-center gap-3 py-2 text-sm font-medium rounded-lg px-2 transition-colors ${isActive(sub.href) ? 'text-[var(--brand-bg)] bg-[var(--bg-base)]' : 'text-[var(--text-muted)] hover:text-[var(--brand-bg)] hover:bg-[var(--bg-base)]'}">
                  ${sub.icon || ''}
                  <span class="submenu-label">${sub.label}</span>
                </a>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    return `
      <a href="${link.href}" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive(link.href) ? 'bg-indigo-50/50 text-[var(--brand-bg)] dark:bg-indigo-900/20' : 'text-[var(--text-muted)] hover:bg-[var(--bg-base)] hover:text-[var(--brand-bg)]'}">
        ${link.icon}
        <span class="nav-label">${link.label}</span>
      </a>
    `;
  }).join('');
};

export const sidebarComponent = (isActive) => {
  const user = authService.getSession();
  if (!user) return "";

  const role = user.roles ? user.roles[0] : "Usuario";

  let mainAction = '';
  let navConfig = [];

  const icons = {
    home: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    evaluations: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    settings: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
    create: `<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>`,
    list: `<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>`,
    categories: `<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>`,
    clock: `<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    activity: `<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`,
    chart: `<svg class="w-5 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
    ai: `<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`,
    check: `<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`
  };

  if (role === "admin") {
    navConfig = [
      { href: "/dashboard", label: "Dashboard", icon: icons.home },
      { label: "Formularios", icon: icons.evaluations, submenu: [
        { href: "/admin/evaluations", label: "Gestión de Formularios", icon: icons.list },
        { href: "/admin/categories", label: "Categorías", icon: icons.categories },
      ]},
      { label: "Analíticas", icon: icons.chart, submenu: [
        { href: "/admin/metrics", label: "Métricas", icon: icons.chart },
        { href: "/admin/ai-summary", label: "Resumen IA", icon: icons.ai },
      ]},
      { label: "Administración", icon: icons.settings, submenu: [
        { href: "/admin/periods", label: "Periodos", icon: icons.clock },
        { href: "/admin/activity-log", label: "Actividad", icon: icons.activity },
        { href: "/admin/settings", label: "Configuración", icon: icons.settings }
      ]}
    ];
  } else if (role === "team_leader") {
    navConfig = [
      { href: "/dashboard", label: "Dashboard", icon: icons.home },
      { label: "Evaluations", icon: icons.evaluations, submenu: [
        { href: "/my-results", label: "My Results", icon: icons.chart }
      ]}
    ];
  } else {
    // tutor or coder
    navConfig = [
      { href: "/dashboard", label: "Dashboard", icon: icons.home },
      { label: "Evaluations", icon: icons.evaluations, submenu: [
        { href: "/evaluations/new", label: "To-Do Evaluations", icon: icons.create },
        { href: "/evaluations", label: "My Evaluations", icon: icons.list }
      ]}
    ];
  }

  return `
    <div id="sidebar-overlay" class="fixed inset-0 z-40 bg-black/50 opacity-0 pointer-events-none transition-opacity duration-300 lg:hidden"></div>
    <aside id="main-sidebar" class="fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] w-72 -translate-x-full lg:translate-x-0 bg-[var(--bg-sidebar)] flex flex-col border-r border-[var(--border-main)] shadow-2xl transition-all duration-300 ease-in-out">
      
      <button id="desktop-sidebar-btn" class="absolute -right-3 top-6 bg-[var(--bg-base)] border border-[var(--border-main)] rounded-full p-1 shadow-sm hover:text-[var(--brand-bg)] text-[var(--text-muted)] z-50 transition-colors cursor-pointer hidden lg:flex items-center justify-center" title="Contraer / Expandir menú">
        <svg class="w-4 h-4 transition-transform duration-300 desktop-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
      </button>

      <div class="p-6 border-b border-[var(--border-main)] flex items-center justify-between lg:hidden">
        <div>
          <div class="flex items-center gap-2">
            <img src="../../public/icons/riwi_logo_oscuro.png" alt="Logo Riwi" class="logo-light block w-auto h-6 object-contain">
            <img src="../../public/icons/riwi_logo.png" alt="Logo Riwi" class="logo-dark block w-auto h-6 object-contain">
            <h2 class="text-xl mt-1 font-medium font-black text-[var(--text-main)] ">
            LeadTrace
          </h2>
          </div>          
          <p class="text-xs text-[var(--text-muted)] font-medium mt-1">Professional Feedback</p>
        </div>
        <button id="close-sidebar-btn" class="p-2 text-[var(--text-muted)] hover:bg-[var(--bg-base)] rounded-xl cursor-pointer hover:text-[var(--text-main)] transition-colors lg:hidden">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      ${mainAction}

      <nav class="flex-1 px-4 py-4 overflow-y-auto">
        ${renderNavLinks(navConfig, isActive)}
      </nav>

      <div class="p-6 border-t border-[var(--border-main)] bg-[var(--bg-panel)] flex-shrink-0">
        <a href="/support" class="flex items-center gap-3 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--brand-bg)] transition-colors mb-6 support-link">
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>Support</span>
        </a>
        <a href="/profile" class="flex items-center gap-3 group">
          <div class="h-10 w-10 flex-shrink-0 rounded-full bg-[var(--bg-base)] flex items-center justify-center overflow-hidden border border-[var(--border-main)] group-hover:border-[var(--brand-hover)] transition-colors">
            <svg class="w-6 h-6 text-[var(--text-muted)]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          </div>
          <div class="user-info truncate">
            <p class="text-sm font-bold text-[var(--text-main)] group-hover:text-[var(--brand-hover)] transition-colors truncate">${escapeHtml(user.name)}</p>
            <p class="text-xs text-[var(--text-muted)] capitalize truncate">${escapeHtml(role.replace('_', ' '))}</p>
          </div>
        </a>
      </div>
    </aside>
  `;
};

export const setupSidebar = () => {
  const headers = document.querySelectorAll(".accordion-header");
  headers.forEach(header => {
    header.addEventListener("click", () => {
      const content = header.nextElementSibling;
      const icon = header.querySelector("svg:last-child");
      
      if (content.classList.contains("max-h-0")) {
        // Open
        content.classList.remove("max-h-0", "opacity-0");
        content.classList.add("max-h-96", "opacity-100");
        if (icon) icon.classList.add("rotate-180");
      } else {
        // Close
        content.classList.add("max-h-0", "opacity-0");
        content.classList.remove("max-h-96", "opacity-100");
        if (icon) icon.classList.remove("rotate-180");
      }
    });
  });
};

