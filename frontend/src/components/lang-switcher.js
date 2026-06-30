/**
 * Selector de idioma ES / EN.
 * La lógica de cambio de idioma se conecta en setupLangSwitcher().
 * @param {"es"|"en"} active - idioma activo por defecto
 */
export const langSwitcherComponent = (active = "es") => `
  <div class="absolute top-4 right-4 z-50 md:top-8 md:right-8">
    <div class="flex items-center gap-1 rounded-full border border-white/20 bg-white/95 p-1 text-xs font-medium shadow-xl backdrop-blur-xl sm:text-sm">
      <button
        id="lang-es"
        class="rounded-full px-4 py-1.5 font-bold transition-all ${active === "es" ? "bg-[var(--brand-bg)] text-white shadow-md scale-105" : "text-[var(--text-muted)] hover:bg-[var(--bg-base)] hover:text-[var(--text-main)]"}"
      >ES</button>
      <button
        id="lang-en"
        class="rounded-full px-4 py-1.5 font-bold transition-all ${active === "en" ? "bg-[var(--brand-bg)] text-white shadow-md scale-105" : "text-[var(--text-muted)] hover:bg-[var(--bg-base)] hover:text-[var(--text-main)]"}"
      >EN</button>
    </div>
  </div>
`;

export const setupLangSwitcher = () => {
  const btnEs = document.getElementById("lang-es");
  const btnEn = document.getElementById("lang-en");
  if (!btnEs || !btnEn) return;

  const activate = (lang) => {
    const active   = "rounded-full px-4 py-1.5 font-bold transition-all bg-[var(--brand-bg)] text-white shadow-md scale-105";
    const inactive = "rounded-full px-4 py-1.5 font-bold transition-all text-[var(--text-muted)] hover:bg-[var(--bg-base)] hover:text-[var(--text-main)]";
    btnEs.className = lang === "es" ? active : inactive;
    btnEn.className = lang === "en" ? active : inactive;
    document.documentElement.lang = lang;
  };

  btnEs.addEventListener("click", () => activate("es"));
  btnEn.addEventListener("click", () => activate("en"));
};
