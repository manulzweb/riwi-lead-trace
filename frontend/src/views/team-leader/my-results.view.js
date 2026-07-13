import { navBarComponent } from "../../components/navbar";

export const renderMyResults = () => `
  ${navBarComponent()}
  <main class="mx-auto max-w-6xl px-6 py-10">
    <section>
      <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Retroalimentación</p>
      <h1 class="mt-1 text-4xl font-black tracking-tight text-[var(--text-main)]">Mis resultados</h1>
      <p class="mt-4 text-[var(--text-muted)]">Consulta cómo te han evaluado los Coders de tu clan.</p>
    </section>

    <section class="mt-8 grid gap-6 md:grid-cols-3">
      <article class="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-lg">
        <p class="text-sm text-[var(--text-muted)]">ICP actual</p>
        <div id="ica-score" class="mt-3 h-10 w-20 animate-pulse rounded bg-[var(--bg-base)]"></div>
      </article>
      <article class="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-lg">
        <p class="text-sm text-[var(--text-muted)]">Evaluaciones recibidas</p>
        <div id="eval-count" class="mt-3 h-10 w-20 animate-pulse rounded bg-[var(--bg-base)]"></div>
      </article>
      <article class="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-lg">
        <p class="text-sm text-[var(--text-muted)]">Área</p>
        <div id="eval-area" class="mt-3 h-10 w-20 animate-pulse rounded bg-[var(--bg-base)]"></div>
      </article>
    </section>

    <section id="feedback-list" class="mt-8 grid gap-4"></section>
  </main>
`;

export const setupMyResults = () => {};
