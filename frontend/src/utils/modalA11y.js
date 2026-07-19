// Accesibilidad basica para los modales de "crear/editar" del admin
// (periods.view.js, categories.view.js): cierre con Esc, trap de foco (Tab
// no se escapa del modal) y devolver el foco al boton que lo abrio al cerrar.
// No reemplaza la logica de abrir/cerrar (animaciones, reset de formulario)
// que ya tiene cada vista -- solo se conecta a ella via onOpen/onClose.
export const setupModalA11y = (modal, closeModal) => {
  let lastFocused = null;

  const getFocusable = () =>
    Array.from(modal.querySelectorAll('input, select, textarea, button, [tabindex]:not([tabindex="-1"])'))
      .filter((el) => !el.disabled && el.offsetParent !== null);

  modal.addEventListener('keydown', (e) => {
    if (modal.classList.contains('hidden')) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
      return;
    }

    if (e.key === 'Tab') {
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  return {
    onOpen: (triggerEl) => {
      lastFocused = triggerEl || document.activeElement;
      setTimeout(() => {
        const focusable = getFocusable();
        if (focusable.length > 0) focusable[0].focus();
      }, 50);
    },
    onClose: () => {
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
      lastFocused = null;
    },
  };
};
