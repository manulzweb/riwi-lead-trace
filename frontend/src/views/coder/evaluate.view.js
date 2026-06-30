import { navBarComponent } from "../../components/navbar";

export const renderEvaluate = () => `
  ${navBarComponent()}
  <main class="mx-auto max-w-3xl px-6 py-10">
    <section class="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-8 shadow-xl">
      <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Evaluación</p>
      <h1 class="mt-2 text-4xl font-black tracking-tight text-[var(--text-main)]">Nueva evaluación</h1>
      <p class="mt-4 text-[var(--text-muted)]">Completa el formulario para evaluar a tu Team Leader o Tutor.</p>

      <form id="evaluate-form" class="mt-8 grid gap-5">
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="target-role">¿A quién evalúas?</label>
          <select id="target-role"
            class="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:outline-none">
            <option value="">Selecciona un rol...</option>
            <option value="team_leader">Team Leader</option>
            <option value="tutor">Tutor</option>
          </select>
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="evaluatee">Persona a evaluar</label>
          <select id="evaluatee" disabled
            class="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:outline-none disabled:cursor-not-allowed disabled:text-[var(--text-muted)]">
            <option value="">Primero selecciona un rol...</option>
          </select>
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="area">Área</label>
          <select id="area"
            class="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:outline-none">
            <option value="">Selecciona un área...</option>
          </select>
        </div>

        <div id="questions-container" class="grid gap-4"></div>

        <label class="flex items-center gap-3 cursor-pointer">
          <input id="is-anonymous" type="checkbox" class="h-4 w-4 rounded border-[var(--border-main)] accent-[var(--brand-bg)]" />
          <span class="text-sm font-medium text-[var(--text-main)]">Enviar de forma anónima</span>
        </label>

        <button id="submit-btn" type="submit"
          class="inline-flex items-center justify-center rounded-2xl bg-[var(--brand-bg)] px-5 py-3 text-sm font-bold text-[var(--brand-text)] transition-all duration-300 ease-in-out hover:bg-[var(--brand-hover)] hover:shadow-md hover:cursor-pointer focus:ring-4 focus:ring-[var(--border-main)]">
          Enviar evaluación
        </button>
      </form>
    </section>
  </main>
`;

export const setupEvaluate = () => {
  const form       = document.getElementById("evaluate-form");
  const submitBtn  = document.getElementById("submit-btn");
  const targetRole = document.getElementById("target-role");
  const evaluatee  = document.getElementById("evaluatee");
  if (!form || !submitBtn || !targetRole || !evaluatee) return;

  targetRole.addEventListener("change", () => {
    evaluatee.disabled = !targetRole.value;
  });

  form.addEventListener("submit", (e) => e.preventDefault());
};
