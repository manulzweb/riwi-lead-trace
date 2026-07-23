import { escapeHtml } from "../utils/validators.js";

/**
 * Sanitizes the action button target.
 *
 * escapeHtml is NOT enough for an href: a javascript: URL has nothing to
 * escape and would survive intact, so the scheme is validated too. Only what
 * this component needs is allowed: internal routes, anchors and http(s)/mailto.
 *
 * @returns {string|null} the original href if safe, null otherwise.
 */
const toSafeHref = (href) => {
  const raw = String(href ?? "").trim();
  if (!raw) return null;

  // Browsers ignore control characters embedded in the scheme (a tab inside
  // it still runs), so they are stripped before deciding. Compared by char
  // code to avoid depending on escapes.
  const normalized = Array.from(raw)
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join("")
    .toLowerCase();

  if (normalized.startsWith("/") || normalized.startsWith("#")) return raw;
  if (/^(https?:|mailto:)/.test(normalized)) return raw;

  return null;
};

export const emptyStateComponent = (title = "Sin resultados", message = "No hay datos para mostrar por ahora.", actionLabel = null, actionHref = null) => {
  const safeHref = toSafeHref(actionHref);

  return `
    <div class="col-span-full text-center py-16 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-3xl p-10 shadow-lg w-full flex flex-col items-center justify-center transition-all hover:shadow-xl hover:-translate-y-1">
      <div class="mb-6 opacity-80 transition-transform duration-300 hover:scale-110 hover:opacity-100">
        <svg class="w-32 h-32 mx-auto text-[var(--border-main)] dark:text-[var(--bg-base)]" fill="currentColor" viewBox="0 0 24 24">
          <!-- Abstract "empty data" vector illustration -->
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
          <path fill="var(--brand-bg)" opacity="0.3" d="M12 4C7.58 4 4 7.58 4 12s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm-1 5h2v6h-2zm0 8h2v2h-2z" />
        </svg>
      </div>
      <h3 class="text-xl font-bold text-[var(--text-main)]">${escapeHtml(title)}</h3>
      <p class="mt-2 text-[var(--text-muted)]">${escapeHtml(message)}</p>
      ${actionLabel && safeHref ? `
      <a class="mt-6 inline-flex items-center justify-center rounded-2xl bg-[var(--brand-bg)] px-5 py-3 text-sm font-bold text-[var(--brand-text)] hover:bg-[var(--brand-hover)] transition shadow-md hover:scale-105" href="${escapeHtml(safeHref)}">
        ${escapeHtml(actionLabel)}
      </a>
      ` : ''}
    </div>
  `;
};
