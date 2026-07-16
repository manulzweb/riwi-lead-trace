import { authService } from "../services/auth.service";
import { escapeHtml } from "../utils/validators"
import { renderRoute } from "../router/router";
import { themeService } from "../services/theme.service";
import { dropdownComponent, setupDropdown } from "./dropdown";
import { sidebarComponent, setupSidebar } from "./sidebar";

export const navBarComponent = () => {
  const user = authService.getSession()
  const path = window.location.pathname;
  const currentTheme = themeService.getTheme();

  const isActive = (route) => path === route;

  // Quitamos el dropdown anterior

  if (!user) {
    // Navbar simple para usuarios no autenticados
    return `
    <header class="border-b border-[var(--border-main)] bg-[var(--bg-panel)]/90 backdrop-blur sticky top-0 z-50">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <img src="../../public/icons/riwi_logo.png" alt="Logo" class="w-auto h-8">
        <a class="text-xl font-black text-[var(--brand-bg)] transition-colors hover:text-[var(--brand-hover)]" href="/">LeadTrace</a>
        <div class="flex items-center gap-3">
          <div class="hidden sm:block">
            <!-- Espacio reservado si se desea -->
          </div>
          <a class="rounded-full px-4 py-2 text-sm font-semibold text-[var(--text-main)] transition-all duration-300 ease-in-out hover:bg-[var(--border-main)]" href="/login">Iniciar sesión</a>
          <a class="rounded-full bg-[var(--brand-bg)] px-4 py-2 text-sm font-semibold text-[var(--brand-text)] transition-all duration-300 ease-in-out hover:bg-[var(--brand-hover)] hover:shadow-md" href="/register">Crear cuenta</a>
        </div>
      </div>
    </header>`;
  }

  // Navbar autenticado
  return `
    ${sidebarComponent(isActive)}
    
    <header class="sticky top-0 z-30 w-full" style="background: linear-gradient(90deg, var(--topbar-grad-start) 0%, var(--topbar-grad-mid) 50%, var(--topbar-grad-end) 100%);">
      <div class="flex h-16 items-center justify-between px-6">
        
        <div class="flex items-center gap-4 text-white">
          <button id="open-sidebar-btn" class="p-2 hover:bg-white/20 rounded-xl transition-colors cursor-pointer text-white">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <a class="font-heading font-black font-semibold text-xl hidden sm:flex items-center gap-4 mt-1 text-white tracking-wide" href="/dashboard">
            <img src="../../public/icons/riwi_logo.png" alt="Logo" class="w-auto h-6"> 
            <span>LeadTrace</span>
          </a>
        </div>

        <div class="flex items-center gap-4 text-white">
          <!-- Boton de Tema -->
          <div class="flex bg-white/20 rounded-full p-1 text-xs items-center" id="theme-toggle-group">
            <button data-theme="light" class="p-1.5 rounded-full transition-colors cursor-pointer ${currentTheme === 'light' ? 'bg-white text-[#7559ED] shadow-sm' : 'hover:text-white'}" title="Modo Claro">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            </button>
            <button data-theme="dark" class="p-1.5 rounded-full transition-colors cursor-pointer ${currentTheme === 'dark' ? 'bg-white text-[#7559ED] shadow-sm' : 'hover:text-white'}" title="Modo Oscuro">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
            </button>
          </div>

          <!-- Boton de Idioma -->
          <div class="flex bg-white/20 rounded-full p-1 text-xs font-bold items-center">
            <button class="px-3 py-1 rounded-full bg-white text-[#7559ED] shadow-sm cursor-pointer">ES</button>
            <button class="px-3 py-1 rounded-full hover:text-white transition-colors cursor-pointer">EN</button>
          </div>

          <!-- Boton Cerrar Sesion -->
          <button id="logout-btn" class="flex items-center gap-2 border border-white/30 rounded-full px-4 py-1.5 text-sm font-medium  hover:border-[var(--danger-hover)] hover:text-[var(--danger-hover)] transition-colors cursor-pointer text-white">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            <span class="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>

      </div>
    </header>`;
};

export const setupNavBar = () => {
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      authService.clearSession();
      window.history.pushState({}, "", "/login");
      renderRoute();
    });
  }

  const themeBtns = document.querySelectorAll("#theme-toggle-group button");
  themeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const theme = btn.getAttribute("data-theme");
      
      const switchTheme = () => {
        themeService.setTheme(theme);
        renderRoute();
      };

      if (!document.startViewTransition) {
        switchTheme();
      } else {
        document.startViewTransition(switchTheme);
      }
    });
  });

  // Sidebar logic
  const openSidebarBtn = document.getElementById("open-sidebar-btn");
  const closeSidebarBtn = document.getElementById("close-sidebar-btn");
  const sidebar = document.getElementById("main-sidebar");
  const overlay = document.getElementById("sidebar-overlay");

  const toggleSidebar = (forceClose = false) => {
    if (!sidebar || !overlay) return;
    const isClosed = sidebar.classList.contains("-translate-x-full");
    
    if (isClosed && !forceClose) {
      sidebar.classList.remove("-translate-x-full");
      overlay.classList.remove("opacity-0", "pointer-events-none");
    } else {
      sidebar.classList.add("-translate-x-full");
      overlay.classList.add("opacity-0", "pointer-events-none");
    }
  };

  if (openSidebarBtn) openSidebarBtn.addEventListener("click", () => toggleSidebar());
  if (closeSidebarBtn) closeSidebarBtn.addEventListener("click", () => toggleSidebar(true));
  if (overlay) overlay.addEventListener("click", () => toggleSidebar(true));

  setupSidebar();
};
