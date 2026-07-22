/**
 * A collection of reusable SVG icons and helper functions to generate icons.
 */

/**
 * Returns a styled medal icon based on the rank (1 = Gold, 2 = Silver, 3 = Bronze)
 * If rank is > 3, returns null or empty string.
 */
export const getMedalIcon = (rank, className = "w-6 h-6") => {
  if (rank === 1) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}"><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 14.7v4.6"/></svg>`;
  }
  if (rank === 2) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#B8B8B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}"><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M10.4 15.6c.4-.6 1-.9 1.7-.9.8 0 1.4.4 1.4 1 0 .6-.3.9-1.1 1.5l-1.8 1.3H14"/></svg>`;
  }
  if (rank === 3) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#B87333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}"><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M10.5 15h2c.6 0 1 .3 1 .8s-.4.8-1 .8"/><path d="M12.5 16.6c.8 0 1.2.4 1.2 1s-.5 1-1.4 1c-.6 0-1.1-.2-1.5-.6"/></svg>`;
  }
  return '';
};
