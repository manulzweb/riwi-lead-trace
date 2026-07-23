/**
 * Marks a field as invalid and shows its error message in errorElement.
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
 * Clears the error state of an input.
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

export const validateSync = (input, errorElement, schemaOrRules) => {
  const inputValue = input.value.trim();
  
  // Zod schema
  if (schemaOrRules && typeof schemaOrRules.safeParse === 'function') {
    const result = schemaOrRules.safeParse(inputValue);
    if (!result.success) {
      showFieldError(input, result.error.issues[0].message, errorElement);
      return false;
    }
  } else {
    // Modo heredado: arreglo de reglas de validación.
    for (const rule of schemaOrRules) {
      if (rule.validate(inputValue)) {
        showFieldError(input, rule.errorMessage, errorElement);
        return false;
      }
    }
  }

  clearFieldError(input, errorElement);
  return true;
};

export const createDebouncedValidator = (input, errorElement, schemaOrRules, delay = 500) => {
  let timeoutId;
  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      validateSync(input, errorElement, schemaOrRules);
    }, delay);
  };
};

/**
 * Keeps each button original markup while it is in the loading state.
 *
 * A WeakMap and not a data- attribute: the content is HTML (svg + text), which
 * an attribute would force us to escape by hand, and the router replaces the
 * whole DOM on every navigation, so old buttons are released automatically.
 */
const originalButtonMarkup = new WeakMap();

/**
 * Handles the visual loading state of a button.
 *
 * The loading branch swaps the content for a spinner via innerHTML, so the
 * reset must restore markup, not plain text: these buttons carry an svg icon
 * that a textContent reset would wipe out for good.
 *
 * originalText stays as a fallback for resets that never went through the
 * loading branch.
 */
export const setButtonLoadingState = (button, isLoading, loadingText = "Guardando...", originalText = "Guardar") => {
  if (!button) return

  button.disabled = isLoading

  if (isLoading) {
    // Only the FIRST entry into loading saves the markup: if one is already
    // stored, the button now holds the spinner, not the original content.
    if (!originalButtonMarkup.has(button)) {
      originalButtonMarkup.set(button, button.innerHTML)
    }
    button.classList.add("opacity-90", "cursor-wait", "pointer-events-none")
    button.innerHTML = `
      <span class="inline-flex items-center justify-center gap-2 w-full">
        <svg class="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>${loadingText}</span>
      </span>
    `;
  } else {
    button.classList.remove("opacity-90", "cursor-wait", "pointer-events-none")

    const savedMarkup = originalButtonMarkup.get(button)
    if (savedMarkup !== undefined) {
      button.innerHTML = savedMarkup
      originalButtonMarkup.delete(button)
    } else {
      // Never went through the loading branch: legacy behaviour.
      button.textContent = originalText
    }
  }
};
