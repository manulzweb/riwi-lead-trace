import { z } from "zod";
import { authService } from "../../services/auth.service";
import { renderRoute } from "../../router/router";
import { showToast } from "../../components/alerts";
import { setButtonLoadingState, createDebouncedValidator, validateSync, showFieldError } from "../../utils/formUtils";
import { backgroundComponent } from "../../components/background.js";

const loginSchema = {
  email: z.string().min(1, "El correo es obligatorio").email("Formato de correo inválido"),
  password: z.string().min(1, "La contraseña es obligatoria").min(8, "Mínimo 8 caracteres")
};

export const renderLogin = () => `
  <div class="relative min-h-screen w-full overflow-hidden">

    ${backgroundComponent()}
    ${langSwitcherComponent("es")}

    <div class="flex min-h-screen items-center justify-center p-4">
      <form class="w-full max-w-md rounded-3xl border border-white/30 bg-white/95 p-6 sm:p-10 shadow-2xl backdrop-blur-xl transition-all sm:hover:scale-[1.02]">

        <h1 class="mb-3 text-center text-2xl sm:text-3xl font-bold text-[var(--brand-bg)]">Riwi LeadTrace</h1>
        <p class="mb-6 text-center text-sm sm:text-base text-[var(--text-muted)]">Acompaña, evalúa y crece con tu equipo</p>

        <div class="mb-4">
          <label class="mb-1 block text-sm font-medium text-[var(--text-main)]" for="email">
            Correo <span class="ml-1 text-[var(--danger-text)]">*</span>
          </label>
          <input
            required
            id="email"
            type="email"
            name="email"
            autocomplete="email"
            placeholder="Ingresa tu correo"
            class="w-full rounded-2xl border border-gray-200 px-4 py-3 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--brand-bg)]"
          />
          <p id="email-error" class="mt-1 hidden text-sm text-[var(--danger-text)]">
            Por favor, introduce un correo electrónico válido.
          </p>
        </div>

        <div class="mb-6">
          <label class="mb-1 block text-sm font-medium text-[var(--text-main)]" for="password">
            Contraseña <span class="ml-1 text-[var(--danger-text)]">*</span>
          </label>
          <input
            required
            id="password"
            type="password"
            name="password"
            autocomplete="current-password"
            placeholder="Tu contraseña"
            class="w-full rounded-2xl border border-gray-200 px-4 py-3 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--brand-bg)]"
          />
          <p id="password-error" class="mt-1 hidden text-sm text-[var(--danger-text)]">
            Por favor, introduce una contraseña válida.
          </p>
        </div>

        <button
          id="login-btn"
          type="submit"
          class="w-full rounded-2xl bg-[var(--brand-bg)] py-3 font-medium text-white shadow-lg transition-all hover:opacity-90 hover:scale-[1.02] hover:cursor-pointer disabled:opacity-50 focus:ring-4 focus:ring-[var(--border-main)]"
        >
          Iniciar sesión
        </button>
      </form>
    </div>
  </div>`;


const getViewElements = () => ({
  form: document.querySelector("form"),
  emailInput: document.getElementById("email"),
  passwordInput: document.getElementById("password"),
  emailError: document.getElementById("email-error"),
  passwordError: document.getElementById("password-error"),
  submitBtn: document.getElementById("login-btn")
});

const getFormData = (elements) => ({
  email: elements.emailInput.value.trim(),
  password: elements.passwordInput.value.trim()
});

const handleLoginSubmit = (elements) => async (event) => {
  event.preventDefault();
  if (elements.submitBtn.disabled) return;

  const isEmailValid = validateSync(elements.emailInput, elements.emailError, loginSchema.email);
  const isPasswordValid = validateSync(elements.passwordInput, elements.passwordError, loginSchema.password);

  if (!isEmailValid || !isPasswordValid) return;

  const { email, password } = getFormData(elements);

  setButtonLoadingState(elements.submitBtn, true, "Validando...", "Entrar al dashboard");

  try {
    const { user } = await authService.login(email, password);

    authService.setSession(user);
    showToast(`Bienvenido ${user.name}!`, "success");

    window.history.pushState({}, "", "/dashboard");
    renderRoute();
  } catch (error) {
    const statusMessages = {
      401: "Contraseña incorrecta",
      404: "El correo no está registrado"
    };

    const errorMsg = error.status
      ? (statusMessages[error.status] || "No se pudo iniciar sesión. Inténtalo de nuevo.")
      : "No se pudo conectar con el servidor";

    showToast("Falló el inicio de sesión", "error", errorMsg);
    setButtonLoadingState(elements.submitBtn, false, "", "Entrar al dashboard");
    return showFieldError(elements.emailInput, errorMsg, elements.emailError);
  }
};

export const setupLogin = () => {
  setupLangSwitcher();

  const elements = getViewElements();
  if (!elements.form || !elements.emailInput || !elements.passwordInput || !elements.emailError || !elements.passwordError) return;

  elements.emailInput.addEventListener("input", createDebouncedValidator(elements.emailInput, elements.emailError, loginSchema.email));
  elements.passwordInput.addEventListener("input", createDebouncedValidator(elements.passwordInput, elements.passwordError, loginSchema.password));

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    elements.submitBtn.click();
  });

  elements.submitBtn.addEventListener("click", handleLoginSubmit(elements));
};