import { navBarComponent } from "../../components/navbar";
import { statusBadgeComponent } from "../../components/statusBadge.js";
import { showToast, showConfirm } from "../../components/alerts";
import { periodService } from "../../services/periods.service.js";
import { formsService } from "../../services/forms.service.js";
import { escapeHtml } from "../../utils/validators";
import { modalComponent, setupModal } from "../../components/modal";
import { authService } from "../../services/auth.service";
import { searchBoxComponent, setupSearch } from "../../components/searchBox";
import { emptyStateComponent } from "../../components/emptyState.js";
import { setupPagination } from "../../components/pagination";
import { z } from "zod";

// Modal input classes extracted so the same string is not repeated across the
// three fields (DRY) and the color tokens live in one place.
const INPUT_CLASSES = "w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-sm text-[var(--text-main)] transition-all focus:border-[var(--brand-bg)] focus:bg-[var(--bg-panel)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-bg)]/10";

// List error state: offers a retry instead of a page reload. The button
// listener is wired up in loadPeriods().
const renderPeriodsError = () => `
  <div class="text-center py-8">
    <p class="text-[var(--danger-text)] text-sm">No se pudieron cargar los periodos.</p>
    <button id="btn-retry-periods" class="mt-4 rounded-xl bg-[var(--brand-bg)] px-5 py-2.5 text-sm font-bold text-[var(--brand-text)] transition-all hover:bg-[var(--brand-hover)] cursor-pointer">Reintentar</button>
  </div>
`;

export const renderAdminPeriods = () => `
  ${navBarComponent()}
  <main class="px-6 py-10 relative transition-all duration-300 ease-in-out">
    <div class="mx-auto max-w-6xl">
    
    <section class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Admin</p>
        <h1 class="mt-1 text-4xl font-black font-heading tracking-tight text-[var(--text-main)]">Periodos de Evaluación</h1>
        <p class="mt-4 text-[var(--text-muted)]">Abre o cierra ventanas de tiempo para que el equipo comience a evaluar.</p>
      </div>
      <button id="btn-create-period" class="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--brand-bg)] px-6 py-3 text-sm font-bold text-[var(--brand-text)] transition-all duration-300 ease-in-out hover:bg-[var(--brand-hover)] hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
        <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Nuevo Periodo
      </button>
    </section>

    <!-- New period modal -->
    ${modalComponent({
      id: "period-modal",
      title: "Abrir Nuevo Periodo",
      children: `
        <form id="form-period">
          <div class="mb-4">
            <label for="period-name" class="mb-2 block text-sm font-semibold text-[var(--text-main)]">Nombre del Periodo</label>
            <input required id="period-name" type="text" placeholder="Ej. Q3 2026 o Julio 2026" class="${INPUT_CLASSES}" />
          </div>
          <div class="mb-4">
            <label for="period-start" class="mb-2 block text-sm font-semibold text-[var(--text-main)]">Fecha de Inicio</label>
            <input required id="period-start" type="date" class="${INPUT_CLASSES}" />
          </div>
          <div class="mb-4">
            <label for="period-end" class="mb-2 block text-sm font-semibold text-[var(--text-main)]">Fecha de Fin</label>
            <input required id="period-end" type="date" class="${INPUT_CLASSES}" />
          </div>
          <div class="mb-4">
            <label for="active-tutor-form" class="mb-2 block text-sm font-semibold text-[var(--text-main)]">Formulario Activo para Tutores</label>
            <select id="active-tutor-form" class="${INPUT_CLASSES}"></select>
          </div>
          <div class="mb-6">
            <label for="active-leader-form" class="mb-2 block text-sm font-semibold text-[var(--text-main)]">Formulario Activo para Team Leaders</label>
            <select id="active-leader-form" class="${INPUT_CLASSES}"></select>
          </div>
          <div class="flex items-center gap-3">
            <button type="button" id="btn-cancel-period" class="w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-panel)] py-3 font-semibold text-[var(--text-muted)] transition-all hover:bg-[var(--bg-base)] hover:text-[var(--text-main)] cursor-pointer">Cancelar</button>
            <button type="submit" class="w-full rounded-xl bg-[var(--brand-bg)] py-3 font-bold text-[var(--brand-text)] transition-all hover:bg-[var(--brand-hover)] cursor-pointer">Guardar</button>
          </div>
        </form>
      `,
    })}

    <div id="period-search-slot" class="mt-8 max-w-sm"></div>

    <section id="periods-list" aria-live="polite" class="flex flex-col gap-4">
      ${Array(2).fill(`
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-[var(--bg-panel)] p-5 shadow-sm border border-[var(--border-main)]">
          <div class="w-full sm:w-1/2">
            <div class="flex items-center gap-3 mb-2">
              <div class="h-6 w-48 skeleton-shimmer rounded-md"></div>
              <div class="h-5 w-20 skeleton-shimmer rounded-full"></div>
            </div>
            <div class="flex gap-2 mt-3">
              <div class="h-4 w-28 skeleton-shimmer rounded-sm"></div>
              <div class="h-4 w-28 skeleton-shimmer rounded-sm"></div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="h-8 w-16 skeleton-shimmer rounded-lg"></div>
            <div class="h-8 w-24 skeleton-shimmer rounded-lg"></div>
            <div class="h-8 w-8 skeleton-shimmer rounded-lg"></div>
          </div>
        </div>
      `).join("")}
    </section>

    </div>
  </main>
`;

export const setupAdminPeriods = () => {
  const modalTitle = document.getElementById("period-modal-title");
  const btnCreate = document.getElementById("btn-create-form") || document.getElementById("btn-create-period");
  const btnCancel = document.getElementById("btn-cancel-period");
  const form = document.getElementById("form-period");
  const listContainer = document.getElementById("periods-list");
  const submitBtn = form.querySelector("button[type='submit']");

  let editPeriodId = null;
  let allPeriods = [];
  let currentFilteredPeriods = [];
  let paginationInstance = null;

  const { open: openModal, close: closeModal } = setupModal("period-modal", {
    onClose: () => {
      form.reset();
      editPeriodId = null;
    },
  });

  const populateFormSelectors = async () => {
    const tutorSelect = document.getElementById("active-tutor-form");
    const leaderSelect = document.getElementById("active-leader-form");
    if (!tutorSelect || !leaderSelect) return;

    try {
      tutorSelect.innerHTML = '<option value="">Cargando formularios...</option>';
      leaderSelect.innerHTML = '<option value="">Cargando formularios...</option>';

      const forms = await formsService.getForms(null, 'all');
      const liveForms = forms.filter(f => !f.is_template && !f.archived_at);

      const tutorForms = liveForms.filter(f => f.targetRole === "tutor");
      const leaderForms = liveForms.filter(f => f.targetRole === "team_leader");

      if (tutorForms.length === 0) {
        tutorSelect.innerHTML = '<option value="">No hay formularios vivos de Tutor</option>';
      } else {
        tutorSelect.innerHTML = tutorForms.map(f => `
          <option value="${f.id}" ${f.is_active ? 'selected' : ''}>
            ${escapeHtml(f.title)} ${f.is_active ? '(Activo actualmente)' : ''}
          </option>
        `).join('');
      }

      if (leaderForms.length === 0) {
        leaderSelect.innerHTML = '<option value="">No hay formularios vivos de Team Leader</option>';
      } else {
        leaderSelect.innerHTML = leaderForms.map(f => `
          <option value="${f.id}" ${f.is_active ? 'selected' : ''}>
            ${escapeHtml(f.title)} ${f.is_active ? '(Activo actualmente)' : ''}
          </option>
        `).join('');
      }

    } catch (err) {
      console.error(err);
      tutorSelect.innerHTML = '<option value="">Error al cargar formularios</option>';
      leaderSelect.innerHTML = '<option value="">Error al cargar formularios</option>';
    }
  };

  const openCreateModal = async (e) => {
    editPeriodId = null;
    modalTitle.textContent = "Abrir Nuevo Periodo";
    submitBtn.textContent = "Guardar";
    form.reset();

    const tutorSelect = document.getElementById("active-tutor-form");
    const leaderSelect = document.getElementById("active-leader-form");
    if (tutorSelect) tutorSelect.disabled = false;
    if (leaderSelect) leaderSelect.disabled = false;

    openModal(e?.currentTarget);
    await populateFormSelectors();
  };

  const openEditModal = async (period, triggerEl) => {
    editPeriodId = period.id;
    modalTitle.textContent = "Editar Periodo";
    submitBtn.textContent = "Guardar Cambios";
    document.getElementById("period-name").value = period.name;
    document.getElementById("period-start").value = period.starts_at;
    document.getElementById("period-end").value = period.ends_at;

    const tutorSelect = document.getElementById("active-tutor-form");
    const leaderSelect = document.getElementById("active-leader-form");
    if (tutorSelect) tutorSelect.disabled = !!period.is_active;
    if (leaderSelect) leaderSelect.disabled = !!period.is_active;

    openModal(triggerEl);
    await populateFormSelectors();
  };

  if (btnCreate) btnCreate.addEventListener("click", openCreateModal);
  if (btnCancel) btnCancel.addEventListener("click", closeModal);

  const applyFiltersAndRender = () => {
    renderPeriodsList(currentFilteredPeriods);
  };

  const renderPeriodsList = (list) => {
    currentFilteredPeriods = list;
    
    if (paginationInstance) {
      paginationInstance.updateData(list);
      return;
    }

    paginationInstance = setupPagination({
      data: list,
      itemsPerPage: 5,
      container: listContainer,
      emptyStateHtml: emptyStateComponent(
        allPeriods.length === 0 ? "No hay periodos" : "Sin resultados",
        allPeriods.length === 0 ? "Abre un nuevo periodo para que tu equipo empiece a evaluar." : "Ningún periodo coincide con la búsqueda."
      ),
      renderItem: (p) => {
        const statusBadge = p.is_active 
          ? statusBadgeComponent({ variant: "dot", status: "Activa" }) 
          : statusBadgeComponent({ variant: "dot", status: "Cerrado" });
          
        const actionBtn = `
          <div class="flex items-center gap-2 mr-2">
            <span class="text-xs font-bold text-[var(--text-muted)] select-none">Activo:</span>
            <label class="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" class="input-toggle-period peer sr-only" data-id="${p.id}" ${p.is_active ? 'checked' : ''} />
              <div class="h-6 w-11 rounded-full bg-[var(--border-main)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-white after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-checked:bg-[var(--brand-bg)]"></div>
            </label>
          </div>
        `;

        return `
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-[var(--bg-panel)] p-5 shadow-sm border border-[var(--border-main)] transition-all hover:shadow-md">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <h3 class="font-bold text-[var(--text-main)] text-lg">${escapeHtml(p.name)}</h3>
                ${statusBadge}
              </div>
              <p class="text-sm text-[var(--text-muted)] font-medium">
                <span class="inline-block mr-2"><strong>Inicio:</strong> ${p.starts_at}</span>
                <span class="inline-block"><strong>Fin:</strong> ${p.ends_at}</span>
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button class="btn-edit-period rounded-lg px-4 py-2 text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-base)] hover:bg-[var(--border-main)] transition-colors cursor-pointer" data-id="${p.id}" title="Editar periodo">
                Editar
              </button>
              ${actionBtn}
              <button class="btn-delete-period p-2 text-[var(--text-muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)] rounded-lg transition-colors cursor-pointer" data-id="${p.id}" title="Eliminar periodo">
                <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>
        `;
      },
      onRenderCompleted: () => {
        // Open/close switches
        document.querySelectorAll(".input-toggle-period").forEach(toggle => {
          toggle.addEventListener("change", async (e) => {
            const id = parseInt(e.target.dataset.id);
            const newStatus = e.target.checked;
            
            const warningMsg = newStatus 
              ? "¿Estás seguro de que deseas activar este periodo? Esto desactivará cualquier otro periodo de evaluación que esté actualmente activo."
              : "¿Estás seguro de que deseas desactivar este periodo? Las evaluaciones pendientes de los coders se pausarán/bloquearán.";

            if (!(await showConfirm("Confirmación", warningMsg, "warning"))) {
              e.target.checked = !newStatus;
              return;
            }

            // Optimistic UI
            const originalPeriods = [...allPeriods];
            const periodIndex = allPeriods.findIndex(p => p.id === id);
            if (periodIndex !== -1) {
              if (newStatus) {
                allPeriods.forEach(p => p.is_active = false);
              }
              allPeriods[periodIndex].is_active = newStatus;
              renderPeriodsList(allPeriods);
            }

            try {
              await periodService.update(id, { is_active: newStatus, admin_id: authService.getSession()?.id });
              showToast(newStatus ? "Periodo Abierto Exitosamente" : "Periodo Cerrado", "success");
              loadPeriods(); 
            } catch (error) {
              // Rollback
              allPeriods = originalPeriods;
              renderPeriodsList(allPeriods);
              showToast("Error al cambiar estado", "error");
            }
          });
        });

        // Edit button
        document.querySelectorAll(".btn-edit-period").forEach(btn => {
          btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            const period = allPeriods.find(p => p.id === id);
            if (period) openEditModal(period, btn);
          });
        });

        // Delete button
        document.querySelectorAll(".btn-delete-period").forEach(btn => {
          btn.addEventListener("click", async (e) => {
            const id = e.currentTarget.dataset.id;
            if (!(await showConfirm("¿Estás seguro de que deseas eliminar este periodo? Esta acción no se puede deshacer."))) return;

            // Optimistic UI
            const originalPeriods = [...allPeriods];
            allPeriods = allPeriods.filter(p => p.id != id);
            renderPeriodsList(allPeriods);

            try {
              await periodService.remove(id);
              showToast("Periodo eliminado", "success");
              loadPeriods();
            } catch (error) {
              // Rollback
              allPeriods = originalPeriods;
              renderPeriodsList(allPeriods);

              const msg = error?.status === 409
                ? "No se puede eliminar: ya hay evaluaciones registradas en este periodo."
                : "Error al eliminar el periodo.";
              showToast(msg, "error");
            }
          });
        });
      }
    });
  };

  const searchSlot = document.getElementById("period-search-slot");

  const loadPeriods = async () => {
    try {
      allPeriods = await periodService.get();
      renderPeriodsList(allPeriods);
      // Regenerated on each load so listeners from previous versions do not
      // pile up: the input node lives outside listContainer.
      if (searchSlot) {
        searchSlot.innerHTML = searchBoxComponent('period-search', 'Buscar periodo por nombre...');
        setupSearch('period-search', allPeriods, ['name'], renderPeriodsList);
      }
    } catch (error) {
      console.error(error);
      showToast("No se pudieron cargar los periodos", "error");
      listContainer.innerHTML = renderPeriodsError();
      document.getElementById("btn-retry-periods")?.addEventListener("click", loadPeriods);
    }
  };

  // Create or edit a period
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      name: document.getElementById("period-name").value.trim(),
      starts_at: document.getElementById("period-start").value,
      ends_at: document.getElementById("period-end").value,
      is_active: true // active by default on create; ignored optimistically on edit
    };

    // Zod validation
    const periodSchema = z.object({
      name: z.string().min(3, "El nombre debe tener al menos 3 caracteres").max(100, "Nombre demasiado largo"),
      starts_at: z.string().min(1, "La fecha de inicio es requerida"),
      ends_at: z.string().min(1, "La fecha de fin es requerida")
    }).superRefine((val, ctx) => {
      const start = new Date(val.starts_at);
      const end = new Date(val.ends_at);
      if (end <= start) {
        ctx.addIssue({ code: "custom", message: "La fecha de fin debe ser posterior a la fecha de inicio", path: ["ends_at"] });
      }
    });

    const validation = periodSchema.safeParse(data);
    if (!validation.success) {
      showToast("Datos inválidos", "warning", validation.error.issues[0].message);
      return;
    }

    const tutorFormId = document.getElementById("active-tutor-form")?.value;
    const leaderFormId = document.getElementById("active-leader-form")?.value;

    const originalPeriods = [...allPeriods];

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = "Guardando...";

      // Pre-requisito: Activar los cuestionarios seleccionados en el backend
      if (tutorFormId) {
        await formsService.activateForm(tutorFormId);
      }
      if (leaderFormId) {
        await formsService.activateForm(leaderFormId);
      }

      if (editPeriodId) {
        await periodService.update(editPeriodId, data);
        showToast("Periodo Actualizado Exitosamente", "success");
      } else {
        await periodService.create(data);
        showToast("Periodo Creado Exitosamente", "success");
      }
      closeModal();
      loadPeriods();
    } catch (error) {
      console.error(error);
      const msg = error?.detail || (editPeriodId ? "Error al actualizar periodo" : "Error al crear periodo");
      showToast(msg, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = editPeriodId ? "Guardar Cambios" : "Guardar";
    }
  });

  loadPeriods();
};
