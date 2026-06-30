import { navBarComponent } from "../../components/navbar";

export const renderTalent = () => `
  ${navBarComponent()}
  <main class="mx-auto max-w-6xl px-6 py-10">
    <section>
      <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Admin</p>
      <h1 class="mt-1 text-4xl font-black tracking-tight text-[var(--text-main)]">Analítica de talento</h1>
      <p class="mt-4 text-[var(--text-muted)]">Coders con potencial para convertirse en Team Leaders.</p>
    </section>

    <section class="mt-6 flex gap-4 flex-wrap">
      <select id="filter-area"
        class="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-panel)] px-4 py-2 text-sm text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:outline-none">
        <option value="">Todas las áreas</option>
      </select>
      <select id="filter-period"
        class="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-panel)] px-4 py-2 text-sm text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:outline-none">
        <option value="">Todos los periodos</option>
      </select>
    </section>

    <section id="talent-list" class="mt-8 grid gap-4">
      <div class="h-20 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
      <div class="h-20 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
      <div class="h-20 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
    </section>
  </main>
`;

export const setupTalent = () => {};
