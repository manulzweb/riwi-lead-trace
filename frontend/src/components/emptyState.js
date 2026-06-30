export const emptyStateComponent = (title = "No hay tareas", message = "Empieza creando tu primera tarea.") => {
  return `
    <div class="col-span-full text-center py-16 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-3xl p-10 shadow-lg">
      <h3 class="mt-4 text-xl font-bold text-[var(--text-main)]">${title}</h3>
      <p class="mt-2 text-[var(--text-muted)]">${message}</p>
      <a class="mt-6 inline-flex items-center justify-center rounded-2xl bg-[var(--brand-bg)] px-5 py-3 text-sm font-bold text-[var(--brand-text)] hover:bg-[var(--brand-hover)] transition shadow-md" href="/tasks/new">
        Crear tarea
      </a>
    </div>
  `;
};
