import { navBarComponent } from "../../components/navbar";
import { showToast } from "../../components/alerts";
import { activityLogService } from "../../services/activityLog.service";
import { escapeHtml } from "../../utils/validators";
import { formatDateTime } from "../../utils/date";
import { emptyStateComponent } from "../../components/emptyState.js";

const ACTION_LABELS = {
  period_opened: "Abrió un ciclo",
  period_closed: "Cerró un ciclo",
  question_text_edited: "Editó el texto de una pregunta",
  question_weights_updated: "Reponderó preguntas",
  category_deleted: "Eliminó una categoría",
};

export const renderActivityLog = () => `
  ${navBarComponent()}
  <main class="mx-auto max-w-4xl px-6 py-10">
    <section>
      <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Admin</p>
      <h1 class="mt-1 text-4xl font-black tracking-tight text-[var(--text-main)]">Registro de Actividad</h1>
      <p class="mt-2 text-sm font-medium text-[var(--text-muted)]">
        Monitoreo de acciones administrativas del sistema.
      </p>
    </section>

    <section id="activity-log-list" aria-live="polite" class="mt-8 flex flex-col gap-3">
      ${Array(4).fill(`
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-[var(--bg-panel)] p-4 shadow-sm border border-[var(--border-main)]">
          <div>
            <div class="h-4 w-48 skeleton-shimmer rounded-sm mb-2"></div>
            <div class="h-3 w-32 skeleton-shimmer rounded-sm"></div>
          </div>
          <div class="flex items-center gap-2">
            <div class="h-6 w-6 skeleton-shimmer rounded-full"></div>
            <div class="h-4 w-24 skeleton-shimmer rounded-sm"></div>
          </div>
        </div>
      `).join("")}
    </section>
  </main>
`;

// Estado de error del contenedor: incluye boton de reintento para no obligar
// a recargar toda la pagina cuando falla la red.
const renderLoadError = () => `
  <div class="text-center py-8 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)]">
    <p class="text-sm text-[var(--danger-text)]">No se pudo cargar el registro.</p>
    <button type="button" id="activity-log-retry"
      class="mt-4 inline-flex items-center justify-center rounded-2xl bg-[var(--brand-bg)] px-5 py-2.5 text-sm font-bold text-[var(--brand-text)] hover:bg-[var(--brand-hover)] transition cursor-pointer focus:ring-4 focus:ring-[var(--border-main)]">
      Reintentar
    </button>
  </div>
`;

export const setupActivityLog = async () => {
  const listContainer = document.getElementById("activity-log-list");
  if (!listContainer) return;

  const load = async () => {
    listContainer.setAttribute("aria-busy", "true");
    try {
      const entries = await activityLogService.getRecent(50);

      if (!entries || entries.length === 0) {
        listContainer.innerHTML = emptyStateComponent(
          "Sin actividad registrada",
          "Las acciones administrativas aparecerán aquí a medida que ocurran."
        );
        return;
      }

      listContainer.innerHTML = entries.map(entry => {
        const label = ACTION_LABELS[entry.action] || entry.action;
        const actor = entry.admin_name || (entry.admin_id ? `Usuario #${entry.admin_id}` : "Desconocido");
        const date = formatDateTime(entry.created_at);

        return `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl bg-[var(--bg-panel)] p-4 shadow-sm border border-gray-100 dark:border-zinc-800">
            <div>
              <p class="text-sm font-bold text-[var(--text-main)]">${escapeHtml(label)}</p>
              <p class="text-xs text-[var(--text-muted)]">${escapeHtml(actor)} ${entry.detail ? `— ${escapeHtml(entry.detail)}` : ""}</p>
            </div>
            <span class="text-xs text-[var(--text-muted)] shrink-0">${escapeHtml(date)}</span>
          </div>
        `;
      }).join("");
    } catch (err) {
      console.error(err);
      showToast("Error", "error", "No se pudo cargar el registro.");
      listContainer.innerHTML = renderLoadError();
      document.getElementById("activity-log-retry")?.addEventListener("click", load);
    } finally {
      listContainer.setAttribute("aria-busy", "false");
    }
  };

  await load();
};
