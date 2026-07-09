const LANGS = ["es", "en"];

const buttonClass = (isActive) =>
  isActive
    ? "rounded-full px-4 py-1.5 font-bold transition-all bg-[var(--brand-bg)] text-white shadow-md scale-105"
    : "rounded-full px-4 py-1.5 font-bold transition-all text-[var(--text-muted)] hover:bg-[var(--bg-base)] hover:text-[var(--text-main)]";

const langButton = (lang, active) => `
  <button type="button" data-lang="${lang}" class="${buttonClass(lang === active)}">
    ${lang.toUpperCase()}
  </button>`;

export const langSwitcherComponent = (active = "es") => `
  <div id="lang-switcher" class="absolute top-4 right-4 z-50 md:top-8 md:right-8">
    <div class="flex items-center gap-1 rounded-full border border-white/20 bg-white/95 p-1 text-xs font-medium shadow-xl backdrop-blur-xl sm:text-sm">
      ${LANGS.map((lang) => langButton(lang, active)).join("")}
    </div>
  </div>`;

const applyLanguage = (container, lang) => {
  container.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.className = buttonClass(btn.dataset.lang === lang);
  });
  document.documentElement.lang = lang;
};

export const setupLangSwitcher = () => {
  const container = document.getElementById("lang-switcher");
  if (!container) return;

  // Delegación: un solo listener; closest() encuentra el botón clicado.
  container.addEventListener("click", (event) => {
    const button = event.target.closest("[data-lang]");
    if (!button) return;
    applyLanguage(container, button.dataset.lang);
  });
};
