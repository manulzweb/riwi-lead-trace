import { describe, it, expect } from 'vitest';
import { setupPagination } from './pagination';

describe('setupPagination', () => {
  // Regresion: una vista async (p.ej. my-results) captura su contenedor y, si el
  // router re-renderiza durante un await lento, el contenedor queda detached y
  // `document.getElementById` devuelve null. setupPagination recibia ese null y
  // reventaba con "Cannot set properties of null (setting 'innerHTML')",
  // abortando toda la carga. El componente compartido no debe lanzar: si no hay
  // contenedor, no hay nada que pintar.
  it('no lanza cuando el contenedor es null (vista desmontada)', () => {
    expect(() =>
      setupPagination({
        data: [{ comment: 'hay datos que paginar' }],
        container: null,
        renderItem: (item) => `<p>${item.comment}</p>`,
      })
    ).not.toThrow();
  });

  it('no lanza con contenedor null aunque no haya datos', () => {
    expect(() =>
      setupPagination({ data: [], container: null, renderItem: () => '' })
    ).not.toThrow();
  });
});
