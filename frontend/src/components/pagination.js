export const setupPagination = ({
  data,
  itemsPerPage = 10,
  container,
  renderItem,
  emptyStateHtml = '<p class="text-center text-[var(--text-muted)] italic">No hay resultados.</p>',
  onRenderCompleted = () => {} // Callback for attaching event listeners to the rendered items
}) => {
  let currentPage = 1;
  let currentData = data;

  const render = () => {
    // El contenedor pudo desmontarse entre que la vista lo capturo y esta
    // llamada: una vista async que espera al backend puede ser re-renderizada
    // por el router (navegacion concurrente), dejando su contenedor detached.
    // Sin esta guarda, `container.innerHTML` lanzaba y abortaba la carga.
    if (!container) return;

    const totalPages = Math.ceil(currentData.length / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    
    const startIdx = (currentPage - 1) * itemsPerPage;
    const paginatedData = currentData.slice(startIdx, startIdx + itemsPerPage);

    if (paginatedData.length === 0) {
      container.innerHTML = emptyStateHtml;
      return;
    }

    const itemsHtml = paginatedData.map((item, index) => renderItem(item, index + startIdx)).join('');
    
    let paginationHtml = '';
    if (totalPages > 1) {
      paginationHtml = `
        <div class="flex justify-between items-center mt-4 px-2">
          <button class="btn-prev-page px-4 py-2 rounded-xl font-bold bg-[var(--bg-base)] text-[var(--text-muted)] border border-[var(--border-main)] hover:bg-[var(--border-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>
          <span class="text-sm font-semibold text-[var(--text-muted)]">Página ${currentPage} de ${totalPages}</span>
          <button class="btn-next-page px-4 py-2 rounded-xl font-bold bg-[var(--bg-base)] text-[var(--text-muted)] border border-[var(--border-main)] hover:bg-[var(--border-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer" ${currentPage === totalPages ? 'disabled' : ''}>Siguiente</button>
        </div>
      `;
    }

    container.innerHTML = itemsHtml + paginationHtml;

    if (totalPages > 1) {
      container.querySelector(".btn-prev-page")?.addEventListener("click", () => {
        if (currentPage > 1) {
          currentPage--;
          render();
        }
      });
      container.querySelector(".btn-next-page")?.addEventListener("click", () => {
        if (currentPage < totalPages) {
          currentPage++;
          render();
        }
      });
    }

    onRenderCompleted();
  };

  render();
  
  return {
    updateData: (newData) => {
      currentData = newData;
      currentPage = 1;
      render();
    },
    getCurrentPage: () => currentPage
  };
};
