import { badgeComponent } from './badge'
import { escapeHtml } from '../utils/validators'

export const userRowComponent = (user) => {
    return `
        <div class="rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-main)] p-4">
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
                <p class="font-bold text-[var(--text-main)]">${escapeHtml(user.name)}</p>
                <p class="text-sm text-[var(--text-muted)]">${escapeHtml(user.email)}</p>
            </div>
            <div class="flex gap-2">
                ${user.roles ? user.roles.map(badgeComponent).join('') : ''}
                <button class="edit-user-btn rounded-full border border-[var(--border-main)] px-3 py-1 text-xs font-semibold text-[var(--brand-bg)] hover:bg-[var(--bg-base)] transition-colors cursor-pointer" data-id="${user.id}">Editar</button>
                <button class="delete-user-btn rounded-full border border-[var(--danger-border)] px-3 py-1 text-xs font-semibold text-[var(--danger-text)] hover:bg-[var(--danger-hover)] hover:border-[var(--danger-text)] transition-colors cursor-pointer" data-id="${user.id}" data-name="${escapeHtml(user.name)}">Eliminar</button>
            </div>
            </div>
        </div>
    `
}