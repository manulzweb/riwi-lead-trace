import { navBarComponent } from "../../components/navbar";
import { dropdownComponent, setupDropdown } from "../../components/dropdown";
import { userService } from "../../services/users.service";
import { periodService } from "../../services/periods.service";
import { metricsService } from "../../services/metrics.service";
import { showToast } from "../../components/alerts";
import { escapeHtml } from "../../utils/validators";
import { marked } from "marked";
import DOMPurify from "dompurify";

const SPINNER_SVG = `<svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;

export const renderAiSummary = () => `
  ${navBarComponent()}
  <main class="px-6 py-10 transition-all duration-300 ease-in-out">
    <div class="mx-auto max-w-4xl">
    <section>
      <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Admin · IA</p>
      <h1 class="mt-1 text-4xl font-black tracking-tight text-[var(--text-main)]">Resumen con IA</h1>
      <p class="mt-4 text-[var(--text-muted)]">Genera un resumen de feedback usando Gemini a partir de evaluaciones agregadas y anonimizadas.</p>
    </section>

    <section class="mt-8 rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-8 shadow-xl">
      <div id="ai-summary-form" class="grid gap-5">
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="target-user-btn">Persona evaluada</label>
          ${dropdownComponent('target-user', [
  { value: '', label: 'Selecciona una persona...' }
], '')}
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="period-btn">Periodo</label>
          ${dropdownComponent('period', [
  { value: '', label: 'Selecciona un periodo...' }
], '')}
        </div>
        <div class="flex flex-wrap gap-3">
          <button id="generate-btn" disabled
            class="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--brand-bg)] px-5 py-3 text-sm font-bold text-[var(--brand-text)] transition-all duration-300 ease-in-out hover:bg-[var(--brand-hover)] hover:shadow-md hover:cursor-pointer focus:ring-4 focus:ring-[var(--border-main)] disabled:opacity-50 disabled:cursor-not-allowed">
            Cargando...
          </button>
          <button id="generate-all-btn" disabled type="button"
            class="inline-flex items-center justify-center rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] px-5 py-3 text-sm font-bold text-[var(--text-main)] transition-all duration-300 ease-in-out hover:bg-[var(--border-main)] hover:cursor-pointer focus:ring-4 focus:ring-[var(--border-main)] disabled:opacity-50 disabled:cursor-not-allowed">
            Generar para todos (periodo seleccionado)
          </button>
        </div>
      </div>

      <div id="ai-empty" class="mt-8 hidden text-center py-8 text-[var(--text-muted)] text-sm" aria-live="polite"></div>

      <div id="ai-result" class="mt-8 hidden" aria-live="polite">
        <hr class="border-[var(--border-main)]" />
        <p class="mt-6 text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Resultado</p>
        <div id="ai-content" class="mt-4 text-[var(--text-main)] leading-8 markdown-body"></div>
      </div>

      <div id="ai-batch-results" class="mt-8 hidden">
        <hr class="border-[var(--border-main)]" />
        <p class="mt-6 text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Generación en lote</p>
        <p id="ai-batch-progress" class="mt-2 text-sm text-[var(--text-muted)]" aria-live="polite"></p>
        <ul id="ai-batch-list" class="mt-4 flex flex-col gap-2 text-sm"></ul>
      </div>
    </section>
    </div>
  </main>
`;

export const setupAiSummary = async () => {
  setupDropdown('target-user');
  setupDropdown('period');

  const generateBtn = document.getElementById("generate-btn");
  const generateAllBtn = document.getElementById("generate-all-btn");
  const targetUserSelect = document.getElementById("target-user");
  const periodSelect = document.getElementById("period");
  const resultSection = document.getElementById("ai-result");
  const resultContent = document.getElementById("ai-content");
  const emptyState = document.getElementById("ai-empty");
  const batchSection = document.getElementById("ai-batch-results");
  const batchProgress = document.getElementById("ai-batch-progress");
  const batchList = document.getElementById("ai-batch-list");

  if (!generateBtn || !generateAllBtn || !targetUserSelect || !periodSelect || !resultSection || !resultContent || !emptyState) return;

  let evaluables = [];

  // Carga de opciones extraida a una funcion para poder reintentarla desde el
  // boton de error sin recargar la pagina.
  const loadOptions = async () => {
  try {
    const [users, periods] = await Promise.all([userService.get(), periodService.get()]);
    evaluables = users.filter(u => u.roles?.includes("team_leader") || u.roles?.includes("tutor"));

    if (evaluables.length === 0 || periods.length === 0) {
      const missing = evaluables.length === 0 ? "líderes o tutores" : "periodos";
      emptyState.textContent = `No hay ${missing} registrados todavía. Vuelve cuando existan datos para generar un resumen.`;
      emptyState.classList.remove("hidden");
      document.getElementById("ai-summary-form").classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    document.getElementById("ai-summary-form").classList.remove("hidden");

    const userOptions = [
      { value: '', label: 'Selecciona una persona...' },
      ...evaluables.map(u => ({ value: u.id, label: `${u.name} (${u.roles.map(r => r.replace('_', ' ')).join(' / ')})` }))
    ];
    document.getElementById('target-user-container').outerHTML = dropdownComponent('target-user', userOptions, '');
    setupDropdown('target-user');

    const periodOptions = [
      { value: '', label: 'Selecciona un periodo...' },
      ...periods.map(p => ({ value: p.id, label: p.name }))
    ];
    const activePeriod = periods.find(p => p.is_active)?.id || '';
    document.getElementById('period-container').outerHTML = dropdownComponent('period', periodOptions, activePeriod);
    setupDropdown('period');

    generateBtn.disabled = false;
    generateBtn.textContent = "Generar resumen";
    generateAllBtn.disabled = false;
  } catch (err) {
    showToast("Error", "error", "No se pudieron cargar las personas o periodos.");
    console.error(err);
    emptyState.innerHTML = `
      <p class="text-[var(--danger-text)]">No se pudieron cargar las personas o periodos.</p>
      <button type="button" id="ai-options-retry"
        class="mt-4 inline-flex items-center justify-center rounded-2xl bg-[var(--brand-bg)] px-5 py-2.5 text-sm font-bold text-[var(--brand-text)] hover:bg-[var(--brand-hover)] transition cursor-pointer focus:ring-4 focus:ring-[var(--border-main)]">
        Reintentar
      </button>
    `;
    emptyState.classList.remove("hidden");
    document.getElementById("ai-options-retry")?.addEventListener("click", loadOptions);
    return;
  }
  };

  await loadOptions();

  generateBtn.addEventListener("click", async () => {
    // We must query the input value dynamically at click time
    const targetUserInput = document.getElementById("target-user");
    const periodInput = document.getElementById("period");
    const evaluateeId = parseInt(targetUserInput.value);
    const periodId = parseInt(periodInput.value);

    if (!evaluateeId || !periodId) {
      showToast("Falta información", "warning", "Selecciona una persona y un periodo.");
      return;
    }

    resultSection.classList.add("hidden");
    generateBtn.disabled = true;
    generateBtn.innerHTML = `${SPINNER_SVG} <span>Generando...</span>`;

    try {
      const { summary } = await metricsService.getAiSummary(evaluateeId, periodId);
      resultContent.innerHTML = DOMPurify.sanitize(marked.parse(summary));
      resultSection.classList.remove("hidden");
    } catch (err) {
      showToast("Error", "error", "No se pudo generar el resumen (¿hay suficientes evaluaciones enviadas en ese periodo?).");
      console.error(err);
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = "Generar resumen";
    }
  });

  // Genera el resumen de IA para cada tutor/lider evaluable, uno por uno
  // (no en paralelo: evita saturar la API de Claude y respeta el cache de
  // ai_feedback_cache -- si ya existe, la llamada es practicamente inmediata).
  generateAllBtn.addEventListener("click", async () => {
    const periodInput = document.getElementById("period");
    const periodId = parseInt(periodInput.value);

    if (!periodId) {
      showToast("Falta información", "warning", "Selecciona un periodo.");
      return;
    }

    generateBtn.disabled = true;
    generateAllBtn.disabled = true;
    generateAllBtn.textContent = "Generando...";
    resultSection.classList.add("hidden");
    batchSection.classList.remove("hidden");
    batchList.innerHTML = "";

    let ok = 0;
    let failed = 0;
    for (let i = 0; i < evaluables.length; i++) {
      const person = evaluables[i];
      batchProgress.textContent = `Procesando ${i + 1} de ${evaluables.length}: ${person.name}...`;

      const row = document.createElement("li");
      row.className = "flex items-center justify-between rounded-xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-2";
      row.innerHTML = `<span>${escapeHtml(person.name)}</span><span class="text-xs font-semibold text-[var(--text-muted)]">Generando...</span>`;
      batchList.appendChild(row);

      try {
        await metricsService.getAiSummary(person.id, periodId);
        row.querySelector("span:last-child").textContent = "✓ Generado";
        row.querySelector("span:last-child").className = "text-xs font-semibold text-emerald-600 dark:text-emerald-400";
        ok++;
      } catch (err) {
        console.error(err);
        row.querySelector("span:last-child").textContent = "✗ Sin datos suficientes";
        row.querySelector("span:last-child").className = "text-xs font-semibold text-[var(--danger-text)]";
        failed++;
      }
    }

    batchProgress.textContent = `Completado: ${ok} generados, ${failed} sin datos suficientes.`;
    generateBtn.disabled = false;
    generateAllBtn.disabled = false;
    generateAllBtn.textContent = "Generar para todos (periodo seleccionado)";
    showToast("Generación en lote terminada", "success", `${ok}/${evaluables.length} resúmenes generados.`);
  });
};
