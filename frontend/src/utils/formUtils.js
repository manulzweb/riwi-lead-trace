/**
 * Marca visualmente un campo como inválido y muestra el mensaje de error.
 * Asume que el contenedor del error es el siguiente elemento hermano del input, 
 * o se pasa explícitamente el elemento de mensaje.
 */
export const showFieldError = (input, message, errorElement = null) => {
  if (!input) return;
  input.classList.remove("border-[var(--border-main)]", "focus:border-[var(--brand-hover)]");
  input.classList.add("border-[var(--danger-text)]", "focus:border-[var(--danger-text)]", "focus:ring-4", "focus:ring-[var(--danger-border)]");
  
  const msg = errorElement
  if (msg) {
    msg.textContent = message;
    msg.classList.remove("hidden", "opacity-0", "-translate-y-1");
    msg.classList.add("transition-all", "duration-300", "ease-out", "opacity-100", "translate-y-0");
  }
};

/**
 * Limpia el estado de error de un input.
 */
export const clearFieldError = (input, errorElement = null) => {
  if (!input) return;
  input.classList.remove("border-[var(--danger-text)]", "focus:border-[var(--danger-text)]", "focus:ring-4", "focus:ring-[var(--danger-border)]");
  input.classList.add("border-[var(--border-main)]", "focus:border-[var(--brand-hover)]");
  
  const msg = errorElement
  if (msg) {
    msg.classList.remove("opacity-100", "translate-y-0");
    msg.classList.add("opacity-0", "-translate-y-1");
    setTimeout(() => {
      if (msg.classList.contains("opacity-0")) {
        msg.classList.add("hidden");
        msg.textContent = "";
      }
    }, 300);
  }
};

export const createDebouncedValidator = (input, errorElement, rules, delay = 500) => {
  let timeoutId;
  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const inputValue = input.value.trim();
      let error = null;
      for (const rule of rules) {
        if (rule.validate(inputValue)) {
          error = rule.errorMessage;
          break;
        }
      }
      if (error) {
        showFieldError(input, error, errorElement);
      } else {
        clearFieldError(input, errorElement);
      }
    }, delay);
  };
};

export const validateSync = (input, errorElement, rules) => {
  const inputValue = input.value.trim();
  for (const rule of rules) {
    if (rule.validate(inputValue)) {
      showFieldError(input, rule.errorMessage, errorElement);
      return false; // has error
    }
  }
  clearFieldError(input, errorElement);
  return true; // no error
};

/**
 * Gestiona el estado visual de carga de un botón.
 */
export const setButtonLoadingState = (button, isLoading, loadingText = "Guardando...", originalText = "Guardar") => {
  if (!button) return
  
  button.disabled = isLoading
  
  if (isLoading) {
    button.classList.add("opacity-90", "cursor-wait", "pointer-events-none")
    button.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      ${loadingText}
    `;
  } else {
    button.classList.remove("opacity-90", "cursor-wait", "pointer-events-none")
    button.textContent = originalText
  }
};
