import { createFocusTrap } from 'focus-trap';

// Basic a11y for the admin create/edit modals: Esc to close, focus trap and
// focus returned to the trigger. It does not replace each view open/close
// logic, it plugs into it via onOpen/onClose.
export const setupModalA11y = (modal, closeModal) => {
  let trap = null;

  // We handle Esc ourselves (escapeDeactivates:false) so it fires the view
  // closeModal() with its animation instead of hiding the modal abruptly.
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
