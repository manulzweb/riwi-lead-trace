import re

file_path = r'C:\Users\manue\Documents\Tutor\riwi-lead-trace\frontend\src\views\admin\metrics.view.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update HTML: Add search bar and pagination controls
old_html = """      <!-- ----- Resultados detallados ----- -->
      <section class="mt-10">
        <h2 class="text-2xl font-bold text-[var(--text-main)] mb-6">Resultados Detallados</h2>
        <div id="metrics-grid" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-live="polite">"""

new_html = """      <!-- ----- Resultados detallados ----- -->
      <section class="mt-10">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-[var(--text-main)]">Resultados Detallados</h2>
          <div class="print:hidden">
            <input type="text" id="search-evaluatee" placeholder="Buscar por nombre o rol..." class="px-4 py-2 rounded-xl border border-[var(--border-main)] bg-[var(--bg-panel)] text-[var(--text-main)] text-sm focus:outline-none focus:border-[var(--brand-bg)] w-64 transition-all">
          </div>
        </div>
        <div id="metrics-grid" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-live="polite">"""
content = content.replace(old_html, new_html)

old_html_end = """        </div>
      </section>"""
new_html_end = """        </div>
        <div id="pagination-controls" class="mt-8 flex justify-center items-center gap-4 print:hidden"></div>
      </section>"""
content = content.replace(old_html_end, new_html_end)

# 2. Add globals for pagination & search
old_vars = """  let currentRealCohortFilter = "all";
  let currentClanFilter = "all";
  const historyCharts = new Map();"""
new_vars = """  let currentRealCohortFilter = "all";
  let currentClanFilter = "all";
  let searchQuery = "";
  let currentPage = 1;
  const itemsPerPage = 6;
  let currentFilteredList = [];
  const historyCharts = new Map();"""
content = content.replace(old_vars, new_vars)

# 3. Handle Print events
old_init_call = """  await initPeriods();

  function renderHighlights(list) {"""
new_init_call = """  
  const searchInput = document.getElementById("search-evaluatee");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase();
      currentPage = 1;
      updateGrid();
    });
  }

  window.addEventListener("beforeprint", () => {
    updateGrid(true); // render all before print
  });
  window.addEventListener("afterprint", () => {
    updateGrid(false); // restore pagination after print
  });

  await initPeriods();

  function renderHighlights(list) {"""
content = content.replace(old_init_call, new_init_call)

# 4. Refactor grid rendering to a separate function
old_render_grid = """      renderHighlights(list);

      if (list.length === 0) {
        gridContainer.innerHTML = emptyStateComponent(
          "Sin resultados",
          "No se encontraron líderes o tutores con este filtro."
        );
        return;
      }

      const hasValidScores = list.some(e => e.average_score !== null);
      if (!hasValidScores) {
        gridContainer.innerHTML = emptyStateComponent(
          "Esperando más evaluaciones",
          "Aún no hay suficientes datos. Debemos recibir un mínimo de evaluaciones (al menos 3 por persona) para poder calcular y mostrar las métricas del ICP."
        );
        return;
      }

      gridContainer.innerHTML = list.map(ev => {
        const scoreText = ev.average_score !== null ? `${ev.average_score}` : "--";

        // Badge neutro por defecto: tokens, no grises literales de Tailwind
        // (bg-gray-*/text-gray-* no reaccionan al tema y rompen el dark mode).
        let statusBadgeClass = "bg-[var(--bg-base)] text-[var(--text-muted)]";
        if (ev.status === "Sólido") statusBadgeClass = "bg-[var(--success-bg)] text-[var(--success-text)]";
        if (ev.status === "En riesgo") statusBadgeClass = "bg-[var(--danger-bg)] text-[var(--danger-text)]";
        if (ev.status === "Estable") statusBadgeClass = "bg-[var(--warning-bg)] text-[var(--warning-text)]";

        return `
          <article class="metrics-card rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-md transition-all hover:shadow-lg cursor-pointer" data-id="${ev.id}" data-period="${periodId}">
            <div class="flex items-start justify-between pointer-events-none">
              <div>
                <h3 class="text-lg font-bold text-[var(--text-main)]">${escapeHtml(ev.name)}</h3>
                <p class="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">${escapeHtml(ev.role.replace('_', ' '))}</p>
              </div>
              <span class="rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass}">${escapeHtml(ev.status)}</span>
            </div>

            <div class="mt-6 flex justify-between items-end border-t border-[var(--border-main)] pt-4 pointer-events-none">
              <div>
                <p class="text-xs text-[var(--text-muted)]">Evaluaciones</p>
                <p class="text-sm mt-1 text-[var(--text-main)]">${ev.n_evals}</p>
              </div>
              <div class="text-right">
                <p class="text-xs text-[var(--text-muted)]">ICP</p>
                <p class="text-3xl font-black text-[var(--brand-bg)] mt-1">${scoreText}</p>
              </div>
            </div>

            <button class="btn-toggle-detail mt-4 w-full text-center text-xs font-semibold text-[var(--brand-bg)] pointer-events-none">
              Ver detalle
            </button>
            <div id="detail-${ev.id}" data-detail-panel class="mt-4 hidden border-t border-[var(--border-main)] pt-4 cursor-default"></div>
          </article>
        `;
      }).join("");

      document.querySelectorAll(".metrics-card").forEach(card => {
        card.addEventListener("click", () => toggleDetail(card));
        // Un click dentro del panel de detalle no debe plegar la tarjeta.
        // Antes era un `onclick="event.stopPropagation()"` inline en el markup.
        card.querySelector("[data-detail-panel]")
          ?.addEventListener("click", (e) => e.stopPropagation());
      });

    } catch (err) {"""

new_render_grid = """      currentFilteredList = list;
      renderHighlights(currentFilteredList);
      currentPage = 1;
      updateGrid();

    } catch (err) {"""
content = content.replace(old_render_grid, new_render_grid)


# 5. Add updateGrid function
update_grid_fn = """  function updateGrid(isPrint = false) {
    const paginationContainer = document.getElementById("pagination-controls");
    let finalData = currentFilteredList;
    
    if (searchQuery) {
      finalData = finalData.filter(e => 
        e.name.toLowerCase().includes(searchQuery) ||
        e.role.replace('_', ' ').toLowerCase().includes(searchQuery)
      );
    }
    
    if (finalData.length === 0) {
      gridContainer.innerHTML = emptyStateComponent(
        "Sin resultados",
        "No se encontraron resultados con estos filtros."
      );
      if (paginationContainer) paginationContainer.innerHTML = "";
      return;
    }

    const hasValidScores = finalData.some(e => e.average_score !== null);
    if (!hasValidScores) {
      gridContainer.innerHTML = emptyStateComponent(
        "Esperando más evaluaciones",
        "Aún no hay suficientes datos para calcular métricas."
      );
      if (paginationContainer) paginationContainer.innerHTML = "";
      return;
    }

    const totalPages = Math.ceil(finalData.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;
    
    let displayData = finalData;
    if (!isPrint) {
      const startIndex = (currentPage - 1) * itemsPerPage;
      displayData = finalData.slice(startIndex, startIndex + itemsPerPage);
    }

    gridContainer.innerHTML = displayData.map(ev => {
      const scoreText = ev.average_score !== null ? `${ev.average_score}` : "--";
      let statusBadgeClass = "bg-[var(--bg-base)] text-[var(--text-muted)]";
      if (ev.status === "Sólido") statusBadgeClass = "bg-[var(--success-bg)] text-[var(--success-text)]";
      if (ev.status === "En riesgo") statusBadgeClass = "bg-[var(--danger-bg)] text-[var(--danger-text)]";
      if (ev.status === "Estable") statusBadgeClass = "bg-[var(--warning-bg)] text-[var(--warning-text)]";

      return `
        <article class="metrics-card rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-md transition-all hover:shadow-lg cursor-pointer" data-id="${ev.id}" data-period="${currentPeriodId}">
          <div class="flex items-start justify-between pointer-events-none">
            <div>
              <h3 class="text-lg font-bold text-[var(--text-main)]">${escapeHtml(ev.name)}</h3>
              <p class="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">${escapeHtml(ev.role.replace('_', ' '))}</p>
            </div>
            <span class="rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass}">${escapeHtml(ev.status)}</span>
          </div>

          <div class="mt-6 flex justify-between items-end border-t border-[var(--border-main)] pt-4 pointer-events-none">
            <div>
              <p class="text-xs text-[var(--text-muted)]">Evaluaciones</p>
              <p class="text-sm mt-1 text-[var(--text-main)]">${ev.n_evals}</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-[var(--text-muted)]">ICP</p>
              <p class="text-3xl font-black text-[var(--brand-bg)] mt-1">${scoreText}</p>
            </div>
          </div>

          <button class="btn-toggle-detail mt-4 w-full text-center text-xs font-semibold text-[var(--brand-bg)] pointer-events-none">
            Ver detalle
          </button>
          <div id="detail-${ev.id}" data-detail-panel class="mt-4 hidden border-t border-[var(--border-main)] pt-4 cursor-default"></div>
        </article>
      `;
    }).join("");

    document.querySelectorAll(".metrics-card").forEach(card => {
      card.addEventListener("click", () => toggleDetail(card));
      card.querySelector("[data-detail-panel]")?.addEventListener("click", (e) => e.stopPropagation());
    });

    // Render pagination
    if (paginationContainer) {
      if (isPrint || totalPages <= 1) {
        paginationContainer.innerHTML = "";
      } else {
        paginationContainer.innerHTML = `
          <button id="btn-prev-page" class="px-4 py-2 rounded-xl border border-[var(--border-main)] bg-[var(--bg-panel)] text-sm font-semibold text-[var(--text-main)] disabled:opacity-50 transition-colors hover:bg-[var(--bg-base)]" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>
          <span class="text-sm font-semibold text-[var(--text-muted)]">Página ${currentPage} de ${totalPages}</span>
          <button id="btn-next-page" class="px-4 py-2 rounded-xl border border-[var(--border-main)] bg-[var(--bg-panel)] text-sm font-semibold text-[var(--text-main)] disabled:opacity-50 transition-colors hover:bg-[var(--bg-base)]" ${currentPage === totalPages ? 'disabled' : ''}>Siguiente</button>
        `;
        document.getElementById("btn-prev-page")?.addEventListener("click", () => {
          if (currentPage > 1) { currentPage--; updateGrid(); }
        });
        document.getElementById("btn-next-page")?.addEventListener("click", () => {
          if (currentPage < totalPages) { currentPage++; updateGrid(); }
        });
      }
    }
  }

  // Desglose por categoria"""
content = content.replace("  // Desglose por categoria", update_grid_fn)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
