import { authService } from "../services/auth.service";
import { escapeHtml } from "../utils/validators"
import { renderRoute } from "../router/router";
import { themeService } from "../services/theme.service";
import { dropdownComponent, setupDropdown } from "./dropdown";

export const navBarComponent = () => {
  const user = authService.getSession()
  const path = window.location.pathname;
  const currentTheme = themeService.getTheme();

  const isActive = (route) => path === route ? "bg-[var(--border-main)] text-[var(--brand-bg)]" : "text-[var(--text-muted)] hover:bg-[var(--border-main)] hover:text-[var(--brand-bg)]";

  const themeOptions = [
    { value: "light", label: "Claro" },
    { value: "dark", label: "Oscuro" }
  ];
  const themeSelect = dropdownComponent("theme-toggle", themeOptions, currentTheme);

  if (!user) {
    // Navbar simple para usuarios no autenticados
    return `
    <header class="border-b border-[var(--border-main)] bg-[var(--bg-panel)]/90 backdrop-blur sticky top-0 z-50">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a class="text-xl font-black text-[var(--brand-bg)] transition-colors hover:text-[var(--brand-hover)]" href="/">TaskFlowSPA</a>
        <div class="flex items-center gap-3">
          <div class="w-32 hidden sm:block">${themeSelect}</div>
          <a class="rounded-full px-4 py-2 text-sm font-semibold text-[var(--text-main)] transition-all duration-300 ease-in-out ${isActive('/login')}" href="/login">Iniciar sesión</a>
          <a class="rounded-full bg-[var(--brand-bg)] px-4 py-2 text-sm font-semibold text-[var(--brand-text)] transition-all duration-300 ease-in-out hover:bg-[var(--brand-hover)] hover:shadow-md" href="/register">Crear cuenta</a>
        </div>
      </div>
    </header>`;
  }

  const canViewAdmin = user && user.roles && user.roles.some(role => ["admin"].includes(role));
  const adminActive = path === '/admin' ? "bg-[var(--brand-hover)] shadow-inner" : "bg-[var(--brand-bg)] hover:bg-[var(--brand-hover)] hover:shadow-md";

  return `
    <header class="border-b border-[var(--border-main)] bg-[var(--bg-panel)]/90 backdrop-blur sticky top-0 z-50">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a class="text-xl font-black text-[var(--brand-bg)] transition-colors hover:text-[var(--brand-hover)]" href="/dashboard">TaskFlowSPA</a>
        <div class="flex items-center gap-4">
          <nav class="hidden gap-3 md:flex items-center">
            <a class="rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ease-in-out ${isActive('/dashboard')}" href="/dashboard">Dashboard</a>
            <a class="rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ease-in-out ${isActive('/tasks')}" href="/tasks">Tareas</a>
            <a class="rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ease-in-out ${isActive('/profile')}" href="/profile">Perfil</a>
            ${canViewAdmin ? `<a class="rounded-full px-4 py-2 text-sm font-semibold text-[var(--brand-text)] transition-all duration-300 ease-in-out ${adminActive}" href="/admin">Admin</a>` : ""}
          </nav>
          <div class="md:ml-2 md:border-l md:border-[var(--border-main)] md:pl-4 flex items-center gap-3">
            <div class="w-32 hidden sm:block">${themeSelect}</div>
            <span class="text-sm font-bold text-[var(--text-main)] hidden sm:block">${escapeHtml(user.name)}</span>
            <button id="logout-btn" class="rounded-full px-4 py-2 text-sm font-semibold text-[var(--danger-text)] transition-all duration-300 ease-in-out hover:bg-[var(--danger-hover)] cursor-pointer">Salir</button>
          </div>
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

  setupDropdown("theme-toggle", (val) => {
    themeService.setTheme(val);
  });
};
