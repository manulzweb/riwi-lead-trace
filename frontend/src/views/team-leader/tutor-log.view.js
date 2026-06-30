import { navBarComponent } from "../../components/navbar";

export const renderTutorLog = () => `
  ${navBarComponent()}
  <main class="mx-auto max-w-6xl px-6 py-10">
    <section class="flex items-center justify-between">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Team Leader</p>
        <h1 class="mt-1 text-4xl font-black tracking-tight text-[var(--text-main)]">Bitácora de tutores</h1>
      </div>
      <a href="/tutor-logs/new"
        class="inline-flex items-center justify-center rounded-2xl bg-[var(--brand-bg)] px-5 py-3 text-sm font-bold text-[var(--brand-text)] transition-all duration-300 ease-in-out hover:bg-[var(--brand-hover)] hover:shadow-md">
        Nueva entrada
      </a>
    </section>

    <section id="logs-list" class="mt-8 grid gap-4">
      <div class="h-20 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
      <div class="h-20 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
    </section>
  </main>
`;

export const setupTutorLog = () => {};
