import { getEmailRules, getPasswordRules } from "../../utils/validators";
import { authService } from "../../services/auth.service";
import { renderRoute } from "../../router/router";
<<<<<<< HEAD
import { userService } from "../../services/users.service";
import { showToast } from "../../components/alerts";
import { hashPassword } from "../../utils/crypto";
=======
import { showToast } from "../../components/alerts";
>>>>>>> upstream/develop
import { setButtonLoadingState, createDebouncedValidator, validateSync, showFieldError } from "../../utils/formUtils";
import { backgroundComponent } from "../../components/background.js";
import { langSwitcherComponent, setupLangSwitcher } from "../../components/lang-switcher.js";

export const renderLogin = () => `
  <main class="relative min-h-screen w-full overflow-hidden">

    ${backgroundComponent()}
    ${langSwitcherComponent("es")}

    <div class="flex min-h-screen items-center justify-center p-4">
      <form class="w-full max-w-md rounded-3xl border border-white/30 bg-white/95 p-10 shadow-2xl backdrop-blur-xl transition-all hover:scale-[1.02]">

        <h1 class="mb-3 text-center text-3xl font-bold text-[var(--brand-bg)]">Riwi LeadTrace</h1>
        <p class="mb-1 text-center text-[var(--text-muted)]">Evaluación 360</p>
        <p class="mb-6 text-center text-[var(--text-muted)]">Acompaña, evalúa y crece con tu equipo</p>

        <div class="mb-4">
          <label class="mb-1 block text-sm font-medium text-[var(--text-main)]" for="email">
            Correo <span class="ml-1 text-[var(--danger-text)]">*</span>
          </label>
          <input
            required
            id="email"
            type="email"
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
  </main>`;


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

  const isEmailValid = validateSync(elements.emailInput, elements.emailError, getEmailRules());
  const isPasswordValid = validateSync(elements.passwordInput, elements.passwordError, getPasswordRules());

  if (!isEmailValid || !isPasswordValid) return;

  const { email, password } = getFormData(elements);

  setButtonLoadingState(elements.submitBtn, true, "Validando...", "Entrar al dashboard");

  try {
    // const users = await userService.get();
    // const hashedPassword = hashPassword(password);

    // const user = users.find((user) => user.email.toLowerCase() === email.toLowerCase() && user.password === hashedPassword);

    // if (!user) {
    //   showToast("Falló el inicio de sesión", "error", "Credenciales incorrectas");
    //   setButtonLoadingState(elements.submitBtn, false, "", "Entrar al dashboard");
    //   return showFieldError(elements.emailInput, "Credenciales incorrectas", elements.emailError);
    // }

    // Mock user for testing: asignar rol basado en el email
    let userRole = "admin";
    let userName = "Admin User";
    
    const emailLower = email.toLowerCase();
    if (emailLower.includes("coder")) {
      userRole = "coder";
      userName = "Coder User";
    } else if (emailLower.includes("team")) {
      userRole = "team_leader";
      userName = "Team Leader";
    } else if (emailLower.includes("tutor")) {
      userRole = "tutor";
      userName = "Tutor User";
    }

    const user = {
      id: "1",
      name: userName,
      email: emailLower,
      roles: [userRole]
    };

    /*authService.setSession(user);
    const { user, access_token } = await authService.login(email, password);

    authService.setSession(user, access_token);
    showToast(`Bienvenido ${user.name}!`, "success");

    window.history.pushState({}, "", "/dashboard");
    renderRoute();*/
  } catch (error) {
    showToast("Falló el inicio de sesión", "error", "Credenciales incorrectas");
    setButtonLoadingState(elements.submitBtn, false, "", "Entrar al dashboard");
    return showFieldError(elements.emailInput, "Credenciales incorrectas", elements.emailError);
  }
};

export const setupLogin = () => {
  setupLangSwitcher();

  const elements = getViewElements();
  if (!elements.form || !elements.emailInput || !elements.passwordInput || !elements.emailError || !elements.passwordError) return;

  elements.emailInput.addEventListener("input", createDebouncedValidator(elements.emailInput, elements.emailError, getEmailRules()));
  elements.passwordInput.addEventListener("input", createDebouncedValidator(elements.passwordInput, elements.passwordError, getPasswordRules()));

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    elements.submitBtn.click();
  });

  elements.submitBtn.addEventListener("click", handleLoginSubmit(elements));
};