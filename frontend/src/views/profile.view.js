import { authService } from "../services/auth.service";
import { navBarComponent } from "../components/navbar";
import { escapeHtml } from "../utils/validators";

export const renderProfile = () => {
  const user = authService.getSession();
  const name  = escapeHtml(user?.name  ?? "");
  const email = escapeHtml(user?.email ?? "");

  return `
    ${navBarComponent()}
    <main class="mx-auto max-w-3xl px-6 py-10">
      <section class="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-8 shadow-xl">
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Cuenta</p>
        <h1 class="mt-2 text-4xl font-black tracking-tight text-[var(--text-main)]">Mi perfil</h1>
        <p class="mt-4 text-[var(--text-muted)]">Consulta y actualiza tus datos personales.</p>

        <form id="profile-form" class="mt-8 grid gap-5">
          <div>
            <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="name">Nombre</label>
            <input id="name" type="text" value="${name}" placeholder="Tu nombre"
              class="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-hover)] focus:outline-none" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="email">Correo</label>
            <input id="email" type="email" value="${email}" disabled
              class="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-[var(--text-muted)] cursor-not-allowed" />
          </div>
          <button id="save-btn" type="submit"
            class="inline-flex items-center justify-center rounded-2xl bg-[var(--brand-bg)] px-5 py-3 text-sm font-bold text-[var(--brand-text)] transition-all duration-300 ease-in-out hover:bg-[var(--brand-hover)] hover:shadow-md hover:cursor-pointer focus:ring-4 focus:ring-[var(--border-main)]">
            Guardar cambios
          </button>
        </form>
      </section>
    </main>
  `;
};

export const setupProfile = () => {
  const form    = document.getElementById("profile-form");
  const saveBtn = document.getElementById("save-btn");
  if (!form || !saveBtn) return;

  form.addEventListener("submit", (e) => e.preventDefault());
};
