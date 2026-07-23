import { escapeHtml } from "../utils/validators";

export const dropdownComponent = (id, options, selectedValue, placeholder = "Seleccionar...") => {
  const selectedOption = options.find(opt => opt.value === selectedValue) || options[0];
  const selectedText = selectedOption ? selectedOption.label : placeholder;

  return `
    <div class="relative inline-block text-left w-full" id="${id}-container">
      <input type="hidden" id="${id}" value="${escapeHtml(selectedValue || selectedOption?.value || '')}">
      <button type="button" id="${id}-btn" aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}-menu" class="inline-flex w-full justify-between items-center gap-2 cursor-pointer rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-sm font-medium text-[var(--text-main)] shadow-sm hover:border-[var(--brand-hover)] focus:outline-none focus:ring-4 focus:ring-[var(--border-main)] transition-all duration-200">
        <span id="${id}-text">${escapeHtml(selectedText)}</span>
        <svg class="h-4 w-4 text-[var(--text-muted)] transition-transform duration-200" id="${id}-icon" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div id="${id}-menu" role="listbox" aria-labelledby="${id}-btn" tabindex="-1" class="absolute left-0 z-50 mt-2 w-full origin-top-left rounded-2xl bg-[var(--bg-panel)] shadow-xl ring-1 ring-black/5 focus:outline-none hidden border border-[var(--border-main)] overflow-hidden transform opacity-0 transition-all duration-200 scale-95">
        <div class="py-1 max-h-60 overflow-y-auto">
          ${options.map(opt => `
            <button type="button" role="option" aria-selected="${opt.value === selectedValue ? 'true' : 'false'}" class="${id}-option block w-full px-4 py-3 text-left text-sm text-[var(--text-main)] hover:bg-[var(--bg-base)] focus:bg-[var(--bg-base)] focus:text-[var(--brand-bg)] focus:outline-none hover:text-[var(--brand-bg)] transition-colors cursor-pointer" data-value="${escapeHtml(opt.value)}">
              ${escapeHtml(opt.label)}
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
};

// Single module-level listener: the router recreates containers on every
// navigation, so per-dropdown listeners piled up on `document`.
const registeredDropdowns = new Set();
let globalClickListenerAttached = false;

const closeDropdownsOutsideOf = (target) => {
  registeredDropdowns.forEach((entry) => {
    if (!document.contains(entry.container)) {
      registeredDropdowns.delete(entry);
      return;
    }
    if (!entry.container.contains(target)) entry.close();
  });
};

const registerDropdown = (container, close) => {
  registeredDropdowns.add({ container, close });
  if (globalClickListenerAttached) return;
  globalClickListenerAttached = true;
  document.addEventListener("click", (e) => closeDropdownsOutsideOf(e.target));
};

/**
 * Selects an option programmatically. Needed because this is not a native
 * `<select>`: setting `.value` only updates the hidden input, leaving the
 * visible label stuck on the placeholder.
 *
 * @returns {boolean} false if the dropdown or option doesn't exist. Never throws.
 */
export const setDropdownValue = (id, value) => {
  const input = document.getElementById(id);
  const text = document.getElementById(`${id}-text`);
  if (!input || !text) return false;

  const option = document.querySelector(`.${id}-option[data-value="${CSS.escape(String(value))}"]`);
  if (!option) return false;

  input.value = value;
  text.textContent = option.textContent.trim();

  document.querySelectorAll(`.${id}-option`).forEach((o) => o.setAttribute("aria-selected", "false"));
  option.setAttribute("aria-selected", "true");
  return true;
};

export const setupDropdown = (id, onChangeCallback = null) => {
  const container = document.getElementById(`${id}-container`);
  const btn = document.getElementById(`${id}-btn`);
  const menu = document.getElementById(`${id}-menu`);
  const text = document.getElementById(`${id}-text`);
  const input = document.getElementById(id);
  const icon = document.getElementById(`${id}-icon`);
  
  if (!container || !btn || !menu) return;
  if (container.dataset.initialized === 'true') return;
  container.dataset.initialized = 'true';

  const toggleMenu = (show) => {
    if (show) {
      menu.classList.remove("hidden");
      // Trigger reflow
      void menu.offsetWidth;
      menu.classList.remove("opacity-0", "scale-95");
      menu.classList.add("opacity-100", "scale-100");
      icon.classList.add("rotate-180");
      btn.setAttribute("aria-expanded", "true");
    } else {
      menu.classList.remove("opacity-100", "scale-100");
      menu.classList.add("opacity-0", "scale-95");
      icon.classList.remove("rotate-180");
      btn.setAttribute("aria-expanded", "false");
      setTimeout(() => {
        menu.classList.add("hidden");
      }, 200);
    }
  };

  // Keyboard navigation
  const options = Array.from(document.querySelectorAll(`.${id}-option`));
  
  btn.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      toggleMenu(true);
      if (options.length > 0) options[0].focus();
    } else if (e.key === "Escape") {
      toggleMenu(false);
    }
  });

  menu.addEventListener("keydown", (e) => {
    const currentIndex = options.indexOf(document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = (currentIndex + 1) % options.length;
      options[next].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (currentIndex - 1 + options.length) % options.length;
      options[prev].focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      toggleMenu(false);
      btn.focus();
    }
  });

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isHidden = menu.classList.contains("hidden");
    toggleMenu(isHidden);
  });
  
  // Close on outside click
  registerDropdown(container, () => toggleMenu(false));

  document.querySelectorAll(`.${id}-option`).forEach(opt => {
    opt.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const val = e.target.getAttribute("data-value");
      const label = e.target.textContent.trim();
      
      
      text.textContent = label;
      if (input) input.value = val;

      // Update aria-selected
      options.forEach(o => o.setAttribute("aria-selected", "false"));
      e.target.setAttribute("aria-selected", "true");

      toggleMenu(false);
      btn.focus();
      
      if (onChangeCallback) {
        onChangeCallback(val);
      }
      
      // Notify other listeners
      if (input) {
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
};
