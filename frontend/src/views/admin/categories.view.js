import { navBarComponent } from "../../components/navbar";
import { showToast } from "../../components/alerts";
import { categoryService } from "../../services/categories.service.js";
import { escapeHtml } from "../../utils/validators";
import { setupModalA11y } from "../../utils/modalA11y";
import { authService } from "../../services/auth.service";
import { searchBoxComponent, setupSearch } from "../../components/searchBox";

export const renderAdminCategories = () => `
  ${navBarComponent()}
  <main class="mx-auto max-w-4xl px-6 py-10 relative">

    <section class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Admin</p>
        <h1 class="mt-1 text-4xl font-black font-heading tracking-tight text-[var(--text-main)]">Categorías</h1>
        <p class="mt-4 text-[var(--text-muted)]">Agrupan las preguntas de escala de los formularios de evaluación.</p>
      </div>
      <button id="btn-create-category" class="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--brand-bg)] px-6 py-3 text-sm font-bold text-[var(--brand-text)] transition-all duration-300 ease-in-out hover:bg-[var(--brand-hover)] hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Nueva Categoría
      </button>
    </section>

    <!-- Modal Form -->
    <div id="category-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm hidden opacity-0 transition-opacity duration-300">
      <div class="w-full max-w-md scale-95 transform rounded-3xl bg-white p-8 shadow-2xl transition-transform duration-300 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
        <h2 id="category-modal-title" class="mb-6 text-2xl font-bold font-heading text-[var(--text-main)]">Nueva Categoría</h2>
        <form id="form-category">
          <div class="mb-6">
            <label class="mb-2 block text-sm font-semibold text-[var(--text-main)]">Nombre</label>
            <input required maxlength="60" id="category-name" type="text" placeholder="Ej. Comunicación" class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm transition-all focus:border-[var(--brand-bg)] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--brand-bg)]/10 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white" />
          </div>
          <div class="flex items-center gap-3">
            <button type="button" id="btn-cancel-category" class="w-full rounded-xl border border-gray-200 bg-white py-3 font-semibold text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700 cursor-pointer">Cancelar</button>
            <button type="submit" class="w-full rounded-xl bg-[var(--brand-bg)] py-3 font-bold text-white transition-all hover:bg-[var(--brand-hover)] cursor-pointer">Guardar</button>
          </div>
        </form>
      </div>
    </div>

    <div id="category-search-slot" class="mt-8 max-w-sm"></div>

    <section id="categories-list" class="flex flex-col gap-3">
      <div class="h-16 animate-pulse rounded-2xl bg-[var(--bg-panel)]"></div>
      <div class="h-16 animate-pulse rounded-2xl bg-[var(--bg-panel)]"></div>
      <div class="h-16 animate-pulse rounded-2xl bg-[var(--bg-panel)]"></div>
    </section>

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
  let currentPage = 1;
  const itemsPerPage = 5;
  const searchSlot = document.getElementById("category-search-slot");

  const renderCategoriesList = (categories) => {
    if (categories !== currentFilteredCategories) {
      currentFilteredCategories = categories;
      currentPage = 1;
    }
    
    const totalPages = Math.ceil(currentFilteredCategories.length / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    const startIdx = (currentPage - 1) * itemsPerPage;
    const paginatedData = currentFilteredCategories.slice(startIdx, startIdx + itemsPerPage);

    if (!paginatedData || paginatedData.length === 0) {
      listContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center py-16 text-center">
          <div class="mb-4 rounded-full bg-gray-100 p-4 dark:bg-zinc-800">
            <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 11V6a3 3 0 013-3z"/></svg>
          </div>
          <h3 class="mb-2 font-heading text-xl font-bold text-[var(--text-main)]">${allCategories.length === 0 ? "No hay categorías" : "Sin resultados"}</h3>
          <p class="text-sm text-[var(--text-muted)]">${allCategories.length === 0 ? "Crea la primera categoría para poder clasificar preguntas." : "Ninguna categoría coincide con la búsqueda."}</p>
        </div>`;
      return;
    }

    let html = paginatedData.map(c => `
      <div class="flex items-center justify-between gap-4 rounded-2xl bg-[var(--bg-panel)] p-4 shadow-sm border border-gray-100 dark:border-zinc-800 transition-all hover:shadow-md">
        <h3 class="font-bold text-[var(--text-main)]">${escapeHtml(c.name)}</h3>
        <div class="flex items-center gap-2">
          <button class="btn-edit-category rounded-lg px-4 py-2 text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-base)] hover:bg-[var(--border-main)] transition-colors cursor-pointer" data-id="${c.id}" title="Editar categoría">
            Editar
          </button>
          <button class="btn-delete-category p-2 text-[var(--text-muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)] rounded-lg transition-colors cursor-pointer" data-id="${c.id}" title="Eliminar categoría">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
    `).join("");

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
          renderCategoriesList(currentFilteredCategories);
        }
      });
      listContainer.querySelector(".btn-next-page")?.addEventListener("click", () => {
        if (currentPage < totalPages) {
          currentPage++;
          renderCategoriesList(currentFilteredCategories);
        }
      });
    }

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
        if (!confirm("¿Estás seguro de que deseas eliminar esta categoría?")) return;

        try {
          await categoryService.remove(id, authService.getSession()?.id);
          showToast("Categoría eliminada", "success");
          loadCategories();
        } catch (error) {
          const msg = error?.message?.includes("409")
            ? "No se puede eliminar: hay preguntas que usan esta categoría."
            : "Error al eliminar la categoría.";
          showToast(msg, "error");
        }
      });
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
      listContainer.innerHTML = `
        <div class="text-center py-8 text-[var(--danger-text)] text-sm">
          No se pudieron cargar las categorías. Recarga la página para reintentar.
        </div>
      `;
    }
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;

    try {
      if (editCategoryId) {
        await categoryService.update(editCategoryId, name);
        showToast("Categoría Actualizada", "success");
      } else {
        await categoryService.create(name);
        showToast("Categoría Creada", "success");
      }
      closeModal();
      loadCategories();
    } catch (error) {
      const msg = error?.message?.includes("409")
        ? "Ya existe una categoría con ese nombre."
        : (editCategoryId ? "Error al actualizar la categoría." : "Error al crear la categoría.");
      showToast(msg, "error");
    }
  });

  loadCategories();
};
