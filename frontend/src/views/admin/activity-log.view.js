import { navBarComponent } from "../../components/navbar";
import { showToast } from "../../components/alerts";
import { activityLogService } from "../../services/activityLog.service";
import { escapeHtml } from "../../utils/validators";
import { formatDateTime } from "../../utils/date";
import { emptyStateComponent } from "../../components/emptyState.js";
import { dropdownComponent, setupDropdown } from "../../components/dropdown.js";
import { setupPagination } from "../../components/pagination.js";

const ACTION_LABELS = {
  period_opened: "Abrió un ciclo",
  period_closed: "Cerró un ciclo",
  question_text_edited: "Editó el texto de una pregunta",
  question_weights_updated: "Reponderó preguntas",
  category_deleted: "Eliminó una categoría",
};

export const renderActivityLog = () => `
  ${navBarComponent()}
  <main class="px-6 py-10 transition-all duration-300 ease-in-out">
    <div class="mx-auto max-w-4xl">
    <section class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Admin</p>
        <h1 class="mt-1 text-4xl font-black tracking-tight text-[var(--text-main)]">Registro de Actividad</h1>
        <p class="mt-2 text-sm font-medium text-[var(--text-muted)]">
          Monitoreo de acciones administrativas del sistema.
        </p>
      </div>
    </section>

    <section class="mt-8 flex flex-col sm:flex-row gap-4 items-center">
      <input type="text" id="search-log" placeholder="Buscar por usuario o detalle..." class="w-full sm:w-2/3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--brand-bg)] transition-colors">
      <div class="w-full sm:w-1/3 z-10 relative">
        ${dropdownComponent(
          "filter-action",
          [
            { value: "all", label: "Todas las acciones" },
            ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label }))
          ],
          "all",
          "Todas las acciones"
        )}
      </div>
    </section>

    <section id="activity-log-list" aria-live="polite" class="mt-6 flex flex-col gap-3 min-h-[400px]">
      ${Array(5).fill(`
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
    </div>
  </main>
`;

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
  const searchInput = document.getElementById("search-log");
  const filterAction = document.getElementById("filter-action");
  
  setupDropdown("filter-action");

  if (!listContainer) return;

  let allEntries = [];
  let filteredEntries = [];
  let paginationInstance = null;

  const renderList = () => {
    if (paginationInstance) {
      paginationInstance.updateData(filteredEntries);
      return;
    }

    paginationInstance = setupPagination({
      data: filteredEntries,
      itemsPerPage: 10,
      container: listContainer,
      emptyStateHtml: emptyStateComponent(
        "Sin resultados",
        "No se encontraron acciones que coincidan con la búsqueda."
      ),
      renderItem: (entry) => {
        const label = ACTION_LABELS[entry.action] || entry.action;
        const actor = entry.admin_name || (entry.admin_id ? `Usuario #${entry.admin_id}` : "Desconocido");
        const date = formatDateTime(entry.created_at);

        return `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl bg-[var(--bg-panel)] p-4 shadow-sm border border-[var(--border-main)] hover:border-[var(--brand-bg)]/30 transition-colors">
            <div>
              <p class="text-sm font-bold text-[var(--text-main)]">${escapeHtml(label)}</p>
              <p class="text-xs text-[var(--text-muted)]">${escapeHtml(actor)} ${entry.detail ? `— ${escapeHtml(entry.detail)}` : ""}</p>
            </div>
            <span class="text-xs font-medium text-[var(--text-muted)] shrink-0 bg-[var(--bg-base)] px-2 py-1 rounded-md">${escapeHtml(date)}</span>
          </div>
        `;
      }
    });
  };

  const applyFilters = () => {
    const term = searchInput.value.toLowerCase();
    const action = filterAction.value;

    filteredEntries = allEntries.filter(entry => {
      const actor = (entry.admin_name || "").toLowerCase();
      const detail = (entry.detail || "").toLowerCase();
      const matchesSearch = actor.includes(term) || detail.includes(term);
      const matchesAction = action === "all" || entry.action === action;
      return matchesSearch && matchesAction;
    });

    renderList();
  };

  searchInput.addEventListener("input", applyFilters);
  filterAction.addEventListener("change", applyFilters);

  const load = async () => {
    listContainer.setAttribute("aria-busy", "true");
    try {
      allEntries = await activityLogService.getRecent(100);

      if (!allEntries || allEntries.length === 0) {
        listContainer.innerHTML = emptyStateComponent(
          "Sin actividad registrada",
          "Las acciones administrativas aparecerán aquí a medida que ocurran."
        );
        return;
      }

      applyFilters();
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
