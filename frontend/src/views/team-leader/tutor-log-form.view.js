import { navBarComponent } from "../../components/navbar";

export const renderTutorLogForm = () => `
  ${navBarComponent()}
  <main class="mx-auto max-w-3xl px-6 py-10">
    <section class="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-8 shadow-xl">
      <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Bitácora</p>
      <h1 class="mt-2 text-4xl font-black tracking-tight text-[var(--text-main)]">Nueva entrada</h1>
      <p class="mt-4 text-[var(--text-muted)]">Registra una observación sobre el desempeño de un tutor.</p>

      <form id="log-form" class="mt-8 grid gap-5">
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="tutor">Tutor</label>
          <select id="tutor"
            class="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:outline-none">
            <option value="">Selecciona un tutor...</option>
          </select>
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="log-note">Observación</label>
          <textarea id="log-note" rows="5" placeholder="Describe el comportamiento o situación observada..."
            class="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-hover)] focus:outline-none resize-none"></textarea>
          <p id="note-error" class="mt-1 text-sm text-red-600 hidden">La observación no puede estar vacía.</p>
        </div>

        <div class="flex gap-3">
          <button id="save-btn" type="submit"
            class="inline-flex items-center justify-center rounded-2xl bg-[var(--brand-bg)] px-5 py-3 text-sm font-bold text-[var(--brand-text)] transition-all duration-300 ease-in-out hover:bg-[var(--brand-hover)] hover:shadow-md hover:cursor-pointer focus:ring-4 focus:ring-[var(--border-main)]">
            Guardar entrada
          </button>
          <a href="/tutor-logs"
            class="inline-flex items-center justify-center rounded-2xl border border-[var(--border-main)] bg-[var(--bg-panel)] px-5 py-3 text-sm font-bold text-[var(--brand-bg)] hover:bg-[var(--bg-base)] transition-colors">
            Cancelar
          </a>
        </div>
      </form>
    </section>
  </main>
`;

export const setupTutorLogForm = () => {
  const form    = document.getElementById("log-form");
  const saveBtn = document.getElementById("save-btn");
  if (!form || !saveBtn) return;

  form.addEventListener("submit", (e) => e.preventDefault());
};
