import { navBarComponent } from "../../components/navbar";
import { dropdownComponent, setupDropdown } from "../../components/dropdown";
import { userService } from "../../services/users.service";
import { periodService } from "../../services/periods.service";
import { metricsService } from "../../services/metrics.service";
import { showToast } from "../../components/alerts";

export const renderAiSummary = () => `
  ${navBarComponent()}
  <main class="mx-auto max-w-4xl px-6 py-10">
    <section>
      <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Admin · IA</p>
      <h1 class="mt-1 text-4xl font-black tracking-tight text-[var(--text-main)]">Resumen con IA</h1>
      <p class="mt-4 text-[var(--text-muted)]">Genera un resumen de feedback usando Claude AI a partir de evaluaciones agregadas y anonimizadas.</p>
    </section>

    <section class="mt-8 rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-8 shadow-xl">
      <div id="ai-summary-form" class="grid gap-5">
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="target-user">Persona evaluada</label>
          <select id="target-user" class="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-sm font-medium text-[var(--text-main)] shadow-sm hover:border-[var(--brand-hover)] focus:outline-none focus:ring-4 focus:ring-[var(--border-main)] transition-all duration-200 cursor-pointer">
            <option value="">Cargando personas...</option>
          </select>
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="period">Periodo</label>
          <select id="period" class="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-sm font-medium text-[var(--text-main)] shadow-sm hover:border-[var(--brand-hover)] focus:outline-none focus:ring-4 focus:ring-[var(--border-main)] transition-all duration-200 cursor-pointer">
            <option value="">Cargando periodos...</option>
          </select>
        </div>
        <div class="flex flex-wrap gap-3">
          <button id="generate-btn" disabled
            class="inline-flex items-center justify-center rounded-2xl bg-[var(--brand-bg)] px-5 py-3 text-sm font-bold text-[var(--brand-text)] transition-all duration-300 ease-in-out hover:bg-[var(--brand-hover)] hover:shadow-md hover:cursor-pointer focus:ring-4 focus:ring-[var(--border-main)] disabled:opacity-50 disabled:cursor-not-allowed">
            Cargando...
          </button>
          <button id="generate-all-btn" disabled type="button"
            class="inline-flex items-center justify-center rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] px-5 py-3 text-sm font-bold text-[var(--text-main)] transition-all duration-300 ease-in-out hover:bg-[var(--border-main)] hover:cursor-pointer focus:ring-4 focus:ring-[var(--border-main)] disabled:opacity-50 disabled:cursor-not-allowed">
            Generar para todos (periodo seleccionado)
          </button>
        </div>
      </div>

      <div id="ai-empty" class="mt-8 hidden text-center py-8 text-[var(--text-muted)] text-sm"></div>

      <div id="ai-result" class="mt-8 hidden">
        <hr class="border-[var(--border-main)]" />
        <p class="mt-6 text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Resultado</p>
        <div id="ai-content" class="mt-4 text-[var(--text-main)] leading-8 whitespace-pre-wrap"></div>
      </div>

      <div id="ai-batch-results" class="mt-8 hidden">
        <hr class="border-[var(--border-main)]" />
        <p class="mt-6 text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Generación en lote</p>
        <p id="ai-batch-progress" class="mt-2 text-sm text-[var(--text-muted)]"></p>
        <ul id="ai-batch-list" class="mt-4 flex flex-col gap-2 text-sm"></ul>
      </div>
    </section>
  </main>
`;

export const setupAiSummary = async () => {

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

    const userOptionsHtml = [
      '<option value="">Selecciona una persona...</option>',
      ...evaluables.map(u => `<option value="${u.id}">${u.name} (${u.roles.map(r => r.replace('_', ' ')).join(' / ')})</option>`)
    ].join('');
    targetUserSelect.innerHTML = userOptionsHtml;

    const periodOptionsHtml = [
      '<option value="">Selecciona un periodo...</option>',
      ...periods.map(p => `<option value="${p.id}">${p.name}</option>`)
    ].join('');
    periodSelect.innerHTML = periodOptionsHtml;
    
    const activePeriod = periods.find(p => p.is_active)?.id || '';
    periodSelect.value = activePeriod;

    generateBtn.disabled = false;
    generateBtn.textContent = "Generar resumen";
    generateAllBtn.disabled = false;
  } catch (err) {
    showToast("Error", "error", "No se pudieron cargar las personas o periodos.");
    console.error(err);
    emptyState.textContent = "No se pudieron cargar los datos. Recarga la página para reintentar.";
    emptyState.classList.remove("hidden");
    return;
  }

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
    generateBtn.textContent = "Generando...";

    try {
      const { summary } = await metricsService.getAiSummary(evaluateeId, periodId);
      resultContent.textContent = summary;
      resultSection.classList.remove("hidden");
    } catch (err) {
      showToast("Error", "error", "No se pudo generar el resumen (¿hay suficientes evaluaciones enviadas en ese periodo?).");
      console.error(err);
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = "Generar resumen";
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
      row.innerHTML = `<span>${person.name}</span><span class="text-xs font-semibold text-[var(--text-muted)]">Generando...</span>`;
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
