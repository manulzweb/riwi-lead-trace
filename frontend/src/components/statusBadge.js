export const statusBadgeComponent = ({ status, variant = 'text' }) => {
  const config = {
    // Estados de evaluaciones
    "Completada": { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", dot: "bg-emerald-500 dark:bg-emerald-400" },
    "En progreso": { text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10", dot: "bg-blue-500 dark:bg-blue-400" },
    "Pendiente": { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", dot: "bg-amber-500 dark:bg-amber-400" },
    
    // Estados de plantillas
    "Activa": { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", dot: "bg-emerald-500 dark:bg-emerald-400" },
    "Inactiva": { text: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10", dot: "bg-red-500 dark:bg-red-400" },

    // Estados de ciclos
    "Cerrado": { text: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-500/10", dot: "bg-slate-500 dark:bg-slate-400" },

    // Estados de métricas ICP
    "Sólido": { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", dot: "bg-emerald-500 dark:bg-emerald-400" },
    "En riesgo": { text: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10", dot: "bg-red-500 dark:bg-red-400" },
    "Estable": { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", dot: "bg-amber-500 dark:bg-amber-400" }
  };

  const style = config[status] || { text: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-500/10", dot: "bg-slate-500 dark:bg-slate-400" };

  if (variant === 'dot') {
    return `
      <span class="inline-flex items-center gap-1.5 text-xs font-medium ${style.text} ${style.bg} px-2 py-1 rounded-md">
        <span class="w-1.5 h-1.5 rounded-full ${style.dot}"></span>
        ${status}
      </span>
    `;
  }

  // default variant 'text' (el diseño original de p)
  return `
    <p class="text-xs font-bold uppercase tracking-[0.25em] ${style.text}">${status}</p>
  `;
};
