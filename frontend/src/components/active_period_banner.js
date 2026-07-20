export const activePeriodBannerComponent = (activePeriod) => {
  if (!activePeriod) return "";

  return `
    <div id="active-period-banner" class="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-amber-100/30 dark:bg-amber-900/20 p-4 border border-[#ffd54f] dark:border-amber-700/50 text-[#856404] dark:text-amber-200 shadow-sm transition-all duration-300">
      <div class="flex items-center gap-3">
        <div class="flex-shrink-0 bg-[#ffe082] dark:bg-amber-800/50 p-2 rounded-full text-[#b71c1c] dark:text-amber-400">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <div>
          <p class="font-bold text-sm tracking-wide">Periodo Activo: <span class="text-[#b71c1c] dark:text-amber-400">${activePeriod.name}</span></p>
          <p class="text-xs font-medium opacity-90 mt-0.5">No puedes modificar ni eliminar plantillas mientras haya un periodo en curso.</p>
        </div>
      </div>
      <button id="btn-close-period" class="shrink-0 rounded-xl bg-[#ffe082] px-5 py-2.5 text-sm font-bold text-[#b71c1c] transition hover:bg-[#ffb300] shadow-sm dark:bg-amber-800/50 dark:text-white dark:hover:bg-amber-600/70">
        Desactivar periodo actual
      </button>
    </div>
  `;
};
