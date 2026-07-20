import { navBarComponent } from "../../components/navbar";
import { statusBadgeComponent } from "../../components/statusBadge.js";
import { showToast } from "../../components/alerts";
import { periodService } from "../../services/periods.service.js";
import { escapeHtml } from "../../utils/validators";
import { setupModalA11y } from "../../utils/modalA11y";
import { authService } from "../../services/auth.service";
import { searchBoxComponent, setupSearch } from "../../components/searchBox";

export const renderAdminPeriods = () => `
  ${navBarComponent()}
  <main class="mx-auto max-w-6xl px-6 py-10 relative">
    
    <section class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Admin</p>
        <h1 class="mt-1 text-4xl font-black font-heading tracking-tight text-[var(--text-main)]">Ciclos de Evaluación</h1>
        <p class="mt-4 text-[var(--text-muted)]">Abre o cierra ventanas de tiempo para que el equipo comience a evaluar.</p>
      </div>
      <button id="btn-create-period" class="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--brand-bg)] px-6 py-3 text-sm font-bold text-[var(--brand-text)] transition-all duration-300 ease-in-out hover:bg-[var(--brand-hover)] hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Nuevo Ciclo
      </button>
    </section>

    <!-- Modal Form for New Period -->
    <div id="period-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm hidden opacity-0 transition-opacity duration-300">
      <div class="w-full max-w-md scale-95 transform rounded-3xl bg-white p-8 shadow-2xl transition-transform duration-300 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
        <h2 id="period-modal-title" class="mb-6 text-2xl font-bold font-heading text-[var(--text-main)]">Abrir Nuevo Ciclo</h2>
        <form id="form-period">
          <div class="mb-4">
            <label class="mb-2 block text-sm font-semibold text-[var(--text-main)]">Nombre del Ciclo</label>
            <input required id="period-name" type="text" placeholder="Ej. Q3 2026 o Julio 2026" class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm transition-all focus:border-[var(--brand-bg)] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--brand-bg)]/10 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white" />
          </div>
          <div class="mb-4">
            <label class="mb-2 block text-sm font-semibold text-[var(--text-main)]">Fecha de Inicio</label>
            <input required id="period-start" type="date" class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm transition-all focus:border-[var(--brand-bg)] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--brand-bg)]/10 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white" />
          </div>
          <div class="mb-6">
            <label class="mb-2 block text-sm font-semibold text-[var(--text-main)]">Fecha de Fin</label>
            <input required id="period-end" type="date" class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm transition-all focus:border-[var(--brand-bg)] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--brand-bg)]/10 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white" />
          </div>
          <div class="flex items-center gap-3">
            <button type="button" id="btn-cancel-period" class="w-full rounded-xl border border-gray-200 bg-white py-3 font-semibold text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700 cursor-pointer">Cancelar</button>
            <button type="submit" class="w-full rounded-xl bg-[var(--brand-bg)] py-3 font-bold text-white transition-all hover:bg-[var(--brand-hover)] cursor-pointer">Guardar</button>
          </div>
        </form>
      </div>
    </div>

    <div id="period-search-slot" class="mt-8 max-w-sm"></div>

    <section id="periods-list" class="flex flex-col gap-4">
      <div class="h-24 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
      <div class="h-24 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
    </section>

  </main>
`;

export const setupAdminPeriods = () => {
  const modal = document.getElementById("period-modal");
  const modalTitle = document.getElementById("period-modal-title");
  const btnCreate = document.getElementById("btn-create-template") || document.getElementById("btn-create-period");
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

  const renderPeriodsList = (list) => {
      if (!list || list.length === 0) {
        listContainer.innerHTML = `
          <div class="flex flex-col items-center justify-center py-16 text-center">
            <div class="mb-4 rounded-full bg-gray-100 p-4 dark:bg-zinc-800">
              <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
            <h3 class="mb-2 font-heading text-xl font-bold text-[var(--text-main)]">${allPeriods.length === 0 ? "No hay ciclos" : "Sin resultados"}</h3>
            <p class="text-sm text-[var(--text-muted)]">${allPeriods.length === 0 ? "Abre un nuevo ciclo para que tu equipo empiece a evaluar." : "Ningún ciclo coincide con la búsqueda."}</p>
          </div>`;
        return;
      }

      listContainer.innerHTML = list.map(p => {
        const statusBadge = p.is_active 
          ? statusBadgeComponent({ variant: "dot", status: "Activa" }) 
          : statusBadgeComponent({ variant: "dot", status: "Cerrado" });
          
        const actionBtn = p.is_active
          ? `<button class="btn-toggle-period rounded-lg px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors cursor-pointer" data-id="${p.id}" data-action="close">Cerrar Ciclo</button>`
          : `<button class="btn-toggle-period rounded-lg px-4 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer" data-id="${p.id}" data-action="open">Reabrir Ciclo</button>`;

        return `
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-[var(--bg-panel)] p-5 shadow-sm border border-gray-100 dark:border-zinc-800 transition-all hover:shadow-md">
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
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>
        `;
      }).join("");

      // Lógica de los botones de Activar/Desactivar
      document.querySelectorAll(".btn-toggle-period").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const id = e.target.dataset.id;
          const action = e.target.dataset.action;
          const newStatus = action === "open" ? true : false;

          try {
            await periodService.update(id, { is_active: newStatus, admin_id: authService.getSession()?.id });
            showToast(newStatus ? "Ciclo Abierto Exitosamente" : "Ciclo Cerrado", "success");
            loadPeriods(); // Recargar la lista
          } catch (error) {
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
          if (!confirm("¿Estás seguro de que deseas eliminar este ciclo? Esta acción no se puede deshacer.")) return;

          try {
            await periodService.remove(id);
            showToast("Ciclo eliminado", "success");
            loadPeriods();
          } catch (error) {
            const msg = error?.message?.includes("409")
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
      listContainer.innerHTML = `
        <div class="text-center py-8 text-[var(--danger-text)] text-sm">
          No se pudieron cargar los ciclos. Recarga la página para reintentar.
        </div>
      `;
    }
  };

  // Crear o editar Periodo
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      if (editPeriodId) {
        const data = {
          name: document.getElementById("period-name").value,
          starts_at: document.getElementById("period-start").value,
          ends_at: document.getElementById("period-end").value,
        };
        await periodService.update(editPeriodId, data);
        showToast("Ciclo Actualizado Exitosamente", "success");
      } else {
        const data = {
          name: document.getElementById("period-name").value,
          starts_at: document.getElementById("period-start").value,
          ends_at: document.getElementById("period-end").value,
          is_active: true // Por defecto lo creamos activo
        };
        await periodService.create(data);
        showToast("Ciclo Creado Exitosamente", "success");
      }
      closeModal();
      loadPeriods();
    } catch (error) {
      showToast(editPeriodId ? "Error al actualizar ciclo" : "Error al crear ciclo", "error");
    }
  });

  loadPeriods();
};
