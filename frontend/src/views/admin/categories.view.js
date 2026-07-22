import { navBarComponent } from "../../components/navbar";
import { showToast, showConfirm } from "../../components/alerts";
import { categoryService } from "../../services/categories.service.js";
import { escapeHtml } from "../../utils/validators";
import { setupModalA11y } from "../../utils/modalA11y";
import { authService } from "../../services/auth.service";
import { searchBoxComponent, setupSearch } from "../../components/searchBox";
import { emptyStateComponent } from "../../components/emptyState.js";
import { setupPagination } from "../../components/pagination";
import { z } from "zod";

// Estado de error del listado: ofrece reintentar en vez de pedir recargar la
// pagina. El listener del boton se engancha en loadCategories().
const renderCategoriesError = () => `
  <div class="text-center py-8">
    <p class="text-[var(--danger-text)] text-sm">No se pudieron cargar las categorías.</p>
    <button id="btn-retry-categories" class="mt-4 rounded-xl bg-[var(--brand-bg)] px-5 py-2.5 text-sm font-bold text-[var(--brand-text)] transition-all hover:bg-[var(--brand-hover)] cursor-pointer">Reintentar</button>
  </div>
`;

export const renderAdminCategories = () => `
  ${navBarComponent()}
  <main class="px-6 py-10 relative transition-all duration-300 ease-in-out">
    <div class="mx-auto max-w-4xl">

    <section class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Admin</p>
        <h1 class="mt-1 text-4xl font-black font-heading tracking-tight text-[var(--text-main)]">Categorías</h1>
        <p class="mt-4 text-[var(--text-muted)]">Agrupan las preguntas de escala de los formularios de evaluación.</p>
      </div>
      <button id="btn-create-category" class="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--brand-bg)] px-6 py-3 text-sm font-bold text-[var(--brand-text)] transition-all duration-300 ease-in-out hover:bg-[var(--brand-hover)] hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
        <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Nueva Categoría
      </button>
    </section>

    <!-- Modal Form -->
    <div id="category-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm hidden opacity-0 transition-opacity duration-300">
      <div role="dialog" aria-modal="true" aria-labelledby="category-modal-title" class="w-full max-w-md scale-95 transform rounded-3xl bg-[var(--bg-panel)] p-8 shadow-2xl transition-transform duration-300 border border-[var(--border-main)]">
        <h2 id="category-modal-title" class="mb-6 text-2xl font-bold font-heading text-[var(--text-main)]">Nueva Categoría</h2>
        <form id="form-category">
          <div class="mb-6">
            <label for="category-name" class="mb-2 block text-sm font-semibold text-[var(--text-main)]">Nombre</label>
            <input required maxlength="60" id="category-name" type="text" placeholder="Ej. Comunicación" class="w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-sm text-[var(--text-main)] transition-all focus:border-[var(--brand-bg)] focus:bg-[var(--bg-panel)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-bg)]/10" />
          </div>
          <div class="flex items-center gap-3">
            <button type="button" id="btn-cancel-category" class="w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-panel)] py-3 font-semibold text-[var(--text-muted)] transition-all hover:bg-[var(--bg-base)] hover:text-[var(--text-main)] cursor-pointer">Cancelar</button>
            <button type="submit" class="w-full rounded-xl bg-[var(--brand-bg)] py-3 font-bold text-[var(--brand-text)] transition-all hover:bg-[var(--brand-hover)] cursor-pointer">Guardar</button>
          </div>
        </form>
      </div>
    </div>

    <div id="category-search-slot" class="mt-8 max-w-sm"></div>

    <section id="categories-list" aria-live="polite" class="flex flex-col gap-3">
      ${Array(3).fill(`
        <div class="flex items-center justify-between gap-4 rounded-2xl bg-[var(--bg-panel)] p-4 shadow-sm border border-[var(--border-main)]">
          <div class="h-6 w-1/3 skeleton-shimmer rounded-md"></div>
          <div class="flex items-center gap-2">
            <div class="h-8 w-16 skeleton-shimmer rounded-lg"></div>
            <div class="h-8 w-8 skeleton-shimmer rounded-lg"></div>
          </div>
        </div>
      `).join("")}
    </section>

    </div>
  </main>
`;

export const setupAdminCategories = () => {
  const modal = document.getElementById("category-modal");
  const modalTitle = document.getElementById("category-modal-title");
  const btnCreate = document.getElementById("btn-create-category");
  const btnCancel = document.getElementById("btn-cancel-category");
  const form = document.getElementById("form-category");
  const listContainer = document.getElementById("categories-list");
  const submitBtn = form.querySelector("button[type='submit']");
  const nameInput = document.getElementById("category-name");

  let editCategoryId = null;

  const modalA11y = setupModalA11y(modal, () => closeModal());

  const openModal = (triggerEl) => {
    modal.classList.remove("hidden");
    modalA11y.onOpen(triggerEl);
    setTimeout(() => {
      modal.classList.remove("opacity-0");
      modal.firstElementChild.classList.remove("scale-95");
    }, 10);
  };

  const openCreateModal = (e) => {
    editCategoryId = null;
    modalTitle.textContent = "Nueva Categoría";
    submitBtn.textContent = "Guardar";
    form.reset();
    openModal(e?.currentTarget);
  };

  const openEditModal = (category, triggerEl) => {
    editCategoryId = category.id;
    modalTitle.textContent = "Editar Categoría";
    submitBtn.textContent = "Guardar Cambios";
    nameInput.value = category.name;
    openModal(triggerEl);
  };

  const closeModal = () => {
    modal.classList.add("opacity-0");
    modal.firstElementChild.classList.add("scale-95");
    setTimeout(() => {
      modal.classList.add("hidden");
      form.reset();
      editCategoryId = null;
    }, 300);
    modalA11y.onClose();
  };

  btnCreate.addEventListener("click", openCreateModal);
  btnCancel.addEventListener("click", closeModal);

  let allCategories = [];
  let currentFilteredCategories = [];
  let paginationInstance = null;
  const searchSlot = document.getElementById("category-search-slot");

  const renderCategoriesList = (categories) => {
    currentFilteredCategories = categories;
    
    if (paginationInstance) {
      paginationInstance.updateData(categories);
      return;
    }

    paginationInstance = setupPagination({
      data: categories,
      itemsPerPage: 5,
      container: listContainer,
      emptyStateHtml: emptyStateComponent(
        allCategories.length === 0 ? "No hay categorías" : "Sin resultados",
        allCategories.length === 0 ? "Crea la primera categoría para poder clasificar preguntas." : "Ninguna categoría coincide con la búsqueda."
      ),
      renderItem: (c) => `
        <div class="flex items-center justify-between gap-4 rounded-2xl bg-[var(--bg-panel)] p-4 shadow-sm border border-[var(--border-main)] transition-all hover:shadow-md">
          <h3 class="font-bold text-[var(--text-main)]">${escapeHtml(c.name)}</h3>
          <div class="flex items-center gap-2">
            <button class="btn-edit-category rounded-lg px-4 py-2 text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-base)] hover:bg-[var(--border-main)] transition-colors cursor-pointer" data-id="${c.id}" title="Editar categoría">
              Editar
            </button>
            <button class="btn-delete-category p-2 text-[var(--text-muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)] rounded-lg transition-colors cursor-pointer" data-id="${c.id}" title="Eliminar categoría">
              <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
      `,
      onRenderCompleted: () => {
        listContainer.querySelectorAll(".btn-edit-category").forEach(btn => {
          btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            const category = allCategories.find(c => c.id === id);
            if (category) openEditModal(category, btn);
          });
        });

        listContainer.querySelectorAll(".btn-delete-category").forEach(btn => {
          btn.addEventListener("click", async (e) => {
            const id = e.currentTarget.dataset.id;
            if (!(await showConfirm("¿Estás seguro de que deseas eliminar esta categoría?"))) return;

            const originalCats = [...allCategories];
            allCategories = allCategories.filter(c => c.id != id);
            renderCategoriesList(allCategories);

            try {
              await categoryService.remove(id, authService.getSession()?.id);
              showToast("Categoría eliminada", "success");
              loadCategories();
            } catch (error) {
              allCategories = originalCats;
              renderCategoriesList(allCategories);
              const msg = error?.status === 409
                ? "No se puede eliminar: hay preguntas usando esta categoría."
                : "Error al eliminar la categoría.";
              showToast(msg, "error");
            }
          });
        });
      }
    });
  };

  const loadCategories = async () => {
    try {
      allCategories = await categoryService.getCategories();
      renderCategoriesList(allCategories);
      if (searchSlot) {
        // Se regenera para no acumular listeners de recargas anteriores
        // (ver mismo comentario en periods.view.js).
        searchSlot.innerHTML = searchBoxComponent('category-search', 'Buscar categoría...');
        setupSearch('category-search', allCategories, ['name'], renderCategoriesList);
      }
    } catch (error) {
      console.error(error);
      showToast("No se pudieron cargar las categorías", "error");
      listContainer.innerHTML = renderCategoriesError();
      document.getElementById("btn-retry-categories")?.addEventListener("click", loadCategories);
    }
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();

    // Validacion Zod
    const categorySchema = z.object({
      name: z.string().min(3, "El nombre debe tener al menos 3 caracteres").max(60, "El nombre es muy largo (máximo 60)")
    });
    const validation = categorySchema.safeParse({ name });
    
    if (!validation.success) {
      showToast("Nombre inválido", "warning", validation.error.issues[0].message);
      return;
    }

    // Optimistic UI: Actualizar o agregar a la lista inmediatamente
    const originalCategories = [...allCategories];
    
    if (editCategoryId) {
      const idx = allCategories.findIndex(c => c.id === editCategoryId);
      if (idx !== -1) allCategories[idx] = { ...allCategories[idx], name };
    } else {
      // Fake ID temporal para el renderizado optimista
      allCategories.push({ id: Date.now(), name });
    }
    
    renderCategoriesList(allCategories);
    closeModal();

    try {
      if (editCategoryId) {
        await categoryService.update(editCategoryId, name);
        showToast("Categoría Actualizada", "success");
      } else {
        await categoryService.create(name);
        showToast("Categoría Creada", "success");
      }
      // Refrescar para obtener los IDs reales de la base de datos
      loadCategories();
    } catch (error) {
      // Rollback en caso de error
      allCategories = originalCategories;
      renderCategoriesList(allCategories);
      
      const msg = error?.status === 409
        ? "Ya existe una categoría con ese nombre."
        : (editCategoryId ? "Error al actualizar la categoría." : "Error al crear la categoría.");
      showToast(msg, "error");
    }
  });

  loadCategories();
};
