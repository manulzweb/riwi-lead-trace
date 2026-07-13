import { authService } from "../services/auth.service";
import { navBarComponent } from "../components/navbar";
import { escapeHtml } from "../utils/validators";

export const renderDashboard = () => {
  const user = authService.getSession();
  const name = user?.name ? escapeHtml(user.name) : "Usuario";
  const role = user?.role ?? "";

  const quickLinks = {
    coder: [
      { href: "/evaluations/new", label: "Evaluar", title: "Nueva evaluación" },
      { href: "/evaluations",     label: "Historial", title: "Mis evaluaciones" },
    ],
    team_leader: [
      { href: "/my-results",    label: "Resultados", title: "Mi retroalimentación" },
    ],
    tutor: [
      { href: "/my-results", label: "Resultados", title: "Mi retroalimentación" },
    ],
    admin: [
      { href: "/admin/metrics",    label: "Métricas",  title: "ICP por área" },
      { href: "/admin/ai-summary", label: "Resumen IA", title: "Feedback con IA" },
    ],
  };

  const links = quickLinks[role] ?? [];

  const linksHtml = links.map(({ href, label, title }) => `
    <a class="rounded-3xl bg-[var(--bg-base)] p-5 transition-all duration-300 ease-in-out hover:bg-[var(--border-main)] hover:shadow-md hover:-translate-y-0.5" href="${href}">
      <p class="text-sm font-semibold text-[var(--brand-bg)]">${label}</p>
      <h3 class="mt-2 text-lg font-bold text-[var(--text-main)]">${title}</h3>
    </a>
  `).join("");

  return `
    ${navBarComponent()}
    <main class="mx-auto max-w-6xl px-6 py-10">
      <section class="rounded-[2rem] bg-[var(--brand-bg)] px-8 py-10 text-[var(--brand-text)] shadow-xl">
        <p class="text-sm font-semibold uppercase tracking-[0.3em] opacity-80">Dashboard</p>
        <h1 class="mt-3 text-4xl font-black tracking-tight">Bienvenido, ${name}</h1>
        <p class="mt-4 max-w-2xl opacity-90">Accede a tus herramientas según tu rol en el proceso de evaluación 360°.</p>
      </section>

      <section class="mt-8">
        <article class="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-lg">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-[var(--text-main)]">Accesos rápidos</h2>
            <a class="text-sm font-semibold text-[var(--brand-bg)] hover:text-[var(--brand-hover)]" href="/profile">Mi perfil</a>
          </div>
          <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            ${linksHtml || '<p class="text-[var(--text-muted)] text-sm">No hay accesos configurados para tu rol.</p>'}
          </div>
        </article>
      </section>
    </main>
  `;
};

export const setupDashboard = () => {};
