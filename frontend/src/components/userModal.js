import { escapeHtml } from "../utils/validators";

export const userModalComponent = (user = null) => {
  if (!user) return "";

  const isAdmin = user.roles && user.roles.includes("admin");

  return `
    <div id="user-modal-overlay" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div class="w-full max-w-lg rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-8 shadow-2xl">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold text-[var(--text-main)]">Editar Usuario</h2>
          <button id="close-modal-btn" type="button" class="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form id="edit-user-form" class="mt-6 grid gap-5">
          <input type="hidden" id="modal-user-id" value="${escapeHtml(String(user.id))}">
          
          <div>
            <label class="mb-2 block text-sm font-medium text-[var(--text-main)]">Nombre</label>
            <input id="modal-name" type="text" value="${escapeHtml(user.name)}" class="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:ring-4 focus:ring-[var(--border-main)] focus:outline-none" />
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-[var(--text-main)]">Correo</label>
            <input id="modal-email" type="email" value="${escapeHtml(user.email)}" class="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:ring-4 focus:ring-[var(--border-main)] focus:outline-none" />
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-[var(--text-main)]">Roles</label>
            <div class="flex gap-4 mt-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="role-admin" ${isAdmin ? "checked" : ""} class="h-5 w-5 rounded border-[var(--border-main)] text-[var(--brand-bg)] focus:ring-[var(--brand-hover)] cursor-pointer">
                <span class="text-sm font-medium text-[var(--text-main)]">Administrador</span>
              </label>
            </div>
          </div>

          <div class="mt-4 flex flex-col gap-3 sm:flex-row">
            <button id="save-modal-btn" type="submit" class="inline-flex items-center justify-center rounded-2xl bg-[var(--brand-bg)] px-5 py-3 text-sm font-bold text-[var(--brand-text)] transition-all duration-300 hover:bg-[var(--brand-hover)] hover:shadow-md cursor-pointer">Guardar cambios</button>
            <button id="cancel-modal-btn" type="button" class="inline-flex items-center justify-center rounded-2xl border border-[var(--border-main)] bg-[var(--bg-panel)] px-5 py-3 text-sm font-bold text-[var(--brand-bg)] transition-all duration-300 hover:bg-[var(--bg-base)] cursor-pointer">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  `;
};
