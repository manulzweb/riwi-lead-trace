import { authService } from "../services/auth.service";
import { navBarComponent } from "../components/navbar";

export const renderNotFound = () => {
  const userSession = authService.getSession();
  return `
    ${userSession ? navBarComponent() : ''}
    <main class="flex min-h-screen items-center justify-center px-6 py-10">
      <section class="w-full max-w-2xl rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-10 text-center shadow-xl">
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Error de navegacion</p>
        <h1 class="mt-4 text-6xl font-black tracking-tight text-[var(--text-main)]">404</h1>
        <p class="mt-4 text-lg text-[var(--text-muted)]">La vista que intentas abrir no existe o todavia no esta disponible dentro del proyecto.</p>
        <div class="mt-8 flex justify-center gap-4">
          <a class="inline-flex items-center justify-center rounded-2xl bg-[var(--brand-bg)] px-5 py-3 text-sm font-bold text-[var(--brand-text)] hover:bg-[var(--brand-hover)] transition-colors" href="/">Ir a home</a>
          <a class="inline-flex items-center justify-center rounded-2xl border border-[var(--border-main)] bg-[var(--bg-panel)] px-5 py-3 text-sm font-bold text-[var(--brand-bg)] hover:bg-[var(--bg-base)] transition-colors" href="/login">Volver al login</a>
        </div>
      </section>
    </main>
  `;
}

export const setupNotFound = () => {};
