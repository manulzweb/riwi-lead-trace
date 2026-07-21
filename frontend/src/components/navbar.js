import { authService } from "../services/auth.service";
import { renderRoute } from "../router/router";
import { themeService } from "../services/theme.service";
import { sidebarComponent, setupSidebar } from "./sidebar";

export const navBarComponent = () => {
  const user = authService.getSession()
  const path = window.location.pathname + window.location.search;
  const currentTheme = themeService.getTheme();

  const isActive = (route) => {
    return path === route || (route === window.location.pathname && !window.location.search);
  };

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
          <a class="font-heading font-black font-semibold text-xl hidden sm:flex items-center gap-4 mt-1 text-white tracking-wide" href="/dashboard">
            <img src="../../public/icons/riwi_logo.png" alt="Logo" class="w-auto h-6"> 
            <span>LeadTrace</span>
          </a>
        </div>

        <div class="flex items-center gap-2 sm:gap-4 text-white/80">
          <!-- Boton de Idioma (Mockup style)
          <button class="p-2 hover:text-white rounded-full transition-colors hidden sm:block" aria-label="Language">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </button> -->

          <!-- Boton de Tema -->
          <button id="theme-toggle-btn" class="p-2 hover:text-white rounded-full transition-colors" aria-label="Toggle theme">
            ${currentTheme === 'dark'
      ? `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`
      : `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`
    }
          </button>

          <div class="h-6 w-px bg-white/20 mx-1 hidden sm:block"></div>

          <!-- Boton Cerrar Sesion -->
          <button id="logout-btn" class="p-2 rounded-full transition-colors text-white/80 hover:text-red-400 ml-1" aria-label="Logout">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
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

  const themeBtn = document.getElementById("theme-toggle-btn");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const currentTheme = themeService.getTheme();
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';

      const switchTheme = () => {
        themeService.setTheme(newTheme);
        renderRoute();
      };

      if (!document.startViewTransition) {
        switchTheme();
      } else {
        document.startViewTransition(switchTheme);
      }
    });
  }

  // Sidebar logic
  const sidebar = document.getElementById("main-sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const closeSidebarBtn = document.getElementById("close-sidebar-btn");
  const desktopSidebarBtn = document.getElementById("desktop-sidebar-btn");

  if (sidebar) {
    document.body.classList.add("has-sidebar");
  } else {
    document.body.classList.remove("has-sidebar");
  }

  const toggleSidebar = (forceClose = false) => {
    if (!sidebar || !overlay) return;

    // Si estamos en mobile (ancho < 1024px), usamos el comportamiento anterior
    if (window.innerWidth < 1024) {
      const isClosed = sidebar.classList.contains("-translate-x-full");
      if (isClosed && !forceClose) {
        sidebar.classList.remove("-translate-x-full");
        overlay.classList.remove("opacity-0", "pointer-events-none");
      } else {
        sidebar.classList.add("-translate-x-full");
        overlay.classList.add("opacity-0", "pointer-events-none");
      }
    }
  };

  const toggleDesktopSidebar = () => {
    document.body.classList.toggle("sidebar-collapsed");
  };

  if (closeSidebarBtn) closeSidebarBtn.addEventListener("click", () => toggleSidebar(true));
  if (desktopSidebarBtn) desktopSidebarBtn.addEventListener("click", () => toggleDesktopSidebar());
  if (overlay) overlay.addEventListener("click", () => toggleSidebar(true));

  setupSidebar();
};

