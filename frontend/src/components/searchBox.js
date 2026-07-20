import Fuse from 'fuse.js';

// Input de busqueda reutilizable para listas del admin (periodos, categorias,
// formularios). No pega al backend -- filtra client-side con Fuse (busqueda
// difusa: tolera errores de tipeo) sobre los datos que la vista ya cargo.
export const searchBoxComponent = (id, placeholder) => `
  <div class="relative mb-4">
    <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
    <input id="${id}" type="search" placeholder="${placeholder}"
      class="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-panel)] pl-10 pr-4 py-2.5 text-sm text-[var(--text-main)] focus:border-[var(--brand-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-bg)]/20" />
  </div>
`;

// Conecta el input de busqueda a una lista ya cargada. onFilter(items) se
// llama con la lista completa (input vacio) o con los resultados de Fuse.
export const setupSearch = (inputId, items, keys, onFilter) => {
  const input = document.getElementById(inputId);
  if (!input) return;

  const fuse = new Fuse(items, { keys, threshold: 0.35, ignoreLocation: true });

  input.addEventListener('input', () => {
    const query = input.value.trim();
    onFilter(query ? fuse.search(query).map((r) => r.item) : items);
  });
};
