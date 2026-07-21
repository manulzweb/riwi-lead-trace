export const Card = ({ children, className = "" }) => `
  <div class="group bg-[var(--bg-panel)] rounded-[2rem] border border-[var(--border-main)] shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-[var(--brand-hover)] relative ${className}">
    <div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent dark:from-white/5 pointer-events-none"></div>
    <div class="relative z-10">${children}</div>
  </div>
`;

export const StatsCard = ({ title, value, icon, description = "", trend = null }) => {
  let trendHtml = "";
  if (trend) {
    const isPositive = trend > 0;
    const trendColor = isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
    const trendIcon = isPositive 
      ? '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>'
      : '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>';
    
    trendHtml = `
      <div class="flex items-center gap-1 ${trendColor} text-xs font-medium">
        ${trendIcon}
        <span>${Math.abs(trend)}%</span>
      </div>
    `;
  }

  return Card({
    className: "p-6 sm:p-8 flex flex-col justify-between hover:-translate-y-1",
    children: `
      <div class="flex items-start justify-between">
        <div class="p-3 bg-[var(--bg-base)] rounded-2xl border border-[var(--border-main)] text-[var(--brand-bg)] shadow-sm group-hover:bg-[var(--brand-bg)] group-hover:bg-opacity-10 group-hover:text-[var(--brand-hover)] group-hover:border-[var(--brand-bg)] group-hover:border-opacity-30 transition-all duration-300">
          ${icon}
        </div>
        ${trendHtml}
      </div>
      <div class="mt-6">
        <h3 class="text-[var(--text-muted)] text-sm font-bold uppercase tracking-wider">${title}</h3>
        <div class="flex items-baseline gap-2 mt-2">
          <p class="text-4xl font-black text-[var(--text-main)] tracking-tight">${value}</p>
        </div>
        ${description ? `<p class="text-[var(--text-muted)] text-sm mt-2 font-medium opacity-80">${description}</p>` : ''}
      </div>
    `
  });
};

