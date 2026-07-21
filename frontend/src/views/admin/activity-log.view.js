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
      <h1 class="mt-1 text-4xl font-black tracking-tight text-[var(--text-main)]">Bitácora de actividad</h1>
      <p class="mt-4 text-[var(--text-muted)]">
        Últimas acciones administrativas: abrir/cerrar ciclos, editar preguntas y eliminar categorías.
        Registro de conveniencia -- sin JWT, la identidad de quien actuó no está verificada criptográficamente.
      </p>
    </section>

    <section id="activity-log-list" class="mt-8 flex flex-col gap-3" aria-live="polite" aria-busy="true">
      <div class="h-16 skeleton-shimmer rounded-2xl"></div>
      <div class="h-16 skeleton-shimmer rounded-2xl"></div>
      <div class="h-16 skeleton-shimmer rounded-2xl"></div>
    </section>
  </main>
`;

// Estado de error del contenedor: incluye boton de reintento para no obligar
// a recargar toda la pagina cuando falla la red.
const renderLoadError = () => `
  <div class="text-center py-8 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)]">
    <p class="text-sm text-[var(--danger-text)]">No se pudo cargar la bitácora.</p>
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
      showToast("Error", "error", "No se pudo cargar la bitácora.");
      listContainer.innerHTML = renderLoadError();
      document.getElementById("activity-log-retry")?.addEventListener("click", load);
    } finally {
      listContainer.setAttribute("aria-busy", "false");
    }
  };

  await load();
};
