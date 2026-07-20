export const Card = ({ children, className = "" }) => `
  <div class="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-main)] shadow-sm overflow-hidden ${className}">
    ${children}
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
    className: "p-6",
    children: `
      <div class="flex items-center justify-between">
        <div class="p-2 bg-[var(--bg-base)] rounded-lg">
          ${icon}
        </div>
        ${trendHtml}
      </div>
      <div class="mt-4">
        <h3 class="text-[var(--text-muted)] text-sm font-medium">${title}</h3>
        <div class="flex items-baseline gap-2 mt-1">
          <p class="text-2xl font-bold text-[var(--text-main)]">${value}</p>
        </div>
        ${description ? `<p class="text-[var(--text-muted)] text-xs mt-1">${description}</p>` : ''}
      </div>
    `
  });
};

