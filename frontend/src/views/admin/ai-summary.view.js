import { navBarComponent } from "../../components/navbar";

export const renderAiSummary = () => `
  ${navBarComponent()}
  <main class="mx-auto max-w-4xl px-6 py-10">
    <section>
      <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Admin · IA</p>
      <h1 class="mt-1 text-4xl font-black tracking-tight text-[var(--text-main)]">Resumen con IA</h1>
      <p class="mt-4 text-[var(--text-muted)]">Genera un resumen de feedback usando Claude AI a partir de evaluaciones agregadas y anonimizadas.</p>
    </section>

    <section class="mt-8 rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-8 shadow-xl">
      <div class="grid gap-5">
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="target-user">Persona evaluada</label>
          <select id="target-user"
            class="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:outline-none">
            <option value="">Selecciona una persona...</option>
          </select>
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="period">Periodo</label>
          <select id="period"
            class="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:outline-none">
            <option value="">Selecciona un periodo...</option>
          </select>
        </div>
        <button id="generate-btn"
          class="inline-flex items-center justify-center rounded-2xl bg-[var(--brand-bg)] px-5 py-3 text-sm font-bold text-[var(--brand-text)] transition-all duration-300 ease-in-out hover:bg-[var(--brand-hover)] hover:shadow-md hover:cursor-pointer focus:ring-4 focus:ring-[var(--border-main)]">
          Generar resumen
        </button>
      </div>

      <div id="ai-result" class="mt-8 hidden">
        <hr class="border-[var(--border-main)]" />
        <p class="mt-6 text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Resultado</p>
        <div id="ai-content" class="mt-4 text-[var(--text-main)] leading-8 whitespace-pre-wrap"></div>
      </div>
    </section>
  </main>
`;

export const setupAiSummary = () => {
  const generateBtn = document.getElementById("generate-btn");
  if (!generateBtn) return;

  generateBtn.addEventListener("click", () => {});
};
