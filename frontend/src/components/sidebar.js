import { authService } from "../services/auth.service";
import { escapeHtml } from "../utils/validators";

const renderNavLinks = (links, isActive) => {
  return links.map(link => {
    if (link.submenu) {
      const isSubmenuActive = link.submenu.some(sub => isActive(sub.href));
      return `
        <div class="accordion-item mb-2">
          <button class="accordion-header flex w-full items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${isSubmenuActive ? 'bg-[var(--bg-base)] text-[var(--brand-bg)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-base)]'}">
            <div class="flex items-center gap-3">
              ${link.icon}
              ${link.label}
            </div>
            <svg class="w-4 h-4 transition-transform duration-300 ${isSubmenuActive ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <div class="accordion-content overflow-hidden transition-all duration-300 ${isSubmenuActive ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}">
            <div class="flex flex-col gap-1 pl-11 pr-4 py-2">
              ${link.submenu.map(sub => `
                <a href="${sub.href}" class="block py-2 text-sm font-medium transition-colors ${isActive(sub.href) ? 'text-[var(--brand-bg)]' : 'text-[var(--text-muted)] hover:text-[var(--brand-bg)]'}">
                  ${sub.label}
                </a>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    return `
      <a href="${link.href}" class="flex items-center gap-3 mb-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive(link.href) ? 'bg-[var(--bg-base)] text-[var(--brand-bg)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-base)]'}">
        ${link.icon}
        ${link.label}
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
    home: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
    evaluations: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
    adminHub: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>`
  };

  if (role === "admin") {
    mainAction = `
      <div class="px-6 py-4">
        <a href="/admin/evaluations" class="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-bg)] py-3 text-sm font-bold text-[var(--brand-text)] transition-all hover:bg-[var(--brand-hover)] hover:shadow-md cursor-pointer">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Nueva Plantilla
        </a>
      </div>
    `;
    navConfig = [
      { href: "/dashboard", label: "Home", icon: icons.home },
      { label: "Admin Hub", icon: icons.adminHub, submenu: [
        { href: "/admin/evaluations", label: "Evaluations" },
        { href: "/admin/metrics", label: "Metrics" },
        { href: "/admin/ai-summary", label: "AI Summary" }
      ]}
    ];
  } else if (role === "coder") {
    navConfig = [
      { href: "/dashboard", label: "Home", icon: icons.home },
      { label: "Evaluations", icon: icons.evaluations, submenu: [
        { href: "/evaluations/new", label: "To-Do" },
        { href: "/evaluations", label: "History" }
      ]}
    ];
  } else {
    // team_leader or tutor
    navConfig = [
      { href: "/dashboard", label: "Home", icon: icons.home },
      { href: "/my-results", label: "Evaluations", icon: icons.evaluations }
    ];
  }

  // Common footer navigation
  navConfig.push({ href: "/settings", label: "Settings", icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>` });

  return `
    <div id="sidebar-overlay" class="fixed inset-0 z-40 bg-black/50 opacity-0 pointer-events-none transition-opacity duration-300"></div>
    <aside id="main-sidebar" class="fixed top-0 left-0 z-50 h-full w-72 -translate-x-full bg-[var(--bg-sidebar)] flex flex-col border-r border-[var(--border-main)] shadow-2xl transition-transform duration-300 ease-in-out">
      
      <div class="p-6 border-b border-[var(--border-main)] flex items-center justify-between">
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

      <div class="p-6 border-t border-[var(--border-main)] bg-[var(--bg-panel)]">
        <a href="/support" class="flex items-center gap-3 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--brand-bg)] transition-colors mb-6">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Support
        </a>
        <a href="/profile" class="flex items-center gap-3 group">
          <div class="h-10 w-10 rounded-full bg-[var(--bg-base)] flex items-center justify-center overflow-hidden border border-[var(--border-main)] group-hover:border-[var(--brand-hover)] transition-colors">
            <svg class="w-6 h-6 text-[var(--text-muted)]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          </div>
          <div>
            <p class="text-sm font-bold text-[var(--text-main)] group-hover:text-[var(--brand-hover)] transition-colors">${escapeHtml(user.name)}</p>
            <p class="text-xs text-[var(--text-muted)] capitalize">${escapeHtml(role.replace('_', ' '))}</p>
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
        content.classList.add("max-h-40", "opacity-100");
        icon.classList.add("rotate-180");
      } else {
        // Close
        content.classList.add("max-h-0", "opacity-0");
        content.classList.remove("max-h-40", "opacity-100");
        icon.classList.remove("rotate-180");
      }
    });
  });
};
