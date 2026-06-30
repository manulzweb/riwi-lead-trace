import { statusBadgeComponent } from './statusBadge';
import { escapeHtml } from '../utils/validators';

export const taskComponent = (task, ownerName = "") => {
  const statusBadge = statusBadgeComponent(task.status);
  const ownerInfo = ownerName ? `<p class="mt-2 text-xs font-semibold text-[var(--text-muted)]">Propietario: <span class="text-[var(--text-main)] font-bold">${escapeHtml(ownerName)}</span></p>` : "";

  return `
    <article class="flex flex-col rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-lg h-full" data-task-id="${escapeHtml(task.id)}">
      <div class="flex flex-col flex-grow">
        <div class="self-start">${statusBadge}</div>
        <h2 class="task-title mt-4 text-xl font-bold text-[var(--text-main)] leading-tight break-words line-clamp-2">${escapeHtml(task.title)}</h2>
        <p class="mt-2 text-sm font-semibold text-[var(--brand-bg)] opacity-90">${task.date ? escapeHtml(task.date) : 'Sin fecha'}</p>
        <p class="task-description mt-3 text-sm text-[var(--text-muted)] flex-grow break-words line-clamp-3">${escapeHtml(task.description) || "Sin descripción proporcionada."}</p>
        ${ownerInfo}
      </div>
      <div class="mt-2 flex gap-3 items-center pt-4 border-t border-[var(--border-main)] border-opacity-50">
        <button class="hover:-translate-y-1 edit-task-btn rounded-full border border-[var(--border-main)] px-4 py-2 text-sm font-semibold text-[var(--brand-bg)] hover:bg-[var(--bg-base)] cursor-pointer transition-all duration-300" data-task-id="${escapeHtml(task.id)}">Editar</button>
        <button class="hover:-translate-y-1 delete-task-btn rounded-full border border-[var(--danger-border)] px-4 py-2 text-sm font-semibold text-[var(--danger-text)] hover:bg-[var(--danger-hover)] hover:border-[var(--danger-text)] cursor-pointer transition-all duration-300" data-task-id="${escapeHtml(task.id)}">Eliminar</button>
      </div>
    </article>
  `;
};
