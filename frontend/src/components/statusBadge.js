import { escapeHtml } from "../utils/validators.js";

// Styles by semantic family. Colors come from global.css tokens, which already
// switch in dark mode, so there are no dark: variants here.
const SUCCESS = { text: "text-[var(--success-text)]", bg: "bg-[var(--success-bg)]", dot: "bg-[var(--success-dot)]" };
const WARNING = { text: "text-[var(--warning-text)]", bg: "bg-[var(--warning-bg)]", dot: "bg-[var(--warning-dot)]" };
const INFO = { text: "text-[var(--info-text)]", bg: "bg-[var(--info-bg)]", dot: "bg-[var(--info-dot)]" };
const DANGER = { text: "text-[var(--danger-text)]", bg: "bg-[var(--danger-bg)]", dot: "bg-[var(--danger-dot)]" };
const NEUTRAL = { text: "text-[var(--text-muted)]", bg: "bg-[var(--bg-base)]", dot: "bg-[var(--text-muted)]" };

export const statusBadgeComponent = ({ status, variant = 'text' }) => {
  const config = {
    // Evaluation statuses
    "Completada": SUCCESS,
    "En progreso": INFO,
    "Pendiente": WARNING,

    // Form statuses
    "Activa": SUCCESS,
    "Inactiva": DANGER,

    // Period statuses: closed is neutral, not semantic.
    "Cerrado": NEUTRAL,

    // ICP metric statuses
    "Sólido": SUCCESS,
    "En riesgo": DANGER,
    "Estable": WARNING
  };

  // Neutral fallback for uncatalogued statuses.
  const style = config[status] || NEUTRAL;
  // status always comes from code literals today, but it is escaped anyway:
  // the value lands in a template injected with innerHTML.
  const label = escapeHtml(status);

  if (variant === 'dot') {
    return `
      <span class="inline-flex items-center gap-1.5 text-xs font-medium ${style.text} ${style.bg} px-2 py-1 rounded-md">
        <span class="w-1.5 h-1.5 rounded-full ${style.dot}"></span>
        ${label}
      </span>
    `;
  }

  // Default variant 'text'.
  return `
    <p class="text-xs font-bold uppercase tracking-[0.25em] ${style.text}">${label}</p>
  `;
};
