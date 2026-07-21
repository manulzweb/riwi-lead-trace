import { escapeHtml } from "../utils/validators.js";

// Estilos por familia semantica. Los colores salen de los tokens de
// global.css, que ya cambian solos en dark mode: por eso no hay variantes
// `dark:` aqui.
const SUCCESS = { text: "text-[var(--success-text)]", bg: "bg-[var(--success-bg)]", dot: "bg-[var(--success-dot)]" };
const WARNING = { text: "text-[var(--warning-text)]", bg: "bg-[var(--warning-bg)]", dot: "bg-[var(--warning-dot)]" };
const INFO = { text: "text-[var(--info-text)]", bg: "bg-[var(--info-bg)]", dot: "bg-[var(--info-dot)]" };
const DANGER = { text: "text-[var(--danger-text)]", bg: "bg-[var(--danger-bg)]", dot: "bg-[var(--danger-dot)]" };
const NEUTRAL = { text: "text-[var(--text-muted)]", bg: "bg-[var(--bg-base)]", dot: "bg-[var(--text-muted)]" };

export const statusBadgeComponent = ({ status, variant = 'text' }) => {
  const config = {
    // Estados de evaluaciones
    "Completada": SUCCESS,
    "En progreso": INFO,
    "Pendiente": WARNING,

    // Estados de formularios
    "Activa": SUCCESS,
    "Inactiva": DANGER,

    // Estados de ciclos
    // "Cerrado" es un estado neutro (no semantico).
    "Cerrado": NEUTRAL,

    // Estados de métricas ICP
    "Sólido": SUCCESS,
    "En riesgo": DANGER,
    "Estable": WARNING
  };

  // Fallback neutro para estados no catalogados: mismos tokens que "Cerrado".
  const style = config[status] || NEUTRAL;
  // `status` hoy siempre viene de literales del codigo, pero se escapa igual:
  // el valor entra en un template que se inyecta con innerHTML.
  const label = escapeHtml(status);

  if (variant === 'dot') {
    return `
      <span class="inline-flex items-center gap-1.5 text-xs font-medium ${style.text} ${style.bg} px-2 py-1 rounded-md">
        <span class="w-1.5 h-1.5 rounded-full ${style.dot}"></span>
        ${label}
      </span>
    `;
  }

  // default variant 'text' (el diseño original de p)
  return `
    <p class="text-xs font-bold uppercase tracking-[0.25em] ${style.text}">${label}</p>
  `;
};
