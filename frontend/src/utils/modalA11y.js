import { createFocusTrap } from 'focus-trap';

// Accesibilidad basica para los modales de "crear/editar" del admin
// (periods.view.js, categories.view.js): cierre con Esc, trap de foco (Tab
// no se escapa del modal, via focus-trap) y devolver el foco al boton que lo
// abrio al cerrar (setReturnFocus, lo maneja la libreria). No reemplaza la
// logica de abrir/cerrar (animaciones, reset de formulario) que ya tiene
// cada vista -- solo se conecta a ella via onOpen/onClose.
export const setupModalA11y = (modal, closeModal) => {
  let trap = null;

  // El Esc lo capturamos nosotros (no focus-trap: escapeDeactivates:false)
  // para que dispare closeModal() de la vista, con su animacion de cierre,
  // en vez de que la libreria oculte el modal de golpe.
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      e.preventDefault();
      closeModal();
    }
  });

  return {
    onOpen: (triggerEl) => {
      trap = createFocusTrap(modal, {
        escapeDeactivates: false,
        clickOutsideDeactivates: false,
        setReturnFocus: () => triggerEl || document.activeElement,
      });
      setTimeout(() => trap?.activate(), 50);
    },
    onClose: () => {
      trap?.deactivate();
      trap = null;
    },
  };
};
