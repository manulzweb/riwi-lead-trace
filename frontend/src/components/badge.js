import { escapeHtml } from "../utils/validators.js";

// `role` se escapa igual que en statusBadge.js: hoy todos los llamadores pasan
// literales del codigo, pero los roles salen de la BD via `user.roles`, asi que
// en cuanto alguien pinte un rol venido de la API sin escapar seria XSS.
export const badgeComponent = (role) => {
    return  `
    <span class="rounded-full border border-[var(--border-main)] bg-[var(--bg-base)] px-3 py-1 text-[10px] font-bold text-[var(--brand-bg)] uppercase tracking-wider">${escapeHtml(role)}</span>
    `
}
