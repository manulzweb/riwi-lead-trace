import { setupModalA11y } from "../utils/modalA11y";

// Modal compartido de la SPA. Nace de la duplicacion ya presente en
// categories.view.js, periods.view.js y admin/evaluations.view.js: los tres
// tenian el MISMO markup de backdrop + panel y los MISMOS openModal/closeModal
// (incluidos los setTimeout de 10ms/300ms que sincronizan la animacion). Aqui
// vive una sola vez.
//
// Reparte responsabilidades como el resto de components/:
//   - `modalComponent(...)` devuelve markup (se usa dentro de un render*).
//   - `setupModal(id)` conecta el comportamiento en setup*, encima de
//     `modalA11y` (Esc + trap de foco + devolver foco al disparador).
//
// NO resetea formularios ni estado de la vista: eso es propio de cada pantalla.
// Para engancharlo, `setupModal` acepta callbacks `onOpen`/`onClose`.

// Markup del modal. `children` es el HTML interior (form, lista, lo que sea) y
// va tal cual: quien llame es responsable de escapar los datos que meta ahi
// (mismo contrato que el resto de components/ que reciben markup).
//
// `size` mapea al max-width del panel; por defecto `md`, que es el que usan los
// tres modales existentes.
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

// Conecta abrir/cerrar sobre el markup de `modalComponent`. Devuelve
// { open, close } y expone `titleEl` por si la vista cambia el titulo entre
// "Crear"/"Editar" (como hacen periods y categories).
//
// `onOpen(triggerEl)` / `onClose()` son los enganches para el estado propio de
// la vista (poblar campos, form.reset(), limpiar seleccion). Se ejecutan dentro
// del ciclo de animacion, en el mismo punto donde los tres modales originales
// lo hacian.
export const setupModal = (id, { onOpen, onClose } = {}) => {
  const modal = document.getElementById(id);
  if (!modal) return { open: () => {}, close: () => {}, modal: null, titleEl: null };

  const titleEl = document.getElementById(`${id}-title`);
  // `close` se referencia dentro de `modalA11y` (para el Esc) antes de estar
  // definida, por eso el wrapper en flecha: se resuelve en tiempo de llamada.
  const a11y = setupModalA11y(modal, () => close());

  const open = (triggerEl) => {
    modal.classList.remove("hidden");
    a11y.onOpen(triggerEl);
    onOpen?.(triggerEl);
    // 10ms: deja que el navegador pinte el estado inicial (hidden->flex,
    // opacity-0, scale-95) antes de transicionar, si no la animacion no corre.
    setTimeout(() => {
      modal.classList.remove("opacity-0");
      modal.firstElementChild.classList.remove("scale-95");
    }, 10);
  };

  const close = () => {
    modal.classList.add("opacity-0");
    modal.firstElementChild.classList.add("scale-95");
    // 300ms: coincide con `duration-300` de la transicion; recien ahi se
    // oculta del todo y se limpia el estado de la vista.
    setTimeout(() => {
      modal.classList.add("hidden");
      onClose?.();
    }, 300);
    a11y.onClose();
  };

  return { open, close, modal, titleEl };
};
