import { settingsService } from "../../services/settings.service.js";
import { showToast, showConfirm } from "../../components/alerts.js";
import { setButtonLoadingState } from "../../utils/formUtils.js";
import { escapeHtml } from "../../utils/validators.js";
import { navBarComponent } from "../../components/navbar.js";

const SAVE_LABEL = "Guardar Cambios";
const RESET_LABEL = "Valores por Defecto";
const EXPORT_LABEL = "Exportar Registro de Auditoría (.csv)";

const NUMBER_INPUT_CLASSES =
  "w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-sm text-[var(--text-main)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors outline-none";

// Switch track: --border-main is the system neutral and already flips in dark.
const TOGGLE_TRACK_CLASSES =
  "h-6 w-11 rounded-full bg-[var(--border-main)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-white after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4";

// The tooltip needs an inverted surface. There is no "inverse" token, but
// --text-main and --bg-panel are already opposites in both themes.
const tooltipIcon = (text) => `
    <span class="group relative inline-flex items-center justify-center ml-1 cursor-help align-middle">
        <svg class="w-4 h-4 text-[var(--text-muted)] hover:text-[var(--brand-bg)] transition-colors" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 w-64 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span class="block rounded-xl bg-[var(--text-main)] px-3 py-2 text-xs font-medium text-[var(--bg-panel)] shadow-xl border border-[var(--border-main)]">
                ${escapeHtml(text)}
                <span class="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--text-main)]"></span>
            </span>
        </span>
    </span>
`;

// Badge for the 3 settings that persist but have NO backend consumer
// (ai_auto_summary, strict_entity_lock, log_retention_days). Shown disabled
// rather than hidden, so the UI does not promise behavior that does not exist.
//
// Not statusBadgeComponent on purpose: it has no "coming soon" state and would
// fall back to NEUTRAL gray, which reads as "off" instead of "not built yet".
const comingSoonBadge = () => `
    <span class="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[var(--warning-bg)] px-2 py-1 text-xs font-medium text-[var(--warning-text)]">
        <span class="h-1.5 w-1.5 rounded-full bg-[var(--warning-dot)]" aria-hidden="true"></span>
        Próximamente
    </span>
`;

// Text explanation of the disabled state: color alone is not accessible.
// The id is tied to the control via aria-describedby.
const comingSoonNote = (id, text) => `
    <p id="${id}" class="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
        <span class="font-bold text-[var(--warning-text)]">Sin funcionalidad todavía:</span>
        ${escapeHtml(text)}
    </p>
`;

// A disabled control must not look clickable.
const DISABLED_CONTROL_CLASSES = "opacity-60 cursor-not-allowed";

const renderLoadingState = () => `
    ${Array(2).fill(`
      <div class="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-sm">
        <div class="flex items-center gap-3 mb-6">
          <div class="h-10 w-10 skeleton-shimmer rounded-xl"></div>
          <div class="h-6 w-48 skeleton-shimmer rounded-sm"></div>
        </div>
        <div class="space-y-6">
          <div class="h-16 skeleton-shimmer rounded-2xl"></div>
          <div class="h-16 skeleton-shimmer rounded-2xl"></div>
          <div class="h-16 skeleton-shimmer rounded-2xl"></div>
        </div>
      </div>
    `).join("")}
`;

const renderErrorState = () => `
    <div class="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-6 text-center">
        <p class="text-sm font-bold text-[var(--danger-text)]">No se pudo cargar la configuración.</p>
        <p class="mt-1 text-xs text-[var(--text-muted)]">Revisa tu conexión e inténtalo de nuevo.</p>
        <button id="btn-retry-settings" type="button" class="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-bg)] px-4 py-2 text-sm font-bold text-[var(--brand-text)] hover:bg-[var(--brand-hover)] transition-colors">
            Reintentar
        </button>
    </div>
`;

const renderForm = (s) => `
  <!-- AI engine -->
  <section class="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-sm hover:border-[var(--brand-bg)]/50 transition-colors duration-300">
    <div class="flex items-center gap-3 mb-6">
      <div class="p-2.5 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl text-purple-500 border border-purple-500/20">
        <svg class="w-6 h-6" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
      </div>
      <h2 class="text-xl font-black text-[var(--text-main)]">Motor de IA (Gemini)</h2>
    </div>

    <div class="space-y-6">
      <div class="group/input rounded-2xl border border-[var(--border-main)] p-4 bg-[var(--bg-base)]/50 hover:bg-[var(--bg-base)] transition-colors">
        <label for="s_ai_temperature" class="flex items-center text-sm font-bold text-[var(--text-main)] mb-1">
          Temperatura de Validación
          ${tooltipIcon('Controla la "creatividad" de la IA. Un valor de 0.0 hace que las respuestas sean muy deterministas y estrictas, ideal para validaciones rigurosas. Un valor cercano a 1.0 permite más flexibilidad y variabilidad en el análisis de las preguntas.')}
        </label>
        <div class="flex items-center gap-4 mt-3">
          <input type="range" id="s_ai_temperature" step="0.1" min="0" max="1" value="${escapeHtml(s.ai_temperature)}" class="w-full h-2 bg-[var(--border-main)] rounded-lg appearance-none cursor-pointer accent-[var(--brand-bg)]">
          <span id="temp_val" class="text-sm font-black text-[var(--brand-bg)] w-8 text-right">${escapeHtml(s.ai_temperature)}</span>
        </div>
      </div>

      <div class="group/input rounded-2xl border border-[var(--border-main)] p-4 bg-[var(--bg-base)]/50">
        <div class="flex items-center justify-between gap-4">
          <div>
            <label for="s_ai_auto_summary" class="flex flex-wrap items-center gap-2 text-sm font-bold text-[var(--text-main)]">
              Auto-generación de Resúmenes
              ${comingSoonBadge()}
              ${tooltipIcon("Ajuste previsto, aún sin implementar. Hoy el sistema NO genera resúmenes automáticamente: no hay tarea programada ni disparo por evento. El único modo de obtener un resumen es que el Admin lo solicite a mano desde la vista de métricas. El valor se guarda, pero no cambia el comportamiento.")}
            </label>
          </div>
          <label class="relative inline-flex items-center ${DISABLED_CONTROL_CLASSES}" aria-label="Auto-generación de Resúmenes">
            <input type="checkbox" id="s_ai_auto_summary" class="peer sr-only" ${s.ai_auto_summary ? "checked" : ""} disabled aria-disabled="true" aria-describedby="note_ai_auto_summary">
            <span class="${TOGGLE_TRACK_CLASSES} peer-checked:bg-[var(--brand-bg)]"></span>
          </label>
        </div>
        ${comingSoonNote(
          "note_ai_auto_summary",
          "no existe generación automática de resúmenes en el backend. El Admin los pide manualmente desde métricas."
        )}
      </div>
    </div>
  </section>

  <!-- Evaluation policies -->
  <section class="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-sm hover:border-blue-500/50 transition-colors duration-300">
    <div class="flex items-center gap-3 mb-6">
      <div class="p-2.5 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-xl text-blue-500 border border-blue-500/20">
        <svg class="w-6 h-6" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </div>
      <h2 class="text-xl font-black text-[var(--text-main)]">Políticas de Evaluación</h2>
    </div>

    <div class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="s_score_risk_threshold" class="flex items-center text-sm font-bold text-[var(--text-main)] mb-1">
              Umbral Riesgo (&lt;)
              ${tooltipIcon("Cualquier puntaje ICP por debajo de este valor se marcará visualmente en rojo como un indicador crítico de desempeño.")}
            </label>
            <input type="number" id="s_score_risk_threshold" step="1" min="0" max="100" value="${escapeHtml(s.score_risk_threshold)}" class="${NUMBER_INPUT_CLASSES}">
          </div>
          <div>
            <label for="s_score_excellent_threshold" class="flex items-center text-sm font-bold text-[var(--text-main)] mb-1">
              Umbral Excelente (&gt;=)
              ${tooltipIcon("Los puntajes ICP iguales o superiores a este valor se marcarán en verde o con medallas de excelencia.")}
            </label>
            <input type="number" id="s_score_excellent_threshold" step="1" min="0" max="100" value="${escapeHtml(s.score_excellent_threshold)}" class="${NUMBER_INPUT_CLASSES}">
          </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="s_weight_tolerance" class="flex items-center text-sm font-bold text-[var(--text-main)] mb-1">
              Tolerancia de Pesos
              ${tooltipIcon("El margen de error decimal aceptado al validar que los porcentajes de un formulario sumen 100%. Ej: 0.01 permite sumar 99.99%.")}
            </label>
            <input type="number" id="s_weight_tolerance" step="0.01" value="${escapeHtml(s.weight_tolerance)}" class="${NUMBER_INPUT_CLASSES}">
          </div>
          <div>
            <label for="s_required_evaluations" class="flex items-center text-sm font-bold text-[var(--text-main)] mb-1">
              N° Respuestas (Min)
              ${tooltipIcon("Cantidad de evaluaciones mínimas requeridas para que las métricas de un usuario sean consideradas estadísticamente válidas y se revelen en los gráficos.")}
            </label>
            <input type="number" id="s_required_evaluations" min="1" value="${escapeHtml(s.required_evaluations)}" class="${NUMBER_INPUT_CLASSES}">
          </div>
      </div>

      <div class="rounded-2xl border border-[var(--border-main)] p-4 bg-[var(--bg-base)]/50 mt-4">
        <div class="flex items-center justify-between gap-4">
          <div>
            <label for="s_strict_entity_lock" class="flex flex-wrap items-center gap-2 text-sm font-bold text-[var(--text-main)]">
              Bloqueo Estricto de Entidades
              ${comingSoonBadge()}
              ${tooltipIcon("El bloqueo está SIEMPRE activo y este interruptor no lo relaja: editar preguntas o pesos con un periodo abierto dejaría las respuestas ya enviadas atadas a un instrumento distinto del que se respondió. Por eso la regla es incondicional y el ajuste no se conecta. El valor se guarda, pero no cambia el comportamiento.")}
            </label>
          </div>
          <label class="relative inline-flex items-center ${DISABLED_CONTROL_CLASSES}" aria-label="Bloqueo Estricto de Entidades">
            <input type="checkbox" id="s_strict_entity_lock" class="peer sr-only" ${s.strict_entity_lock ? "checked" : ""} disabled aria-disabled="true" aria-describedby="note_strict_entity_lock">
            <span class="${TOGGLE_TRACK_CLASSES} peer-checked:bg-[var(--info-dot)]"></span>
          </label>
        </div>
        ${comingSoonNote(
          "note_strict_entity_lock",
          "el bloqueo se aplica siempre, por diseño. Poder desactivarlo permitiría corromper evaluaciones en curso, así que el interruptor no se conecta."
        )}
      </div>
    </div>
  </section>

  <!-- Maintenance and audit -->
  <section class="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-sm lg:col-span-2 hover:border-emerald-500/50 transition-colors duration-300">
    <div class="flex items-center gap-3 mb-6">
      <div class="p-2.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
        <svg class="w-6 h-6" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>
      </div>
      <h2 class="text-xl font-black text-[var(--text-main)]">Mantenimiento y Auditoría</h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
        <div class="group/input">
          <label for="s_log_retention_days" class="flex flex-wrap items-center gap-2 text-sm font-bold text-[var(--text-main)] mb-1">
            Retención de Logs (Días)
            ${comingSoonBadge()}
            ${tooltipIcon('Ajuste previsto, aún sin implementar. Hoy nada purga el "Registro de Actividad": la tabla crece sin límite y ningún registro se elimina por antigüedad. El único tope real es la exportación CSV, que se corta en las 10 000 filas más recientes. El valor se guarda, pero no cambia el comportamiento.')}
          </label>
          <input type="number" id="s_log_retention_days" min="1" value="${escapeHtml(s.log_retention_days)}" disabled aria-disabled="true" aria-describedby="note_log_retention_days" class="w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-sm text-[var(--text-main)] outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
          ${comingSoonNote(
            "note_log_retention_days",
            "ninguna tarea purga el registro todavía; los datos se conservan indefinidamente."
          )}
        </div>

        <div>
            <button id="btn-export-audit" type="button" class="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all shadow-sm">
                <svg class="w-5 h-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                ${EXPORT_LABEL}
            </button>
        </div>
    </div>
  </section>
`;

export const renderAdminSettings = () => `
  ${navBarComponent()}
  <main class="min-h-screen bg-[var(--bg-base)] p-6 transition-all duration-300 ease-in-out">
    <div class="max-w-7xl mx-auto space-y-6 animate-fade-in pb-20">
      <!-- Header -->
      <header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-extrabold text-[var(--text-main)] tracking-tight">Configuración Global</h1>
          <p class="mt-1 text-sm text-[var(--text-muted)]">Ajustes avanzados, motor de IA y políticas de retención.</p>
        </div>
        <div class="flex items-center gap-3">
          <button id="btn-reset-settings" type="button" class="inline-flex items-center gap-2 rounded-2xl bg-[var(--bg-panel)] px-5 py-3 text-sm font-bold text-[var(--text-main)] shadow-sm hover:bg-[var(--bg-base)] transition-all border border-[var(--border-main)]">
            <svg class="w-5 h-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            ${RESET_LABEL}
          </button>
          <button id="btn-save-settings" type="button" class="inline-flex items-center gap-2 rounded-2xl bg-[var(--brand-bg)] px-5 py-3 text-sm font-bold text-[var(--brand-text)] shadow-sm hover:bg-[var(--brand-hover)] transition-all">
            <svg class="w-5 h-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            ${SAVE_LABEL}
          </button>
        </div>
      </header>

      <div id="settings-container" aria-live="polite" aria-busy="true" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          ${renderLoadingState()}
      </div>
    </div>
  </main>
`;

export const setupAdminSettings = () => {
  const container = document.getElementById("settings-container");
  const btnSave = document.getElementById("btn-save-settings");
  const btnReset = document.getElementById("btn-reset-settings");

  let currentSettings = null;

  const loadData = async () => {
    container.setAttribute("aria-busy", "true");
    container.innerHTML = renderLoadingState();
    try {
      currentSettings = await settingsService.getSettings();
      container.innerHTML = renderForm(currentSettings);
    } catch (err) {
      currentSettings = null;
      container.innerHTML = renderErrorState();
    } finally {
      container.setAttribute("aria-busy", "false");
    }
  };

  // Single delegated listener: the container content is replaced on every load,
  // so per-button listeners would need re-registering on each render.
  container.addEventListener("input", (e) => {
    if (e.target.id !== "s_ai_temperature") return;
    const output = document.getElementById("temp_val");
    if (output) output.textContent = e.target.value;
  });

  container.addEventListener("click", async (e) => {
    if (e.target.closest("#btn-retry-settings")) {
      await loadData();
      return;
    }

    const btnExport = e.target.closest("#btn-export-audit");
    if (!btnExport) return;

    setButtonLoadingState(btnExport, true, "Exportando...", EXPORT_LABEL);
    try {
      const blob = await settingsService.downloadActivityLogCsv();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `registro-actividad-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast("Exportación lista", "success", "La descarga del registro de auditoría comenzó.");
    } catch (err) {
      showToast(
        "No se pudo exportar",
        "error",
        err.detail || "El registro de auditoría no está disponible en este momento."
      );
    } finally {
      setButtonLoadingState(btnExport, false, "Exportando...", EXPORT_LABEL);
    }
  });

  btnReset.addEventListener("click", async () => {
    const isConfirmed = await showConfirm(
      "¿Cargar los valores por defecto?",
      "Se traerán los valores de fábrica y se mostrarán en el formulario, reemplazando lo que ves en pantalla. <b>No se guarda nada todavía</b>: podrás revisarlos y, si te convencen, pulsar “Guardar Cambios”.",
      "warning"
    );
    if (!isConfirmed) return;

    setButtonLoadingState(btnReset, true, "Cargando...", RESET_LABEL);
    try {
      // Factory values come from the backend (GET /settings/defaults), not a
      // front-end copy. They are only painted; saving is a separate action.
      const defaults = await settingsService.getDefaults();
      currentSettings = defaults;
      container.innerHTML = renderForm(defaults);
      showToast(
        "Valores por defecto cargados",
        "info",
        "Revisa los cambios y pulsa “Guardar Cambios” para aplicarlos."
      );
    } catch (err) {
      showToast(
        "No se pudieron cargar los valores por defecto",
        "error",
        err.detail || "Inténtalo de nuevo en unos momentos."
      );
    } finally {
      setButtonLoadingState(btnReset, false, "Cargando...", RESET_LABEL);
    }
  });

  btnSave.addEventListener("click", async () => {
    if (!currentSettings) return;

    setButtonLoadingState(btnSave, true, "Guardando...", SAVE_LABEL);

    // The 3 coming-soon settings are disabled, but the payload still sends all
    // 8 fields: disabled blocks interaction, not JS reads, so .checked/.value
    // survive and the backend value is re-persisted unchanged.
    const payload = {
      ai_temperature: parseFloat(document.getElementById("s_ai_temperature").value),
      ai_auto_summary: document.getElementById("s_ai_auto_summary").checked,
      score_risk_threshold: parseFloat(document.getElementById("s_score_risk_threshold").value),
      score_excellent_threshold: parseFloat(document.getElementById("s_score_excellent_threshold").value),
      weight_tolerance: parseFloat(document.getElementById("s_weight_tolerance").value),
      strict_entity_lock: document.getElementById("s_strict_entity_lock").checked,
      required_evaluations: parseInt(document.getElementById("s_required_evaluations").value),
      log_retention_days: parseInt(document.getElementById("s_log_retention_days").value)
    };

    try {
      await settingsService.updateSettings(payload);
      showToast("Configuración Guardada", "success");
      await loadData();
    } catch (err) {
      // The backend validates with Pydantic; a 422 carries the field detail.
      showToast(
        "Error",
        "error",
        err.detail || "No se pudo guardar la configuración."
      );
    } finally {
      setButtonLoadingState(btnSave, false, "Guardando...", SAVE_LABEL);
    }
  });

  loadData();
};
