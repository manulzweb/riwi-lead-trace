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
      <div class="grid gap-5">
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="target-user">Persona evaluada</label>
          ${dropdownComponent('target-user', [
  { value: '', label: 'Selecciona una persona...' }
], '')}
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="period">Periodo</label>
          ${dropdownComponent('period', [
  { value: '', label: 'Selecciona un periodo...' }
], '')}
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

export const setupAiSummary = async () => {
  setupDropdown('target-user');
  setupDropdown('period');

  const generateBtn = document.getElementById("generate-btn");
  const targetUserSelect = document.getElementById("target-user");
  const periodSelect = document.getElementById("period");
  const resultSection = document.getElementById("ai-result");
  const resultContent = document.getElementById("ai-content");

  if (!generateBtn || !targetUserSelect || !periodSelect || !resultSection || !resultContent) return;

  try {
    const [users, periods] = await Promise.all([userService.get(), periodService.get()]);
    const evaluables = users.filter(u => u.role === "team_leader" || u.role === "tutor");

    targetUserSelect.innerHTML = '<option value="">Selecciona una persona...</option>' +
      evaluables.map(u => `<option value="${u.id}">${u.name} (${u.role.replace('_', ' ')})</option>`).join("");

    periodSelect.innerHTML = '<option value="">Selecciona un periodo...</option>' +
      periods.map(p => `<option value="${p.id}" ${p.is_active ? "selected" : ""}>${p.name}</option>`).join("");
  } catch (err) {
    showToast("Error", "error", "No se pudieron cargar las personas o periodos.");
    console.error(err);
    return;
  }

  generateBtn.addEventListener("click", async () => {
    const evaluateeId = parseInt(targetUserSelect.value);
    const periodId = parseInt(periodSelect.value);

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
};
