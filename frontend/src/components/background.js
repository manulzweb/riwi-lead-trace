/**
 * Fondo responsive: imagen vertical en móvil, horizontal en escritorio.
 * @param {string} vertical  - ruta de la imagen para móvil
 * @param {string} horizontal - ruta de la imagen para escritorio
 */
export const backgroundComponent = (
  vertical   = "/backgrounds/fondo-vertical.webp",
  horizontal = "/backgrounds/fondo-horizontal.webp"
) => `
  <div class="absolute inset-0 -z-10">
    <img
      alt="Fondo"
      src="${vertical}"
      class="absolute inset-0 h-full w-full object-cover md:hidden"
    />
    <img
      alt="Fondo"
      src="${horizontal}"
      class="absolute inset-0 hidden h-full w-full object-cover md:block"
    />
  </div>
`;
