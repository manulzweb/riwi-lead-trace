import { navBarComponent } from "../../components/navbar";
import { dropdownComponent, setupDropdown } from "../../components/dropdown";

export const renderMetrics = () => `
  ${navBarComponent()}
  <main class="mx-auto max-w-6xl px-6 py-10">
    <section>
      <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Admin</p>
      <h1 class="mt-1 text-4xl font-black tracking-tight text-[var(--text-main)]">Métricas ICA</h1>
      <p class="mt-4 text-[var(--text-muted)]">Índice de Calidad de Acompañamiento por área y periodo.</p>
    </section>

    <section class="mt-6 flex gap-4 flex-wrap">
      <div class="w-48">
        ${dropdownComponent('filter-area', [
          { value: '', label: 'Todas las áreas' }
        ], '')}
      </div>
      <div class="w-48">
        ${dropdownComponent('filter-period', [
          { value: '', label: 'Todos los periodos' }
        ], '')}
      </div>
    </section>

    <section id="metrics-grid" class="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div class="h-32 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
      <div class="h-32 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
      <div class="h-32 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
    </section>
  </main>
`;

export const setupMetrics = () => {
  setupDropdown('filter-area');
  setupDropdown('filter-period');
};
