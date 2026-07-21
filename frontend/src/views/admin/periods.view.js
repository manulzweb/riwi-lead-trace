import { navBarComponent } from "../../components/navbar";
import { statusBadgeComponent } from "../../components/statusBadge.js";
import { showToast, showConfirm } from "../../components/alerts";
import { periodService } from "../../services/periods.service.js";
import { escapeHtml } from "../../utils/validators";
import { setupModalA11y } from "../../utils/modalA11y";
import { authService } from "../../services/auth.service";
import { searchBoxComponent, setupSearch } from "../../components/searchBox";
import { emptyStateComponent } from "../../components/emptyState.js";
import { z } from "zod";

// Clases del input del modal, extraidas para no repetir la misma cadena en los
// tres campos (DRY) y para que los tokens de color queden en un solo sitio.
const INPUT_CLASSES = "w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-sm text-[var(--text-main)] transition-all focus:border-[var(--brand-bg)] focus:bg-[var(--bg-panel)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-bg)]/10";

// Estado de error del listado: ofrece reintentar en vez de pedir recargar la
// pagina. El listener del boton se engancha en loadPeriods().
const renderPeriodsError = () => `
  <div class="text-center py-8">
    <p class="text-[var(--danger-text)] text-sm">No se pudieron cargar los ciclos.</p>
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
        <h1 class="mt-1 text-4xl font-black font-heading tracking-tight text-[var(--text-main)]">Ciclos de Evaluación</h1>
        <p class="mt-4 text-[var(--text-muted)]">Abre o cierra ventanas de tiempo para que el equipo comience a evaluar.</p>
      </div>
      <button id="btn-create-period" class="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--brand-bg)] px-6 py-3 text-sm font-bold text-[var(--brand-text)] transition-all duration-300 ease-in-out hover:bg-[var(--brand-hover)] hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
        <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Nuevo Ciclo
      </button>
    </section>

    <!-- Modal Form for New Period -->
    <div id="period-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm hidden opacity-0 transition-opacity duration-300">
      <div role="dialog" aria-modal="true" aria-labelledby="period-modal-title" class="w-full max-w-md scale-95 transform rounded-3xl bg-[var(--bg-panel)] p-8 shadow-2xl transition-transform duration-300 border border-[var(--border-main)]">
        <h2 id="period-modal-title" class="mb-6 text-2xl font-bold font-heading text-[var(--text-main)]">Abrir Nuevo Ciclo</h2>
        <form id="form-period">
          <div class="mb-4">
            <label for="period-name" class="mb-2 block text-sm font-semibold text-[var(--text-main)]">Nombre del Ciclo</label>
            <input required id="period-name" type="text" placeholder="Ej. Q3 2026 o Julio 2026" class="${INPUT_CLASSES}" />
          </div>
          <div class="mb-4">
            <label for="period-start" class="mb-2 block text-sm font-semibold text-[var(--text-main)]">Fecha de Inicio</label>
            <input required id="period-start" type="date" class="${INPUT_CLASSES}" />
          </div>
          <div class="mb-6">
            <label for="period-end" class="mb-2 block text-sm font-semibold text-[var(--text-main)]">Fecha de Fin</label>
            <input required id="period-end" type="date" class="${INPUT_CLASSES}" />
          </div>
          <div class="flex items-center gap-3">
            <button type="button" id="btn-cancel-period" class="w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-panel)] py-3 font-semibold text-[var(--text-muted)] transition-all hover:bg-[var(--bg-base)] hover:text-[var(--text-main)] cursor-pointer">Cancelar</button>
            <button type="submit" class="w-full rounded-xl bg-[var(--brand-bg)] py-3 font-bold text-[var(--brand-text)] transition-all hover:bg-[var(--brand-hover)] cursor-pointer">Guardar</button>
          </div>
        </form>
      </div>
    </div>

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
  const modal = document.getElementById("period-modal");
  const modalTitle = document.getElementById("period-modal-title");
  const btnCreate = document.getElementById("btn-create-form") || document.getElementById("btn-create-period");
  const btnCancel = document.getElementById("btn-cancel-period");
  const form = document.getElementById("form-period");
  const listContainer = document.getElementById("periods-list");
  const submitBtn = form.querySelector("button[type='submit']");

  let editPeriodId = null;

  const modalA11y = setupModalA11y(modal, () => closeModal());

  // Funciones del Modal
  const openModal = (triggerEl) => {
    modal.classList.remove("hidden");
    modalA11y.onOpen(triggerEl);
    // timeout for transitions
    setTimeout(() => {
      modal.classList.remove("opacity-0");
      modal.firstElementChild.classList.remove("scale-95");
    }, 10);
  };

  const openCreateModal = (e) => {
    editPeriodId = null;
    modalTitle.textContent = "Abrir Nuevo Ciclo";
    submitBtn.textContent = "Guardar";
    form.reset();
    openModal(e?.currentTarget);
  };

  const openEditModal = (period, triggerEl) => {
    editPeriodId = period.id;
    modalTitle.textContent = "Editar Ciclo";
    submitBtn.textContent = "Guardar Cambios";
    document.getElementById("period-name").value = period.name;
    document.getElementById("period-start").value = period.starts_at;
    document.getElementById("period-end").value = period.ends_at;
    openModal(triggerEl);
  };

  const closeModal = () => {
    modal.classList.add("opacity-0");
    modal.firstElementChild.classList.add("scale-95");
    setTimeout(() => {
      modal.classList.add("hidden");
      form.reset();
      editPeriodId = null;
    }, 300);
    modalA11y.onClose();
  };

  if (btnCreate) btnCreate.addEventListener("click", openCreateModal);
  if (btnCancel) btnCancel.addEventListener("click", closeModal);

  // Renderizar Ciclos
  let allPeriods = [];
  let currentFilteredPeriods = [];
  let currentPage = 1;
  const itemsPerPage = 5;

  const renderPeriodsList = (list) => {
      if (list !== currentFilteredPeriods) {
        currentFilteredPeriods = list;
        currentPage = 1;
      }
      
      const totalPages = Math.ceil(currentFilteredPeriods.length / itemsPerPage) || 1;
      if (currentPage > totalPages) currentPage = totalPages;
      
      const startIdx = (currentPage - 1) * itemsPerPage;
      const paginatedData = currentFilteredPeriods.slice(startIdx, startIdx + itemsPerPage);

      if (!paginatedData || paginatedData.length === 0) {
        listContainer.innerHTML = emptyStateComponent(
          allPeriods.length === 0 ? "No hay periodos" : "Sin resultados",
          allPeriods.length === 0 ? "Abre un nuevo periodo para que tu equipo empiece a evaluar." : "Ningún periodo coincide con la búsqueda."
        );
        return;
      }

      let html = paginatedData.map(p => {
        const statusBadge = p.is_active 
          ? statusBadgeComponent({ variant: "dot", status: "Activa" }) 
          : statusBadgeComponent({ variant: "dot", status: "Cerrado" });
          
        // Botones "suaves": fondo tintado + texto del mismo tono, via tokens
        // semanticos. El hover se resuelve con opacidad en vez de un segundo
        // tono literal, para no necesitar un token extra por familia.
        const actionBtn = p.is_active
          ? `<button class="btn-toggle-period rounded-lg px-4 py-2 text-xs font-bold text-[var(--danger-text)] bg-[var(--danger-bg)] hover:opacity-80 transition-opacity cursor-pointer" data-id="${p.id}" data-action="close">Cerrar Ciclo</button>`
          : `<button class="btn-toggle-period rounded-lg px-4 py-2 text-xs font-bold text-[var(--success-text)] bg-[var(--success-bg)] hover:opacity-80 transition-opacity cursor-pointer" data-id="${p.id}" data-action="open">Reabrir Ciclo</button>`;

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
              <button class="btn-edit-period rounded-lg px-4 py-2 text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-base)] hover:bg-[var(--border-main)] transition-colors cursor-pointer" data-id="${p.id}" title="Editar ciclo">
                Editar
              </button>
              ${actionBtn}
              <button class="btn-delete-period p-2 text-[var(--text-muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)] rounded-lg transition-colors cursor-pointer" data-id="${p.id}" title="Eliminar ciclo">
                <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>
        `;
      }).join("");

      if (totalPages > 1) {
        html += `
          <div class="flex justify-between items-center mt-4 px-2">
            <button class="btn-prev-page px-4 py-2 rounded-xl font-bold bg-[var(--bg-base)] text-[var(--text-muted)] border border-[var(--border-main)] hover:bg-[var(--border-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>
            <span class="text-sm font-semibold text-[var(--text-muted)]">Página ${currentPage} de ${totalPages}</span>
            <button class="btn-next-page px-4 py-2 rounded-xl font-bold bg-[var(--bg-base)] text-[var(--text-muted)] border border-[var(--border-main)] hover:bg-[var(--border-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer" ${currentPage === totalPages ? 'disabled' : ''}>Siguiente</button>
          </div>
        `;
      }

      listContainer.innerHTML = html;

      if (totalPages > 1) {
        listContainer.querySelector(".btn-prev-page")?.addEventListener("click", () => {
          if (currentPage > 1) {
            currentPage--;
            renderPeriodsList(currentFilteredPeriods);
          }
        });
        listContainer.querySelector(".btn-next-page")?.addEventListener("click", () => {
          if (currentPage < totalPages) {
            currentPage++;
            renderPeriodsList(currentFilteredPeriods);
          }
        });
      }

      // Lógica de los botones de Activar/Desactivar
      listContainer.querySelectorAll(".btn-toggle-period").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const id = parseInt(e.target.dataset.id);
          const action = e.target.dataset.action;
          const newStatus = action === "open" ? true : false;
          
          // Optimistic UI: cambiar el estado local
          const originalPeriods = [...allPeriods];
          const periodIndex = allPeriods.findIndex(p => p.id === id);
          if (periodIndex !== -1) {
            // Si abrimos un ciclo, cerramos los demás
            if (newStatus) {
              allPeriods.forEach(p => p.is_active = false);
            }
            allPeriods[periodIndex].is_active = newStatus;
            renderPeriodsList(allPeriods);
          }

          try {
            await periodService.update(id, { is_active: newStatus, admin_id: authService.getSession()?.id });
            showToast(newStatus ? "Ciclo Abierto Exitosamente" : "Ciclo Cerrado", "success");
            loadPeriods(); // Recargar la lista por si el backend ajustó algo más
          } catch (error) {
            // Rollback
            allPeriods = originalPeriods;
            renderPeriodsList(allPeriods);
            showToast("Error al cambiar estado", "error");
          }
        });
      });

      // Lógica del botón Editar
      document.querySelectorAll(".btn-edit-period").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = parseInt(btn.dataset.id);
          const period = allPeriods.find(p => p.id === id);
          if (period) openEditModal(period, btn);
        });
      });

      // Lógica del botón Eliminar
      document.querySelectorAll(".btn-delete-period").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const id = e.currentTarget.dataset.id;
          if (!(await showConfirm("¿Estás seguro de que deseas eliminar este ciclo? Esta acción no se puede deshacer."))) return;

          // Optimistic UI
          const originalPeriods = [...allPeriods];
          allPeriods = allPeriods.filter(p => p.id != id);
          renderPeriodsList(allPeriods);

          try {
            await periodService.remove(id);
            showToast("Ciclo eliminado", "success");
            loadPeriods();
          } catch (error) {
            // Rollback
            allPeriods = originalPeriods;
            renderPeriodsList(allPeriods);

            const msg = error?.status === 409
              ? "No se puede eliminar: ya hay evaluaciones registradas en este ciclo."
              : "Error al eliminar el ciclo.";
            showToast(msg, "error");
          }
        });
      });

  };

  const searchSlot = document.getElementById("period-search-slot");

  const loadPeriods = async () => {
    try {
      allPeriods = await periodService.get();
      renderPeriodsList(allPeriods);
      // Se regenera el input en cada carga para no acumular listeners de
      // versiones anteriores (loadPeriods se vuelve a llamar tras crear/
      // editar/borrar/activar un ciclo, pero el nodo del input persiste
      // fuera de listContainer si no se reemplaza).
      if (searchSlot) {
        searchSlot.innerHTML = searchBoxComponent('period-search', 'Buscar ciclo por nombre...');
        setupSearch('period-search', allPeriods, ['name'], renderPeriodsList);
      }
    } catch (error) {
      console.error(error);
      showToast("No se pudieron cargar los ciclos", "error");
      listContainer.innerHTML = renderPeriodsError();
      document.getElementById("btn-retry-periods")?.addEventListener("click", loadPeriods);
    }
  };

  // Crear o editar Periodo
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      name: document.getElementById("period-name").value.trim(),
      starts_at: document.getElementById("period-start").value,
      ends_at: document.getElementById("period-end").value,
      is_active: true // Por defecto al crear es activo, al editar depende pero lo ignoramos optimista
    };

    // Validacion Zod
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

    const originalPeriods = [...allPeriods];

    if (editPeriodId) {
      const idx = allPeriods.findIndex(p => p.id === editPeriodId);
      if (idx !== -1) {
        allPeriods[idx] = { ...allPeriods[idx], ...data, is_active: allPeriods[idx].is_active };
      }
    } else {
      // Fake ID temporal para renderizado optimista
      allPeriods.push({ id: Date.now(), ...data });
    }

    renderPeriodsList(allPeriods);
    closeModal();

    try {
      if (editPeriodId) {
        await periodService.update(editPeriodId, data);
        showToast("Ciclo Actualizado Exitosamente", "success");
      } else {
        await periodService.create(data);
        showToast("Ciclo Creado Exitosamente", "success");
      }
      loadPeriods();
    } catch (error) {
      // Rollback
      allPeriods = originalPeriods;
      renderPeriodsList(allPeriods);
      showToast(editPeriodId ? "Error al actualizar ciclo" : "Error al crear ciclo", "error");
    }
  });

  loadPeriods();
};
