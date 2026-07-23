import { describe, it, expect } from 'vitest';
import { setupPagination } from './pagination';

describe('setupPagination', () => {
  // Regression: if the router re-renders during a slow await, the container an
  // async view captured is detached and lookups return null. setupPagination
  // then threw on innerHTML and aborted the whole load. No container, nothing
  // to paint: it must not throw.
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
