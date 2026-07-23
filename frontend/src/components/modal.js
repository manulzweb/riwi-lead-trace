import { setupModalA11y } from "../utils/modalA11y";

// Shared SPA modal, factored out of the identical backdrop + panel markup and
// open/close logic duplicated in categories, periods and admin/evaluations.
// Same split as the rest of components/: modalComponent returns markup,
// setupModal wires behaviour on top of modalA11y.
//
// It does NOT reset forms or view state; hook that via onOpen/onClose.

// Modal markup. children is injected as-is: the caller must escape its data.
// size maps to the panel max-width.
export const modalComponent = ({ id, title, children = "", size = "md", panelClass = "" }) => {
  const maxWidth = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" }[size] || "max-w-md";

  return `
    <div id="${id}" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm hidden opacity-0 transition-opacity duration-300">
      <div role="dialog" aria-modal="true" aria-labelledby="${id}-title" class="w-full ${maxWidth} scale-95 transform rounded-3xl bg-[var(--bg-panel)] p-8 shadow-2xl transition-transform duration-300 border border-[var(--border-main)] ${panelClass}">
        <h2 id="${id}-title" class="mb-6 text-2xl font-bold font-heading text-[var(--text-main)]">${title}</h2>
        ${children}
      </div>
    </div>
  `;
};

// Wires open/close over modalComponent markup. Exposes titleEl for views that
// swap the title between create/edit, and onOpen/onClose hooks for their own
// state (populate fields, form.reset(), clear selection).
export const setupModal = (id, { onOpen, onClose } = {}) => {
  const modal = document.getElementById(id);
  if (!modal) return { open: () => {}, close: () => {}, modal: null, titleEl: null };

  const titleEl = document.getElementById(`${id}-title`);
  // close is referenced before it is defined, hence the arrow wrapper: it
  // resolves at call time.
  const a11y = setupModalA11y(modal, () => close());

  const open = (triggerEl) => {
    modal.classList.remove("hidden");
    a11y.onOpen(triggerEl);
    onOpen?.(triggerEl);
    // 10ms: let the browser paint the initial state before transitioning,
    // otherwise the animation does not run.
    setTimeout(() => {
      modal.classList.remove("opacity-0");
      modal.firstElementChild.classList.remove("scale-95");
    }, 10);
  };

  const close = () => {
    modal.classList.add("opacity-0");
    modal.firstElementChild.classList.add("scale-95");
    // 300ms: matches duration-300; only then hide it and clear view state.
    setTimeout(() => {
      modal.classList.add("hidden");
      onClose?.();
    }, 300);
    a11y.onClose();
  };

  return { open, close, modal, titleEl };
};
