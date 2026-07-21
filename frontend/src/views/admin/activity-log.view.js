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

    <section id="activity-log-list" class="mt-8 flex flex-col gap-3">
      <div class="h-16 animate-pulse rounded-2xl bg-[var(--bg-panel)]"></div>
      <div class="h-16 animate-pulse rounded-2xl bg-[var(--bg-panel)]"></div>
      <div class="h-16 animate-pulse rounded-2xl bg-[var(--bg-panel)]"></div>
    </section>
  </main>
`;

export const setupActivityLog = async () => {
  const listContainer = document.getElementById("activity-log-list");
  if (!listContainer) return;

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
          <span class="text-xs text-[var(--text-muted)] shrink-0">${date}</span>
        </div>
      `;
    }).join("");
  } catch (err) {
    console.error(err);
    showToast("Error", "error", "No se pudo cargar la bitácora.");
    listContainer.innerHTML = `
      <div class="text-center py-8 text-[var(--danger-text)] text-sm">
        No se pudo cargar la bitácora. Recarga la página para reintentar.
      </div>
    `;
  }
};
