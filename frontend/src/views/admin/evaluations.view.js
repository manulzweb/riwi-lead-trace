import { navBarComponent } from "../../components/navbar";
import { statusBadgeComponent } from "../../components/statusBadge.js";
import { showToast, showConfirm } from "../../components/alerts";
import { escapeHtml } from "../../utils/validators";
import { dropdownComponent, setupDropdown } from "../../components/dropdown";
import { formsService } from "../../services/forms.service.js";
import { categoryService } from "../../services/categories.service.js";
import { periodService } from "../../services/periods.service.js";
import { authService } from "../../services/auth.service";
import { formatDate } from "../../utils/date";
import { searchBoxComponent, setupSearch } from "../../components/searchBox";
import { activePeriodBannerComponent } from "../../components/active_period_banner.js";
import { emptyStateComponent } from "../../components/emptyState.js";

export const renderAdminEvaluations = () => `
  ${navBarComponent()}
  <main class="mx-auto max-w-7xl px-6 py-10 relative">
    <div class="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Admin · Formularios</p>
        <h1 class="mt-1 text-4xl font-black tracking-tight text-[var(--text-main)] font-heading">Gestión de Formularios</h1>
        <p class="mt-4 text-[var(--text-muted)] max-w-2xl text-sm leading-relaxed">
          Crea, edita y duplica los formularios de evaluación. Los formularios se pueden reutilizar en múltiples ciclos de evaluación.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button id="btn-quick-period"
          class="inline-flex items-center gap-2 rounded-2xl border border-[var(--brand-bg)] bg-transparent px-5 py-3 text-sm font-bold text-[var(--brand-bg)] transition-all hover:bg-[var(--brand-bg)] hover:text-[var(--brand-text)] focus:ring-4 focus:ring-[var(--border-main)]">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          Abrir Nuevo Periodo
        </button>
        <button id="btn-new-form"
          class="inline-flex items-center gap-2 rounded-2xl bg-[var(--brand-bg)] px-5 py-3 text-sm font-bold text-[var(--brand-text)] transition-all hover:bg-[var(--brand-hover)] hover:shadow-lg hover:shadow-[var(--brand-bg)]/20 focus:ring-4 focus:ring-[var(--border-main)]">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Nuevo Formulario
        </button>
      </div>
    </div>
    <div id="active-period-banner-container"></div>
    
    <!-- 1. VISTA LISTA DE PLANTILLAS -->
    <div id="list-view" class="block transition-all duration-300">
      <div id="form-search-slot" class="mb-6 max-w-sm"></div>
      <div id="forms-container" class="mt-8" aria-live="polite" aria-busy="true">
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          ${Array(3).fill(`
            <div class="flex flex-col justify-between rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-sm h-48">
              <div>
                <div class="flex items-center justify-between mb-4">
                  <div class="h-6 w-24 skeleton-shimmer rounded-full"></div>
                  <div class="h-4 w-12 skeleton-shimmer rounded-sm"></div>
                </div>
                <div class="h-7 w-3/4 skeleton-shimmer rounded-md"></div>
                <div class="h-4 w-full skeleton-shimmer rounded-sm mt-2"></div>
              </div>
              <div class="mt-6 pt-4 border-t border-[var(--border-main)] flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="h-4 w-16 skeleton-shimmer rounded-full"></div>
                  <div class="h-4 w-20 skeleton-shimmer rounded-sm"></div>
                </div>
                <div class="flex items-center gap-2">
                  <div class="h-6 w-6 skeleton-shimmer rounded-full"></div>
                  <div class="h-6 w-6 skeleton-shimmer rounded-full"></div>
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>

    <!-- 2. VISTA CONSTRUCTOR DE PLANTILLAS -->
    <div id="builder-view" class="hidden transition-all duration-300">
      <section class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <button id="btn-back" class="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--brand-bg)] transition-colors cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            Volver
          </button>
          <h1 class="text-3xl font-black font-heading tracking-tight text-[var(--text-main)]">Constructor de Formulario</h1>
        </div>
        <div class="flex items-center gap-4">
          <div id="weight-counter" class="text-sm font-bold text-[var(--text-muted)] bg-[var(--bg-base)] px-4 py-2 rounded-2xl border border-[var(--border-main)]">
            Puntos: <span id="total-weight-value" class="text-lg">0</span> / 100
          </div>
          <button id="btn-save-form" class="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--brand-bg)] px-6 py-3 text-sm font-bold text-[var(--brand-text)] transition-all duration-300 ease-in-out hover:bg-[var(--brand-hover)] hover:shadow-md cursor-pointer">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            Guardar Formulario
          </button>
        </div>
      </section>

      <!-- Configuracion Principal -->
      <section class="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-8 shadow-sm mb-6">
        <div class="grid gap-6">
          <div>
            <label class="mb-2 block text-sm font-bold text-[var(--text-main)]">Título de la Evaluación</label>
            <input type="text" id="form-title" placeholder="Ej. Evaluación de Desempeño Q3" class="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-hover)]/20 text-lg font-medium" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-bold text-[var(--text-main)]">Descripción / Instrucciones (Opcional)</label>
            <textarea id="form-desc" rows="2" placeholder="Instrucciones para quien llena el formulario..." class="w-full resize-none rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] p-4 text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-hover)]/20"></textarea>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="mb-2 block text-sm font-bold text-[var(--text-main)]">Rol Evaluador (Quién llena la encuesta)</label>
              <div>
                ${dropdownComponent('evaluator-role', [
  { value: 'coder', label: 'Coders' },
  { value: 'team_leader', label: 'Team Leaders' },
  { value: 'tutor', label: 'Tutores' }
], 'coder')}
              </div>
            </div>
            <div>
              <label class="mb-2 block text-sm font-bold text-[var(--text-main)]">Rol a Evaluar (A quién se evalúa)</label>
              <div>
                ${dropdownComponent('form-role', [
  { value: 'tutor', label: 'Tutores' },
  { value: 'team_leader', label: 'Team Leaders' }
], 'tutor')}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Contenedor de Preguntas -->
      <div id="questions-container" class="space-y-6">
        <!-- Las preguntas se renderizan aquí -->
      </div>

      <!-- Botón Agregar Pregunta -->
      <button id="btn-add-question" class="mt-6 flex w-full items-center justify-center gap-2 rounded-[2rem] border-2 border-dashed border-[var(--border-main)] bg-transparent py-6 text-[var(--text-muted)] hover:border-[var(--brand-bg)] hover:text-[var(--brand-bg)] hover:bg-[var(--brand-bg)]/5 transition-all duration-300 cursor-pointer font-bold">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Añadir Pregunta
      </button>

    </div>

    <!-- Modal Form for New Period (Quick Create) -->
    <div id="quick-period-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm hidden opacity-0 transition-opacity duration-300">
      <div role="dialog" aria-modal="true" aria-labelledby="quick-period-modal-title" class="w-full max-w-md scale-95 transform rounded-3xl bg-[var(--bg-panel)] p-8 shadow-2xl transition-transform duration-300 border border-[var(--border-main)]">
        <h2 id="quick-period-modal-title" class="mb-6 text-2xl font-bold font-heading text-[var(--text-main)]">Abrir Nuevo Ciclo Rápidamente</h2>
        <form id="form-quick-period">
          <div class="mb-4">
            <label for="quick-period-name" class="mb-2 block text-sm font-semibold text-[var(--text-main)]">Nombre del Ciclo</label>
            <input required id="quick-period-name" type="text" placeholder="Ej. Q3 2026" class="w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-sm text-[var(--text-main)] transition-all focus:border-[var(--brand-bg)] focus:bg-[var(--bg-panel)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-bg)]/10" />
          </div>
          <div class="mb-4">
            <label for="quick-period-start" class="mb-2 block text-sm font-semibold text-[var(--text-main)]">Fecha de Inicio</label>
            <input required id="quick-period-start" type="date" class="w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-sm text-[var(--text-main)] transition-all focus:border-[var(--brand-bg)] focus:bg-[var(--bg-panel)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-bg)]/10" />
          </div>
          <div class="mb-6">
            <label for="quick-period-end" class="mb-2 block text-sm font-semibold text-[var(--text-main)]">Fecha de Fin</label>
            <input required id="quick-period-end" type="date" class="w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-sm text-[var(--text-main)] transition-all focus:border-[var(--brand-bg)] focus:bg-[var(--bg-panel)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-bg)]/10" />
          </div>
          <div class="flex items-center gap-3">
            <button type="button" id="btn-cancel-quick-period" class="w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-panel)] py-3 font-semibold text-[var(--text-muted)] transition-all hover:bg-[var(--bg-base)] hover:text-[var(--text-main)] cursor-pointer">Cancelar</button>
            <button type="submit" class="w-full rounded-xl bg-[var(--brand-bg)] py-3 font-bold text-[var(--brand-text)] transition-all hover:bg-[var(--brand-hover)] cursor-pointer">Guardar e Iniciar</button>
          </div>
        </form>
      </div>
    </div>
  </main>
`;

export const setupAdminEvaluations = () => {
  // --- ELEMENTOS DOM ---
  const viewList = document.getElementById("list-view");
  const viewBuilder = document.getElementById("builder-view");
  const btnCreate = document.getElementById("btn-new-form");
  const btnBack = document.getElementById("btn-back");
  const btnAddQuestion = document.getElementById("btn-add-question");
  const btnSave = document.getElementById("btn-save-form");
  const questionsContainer = document.getElementById("questions-container");
  const formsContainer = document.getElementById("forms-container");

  // Inputs principales
  const inputTitle = document.getElementById("form-title");
  const inputDesc = document.getElementById("form-desc");
  const selectRole = document.getElementById("form-role");

  // Modal rápido de periodos
  const btnQuickPeriod = document.getElementById("btn-quick-period");
  const quickPeriodModal = document.getElementById("quick-period-modal");
  const formQuickPeriod = document.getElementById("form-quick-period");
  const btnCancelQuickPeriod = document.getElementById("btn-cancel-quick-period");

  // --- ESTADO (Memoria) ---
  let questions = [];
  let editId = null;
  let originalQuestions = [];
  let categoriesData = [];
  let hasActivePeriod = false;

  // El backend rechaza crear/editar/borrar formularios y preguntas mientras
  // haya un periodo activo (ver question_service._assert_no_active_period).
  // Se consulta acá para avisar antes de que el admin llegue al error.
  const refreshPeriodGate = async () => {
    const bannerContainer = document.getElementById("active-period-banner-container");
    let activePeriod = null;

    try {
      const periods = await periodService.get();
      activePeriod = periods.find(p => p.is_active);
      hasActivePeriod = !!activePeriod;
    } catch (err) {
      hasActivePeriod = false;
    }

    if (bannerContainer) {
      if (activePeriod) {
        bannerContainer.innerHTML = activePeriodBannerComponent(activePeriod);

        const closeBtn = document.getElementById("btn-close-period");
        if (closeBtn) {
          closeBtn.addEventListener("click", async () => {
            if (await showConfirm("¿Estás seguro de que deseas cerrar este periodo? Las evaluaciones pendientes ya no se podrán responder.")) {
              try {
                await periodService.update(activePeriod.id, { is_active: false });
                import("../../components/alerts.js").then(({ showToast }) => {
                  showToast("Periodo cerrado", "success", "Ya puedes gestionar las formularios libremente.");
                });
                refreshPeriodGate();
              } catch (e) {
                import("../../components/alerts.js").then(({ showToast }) => {
                  showToast("Error", "error", "No se pudo cerrar el periodo.");
                });
                console.error(e);
              }
            }
          });
        }
      } else {
        bannerContainer.innerHTML = "";
      }
    }

    btnCreate.disabled = hasActivePeriod;
    btnCreate.classList.toggle("opacity-50", hasActivePeriod);
    btnCreate.classList.toggle("cursor-not-allowed", hasActivePeriod);
    btnCreate.title = hasActivePeriod ? "Cierra el periodo activo para poder crear formularios." : "";
    
    if (btnQuickPeriod) {
      btnQuickPeriod.disabled = hasActivePeriod;
      btnQuickPeriod.classList.toggle("opacity-50", hasActivePeriod);
      btnQuickPeriod.classList.toggle("cursor-not-allowed", hasActivePeriod);
      btnQuickPeriod.title = hasActivePeriod ? "Ya hay un periodo activo. Ciérralo primero." : "";
    }
    
    if (btnSave) {
      btnSave.disabled = hasActivePeriod;
      btnSave.classList.toggle("opacity-50", hasActivePeriod);
      btnSave.classList.toggle("cursor-not-allowed", hasActivePeriod);
      btnSave.title = hasActivePeriod ? "Cierra el periodo activo para poder guardar cambios." : "";
    }
  };

  // --- Lógica del modal rápido de periodos ---
  if (btnQuickPeriod && quickPeriodModal) {
    const closeQuickModal = () => {
      quickPeriodModal.classList.add("opacity-0");
      quickPeriodModal.firstElementChild.classList.add("scale-95");
      setTimeout(() => {
        quickPeriodModal.classList.add("hidden");
        formQuickPeriod.reset();
      }, 300);
    };

    btnQuickPeriod.addEventListener("click", () => {
      if (hasActivePeriod) return;
      quickPeriodModal.classList.remove("hidden");
      setTimeout(() => {
        quickPeriodModal.classList.remove("opacity-0");
        quickPeriodModal.firstElementChild.classList.remove("scale-95");
      }, 10);
    });

    btnCancelQuickPeriod.addEventListener("click", closeQuickModal);

    formQuickPeriod.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById("quick-period-name").value.trim(),
        starts_at: document.getElementById("quick-period-start").value,
        ends_at: document.getElementById("quick-period-end").value,
        is_active: true // Auto activar el periodo
      };

      const btnSubmit = formQuickPeriod.querySelector("button[type='submit']");
      btnSubmit.disabled = true;
      btnSubmit.textContent = "Guardando...";

      try {
        await periodService.create(payload);
        showToast("¡Periodo abierto con éxito!", "success");
        closeQuickModal();
        await refreshPeriodGate(); // Refrescar el estado de la vista
      } catch (err) {
        showToast("Error", "error", err.message || "Error al crear el periodo");
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Guardar e Iniciar";
      }
    });
  }

  // --- LÓGICA DE VISTAS ---
  const showBuilder = async () => {
    viewList.classList.add("hidden");
    viewBuilder.classList.remove("hidden");
    setupDropdown('form-role');
    setupDropdown('evaluator-role');
    updateWeightCounter();
    await refreshPeriodGate();

    if (categoriesData.length === 0) {
      try {
        categoriesData = await categoryService.getCategories();
      } catch (err) {
        console.error("Error cargando categorías", err);
      }
    }
    renderQuestions(); // Re-render to populate category dropdowns
  };

  const showList = async () => {
    viewBuilder.classList.add("hidden");
    viewList.classList.remove("hidden");
    await renderFormsList();
  };

  btnCreate.addEventListener("click", async () => {
    if (hasActivePeriod) {
      showToast("Periodo activo", "warning", "Cierra el periodo activo para poder crear formularios.");
      return;
    }
    // Resetear constructor para nueva formulario
    editId = null;
    originalQuestions = [];
    inputTitle.value = "";
    inputDesc.value = "";
    selectRole.value = "tutor";
    document.getElementById("evaluator-role").value = "coder";
    questions = [{ id: Date.now().toString(), text: "", type: "scale_1_5", categoryId: 1, weight: 100 }];
    await showBuilder();
  });

  btnBack.addEventListener("click", showList);

  const updateWeightCounter = () => {
    const total = questions.reduce((sum, q) => sum + (parseInt(q.weight) || 0), 0);
    const counterSpan = document.getElementById("total-weight-value");
    if (counterSpan) {
      counterSpan.textContent = total;
      if (total === 100) {
        counterSpan.className = "text-lg text-emerald-500";
      } else if (total > 100) {
        counterSpan.className = "text-lg text-[var(--danger-text)]";
      } else {
        counterSpan.className = "text-lg text-[var(--text-main)]";
      }
    }
  };

  // --- LÓGICA DEL CONSTRUCTOR (Preguntas) ---
  const getQuestionIcon = (type) => {
    if (type === 'scale_1_5') return `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`;
    if (type === 'yes_no') return `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
    return `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/></svg>`;
  };

  const getQuestionPreview = (type) => {
    if (type === 'scale_1_5') {
      return `
        <div class="flex gap-2 opacity-50 pointer-events-none mt-3">
          ${[1, 2, 3, 4, 5].map(v => `<div class="w-10 h-10 rounded-lg border-2 border-[var(--border-main)] flex items-center justify-center font-bold text-xs">${v}</div>`).join('')}
        </div>`;
    }
    if (type === 'yes_no') {
      return `
        <div class="flex gap-2 opacity-50 pointer-events-none mt-3">
          <div class="px-6 py-2 rounded-lg border-2 border-[var(--border-main)] font-bold text-sm">Sí</div>
          <div class="px-6 py-2 rounded-lg border-2 border-[var(--border-main)] font-bold text-sm">No</div>
        </div>`;
    }
    return `
      <div class="w-full h-12 mt-3 rounded-xl border-2 border-dashed border-[var(--border-main)] opacity-50 pointer-events-none"></div>`;
  };

  let draggedIndex = null;

  const renderQuestions = () => {
    questionsContainer.innerHTML = "";
    questions.forEach((q, index) => {
      const card = document.createElement("div");
      card.className = "group relative rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-sm hover:border-[var(--brand-hover)] transition-all duration-300 cursor-move";
      card.draggable = true;
      card.dataset.index = index;

      card.innerHTML = `
        <div class="flex items-start justify-between gap-4">
          <div class="flex flex-col items-center gap-1">
            <svg class="w-5 h-5 text-[var(--border-main)] mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/></svg>
            <div class="flex items-center justify-center bg-[var(--bg-base)] w-8 h-8 rounded-lg border border-[var(--border-main)] text-[var(--text-muted)] font-bold text-xs">
              ${index + 1}
            </div>
          </div>
          
          <div class="flex-1">
            <input type="text" class="q-text-input w-full bg-transparent text-lg font-bold text-[var(--text-main)] focus:outline-none placeholder-[var(--text-muted)] cursor-text" placeholder="Escribe tu pregunta aquí..." value="${escapeHtml(q.text)}" data-id="${q.id}">
            
            <div class="mt-4 flex flex-wrap gap-4 items-center">
              <div class="w-64 relative cursor-default">
                ${dropdownComponent(`q-type-${q.id}`, [
        { value: 'scale_1_5', label: 'Escala (1-5)' },
        { value: 'yes_no', label: 'Sí / No' },
        { value: 'open_text', label: 'Texto Abierto' }
      ], q.type)}
                <div class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none z-10">
                  ${getQuestionIcon(q.type)}
                </div>
              </div>
              
              <div class="flex items-center gap-2 cursor-default">
                <label class="text-sm font-bold text-[var(--text-muted)]">Categoría:</label>
                <div class="w-48 relative">
                  ${dropdownComponent(`q-category-${q.id}`, categoriesData.map(c => ({ value: c.id, label: c.name })), q.categoryId || (categoriesData[0]?.id || 1))}
                </div>
              </div>

              <div class="flex items-center gap-2 cursor-default">
                <label class="text-sm font-bold text-[var(--text-muted)]">Puntos:</label>
                <input type="number" min="0" max="100" class="q-weight-input cursor-text w-24 rounded-xl border border-[var(--border-main)] bg-[var(--bg-base)] px-3 py-2 text-[var(--text-main)] font-bold focus:border-[var(--brand-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-bg)]/20 disabled:opacity-50" placeholder="0-100" value="${q.type === 'scale_1_5' ? (q.weight || 0) : 0}" data-id="${q.id}" ${q.type !== 'scale_1_5' ? 'disabled' : ''}>
              </div>
            </div>
            
            <!-- Vista Previa Visual -->
            <div class="cursor-default">
              ${getQuestionPreview(q.type)}
            </div>
          </div>
          
          <button class="btn-delete-q p-2 text-[var(--text-muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)] rounded-xl transition-colors cursor-pointer" data-id="${q.id}" title="Eliminar pregunta">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      `;

      // Eventos Drag and Drop
      card.addEventListener("dragstart", (e) => {
        draggedIndex = index;
        e.dataTransfer.effectAllowed = "move";
        setTimeout(() => card.classList.add("opacity-40", "scale-95"), 0);
      });

      card.addEventListener("dragend", () => {
        card.classList.remove("opacity-40", "scale-95");
      });

      card.addEventListener("dragover", (e) => {
        e.preventDefault();
        card.classList.add("border-[var(--brand-bg)]", "border-2");
      });

      card.addEventListener("dragleave", () => {
        card.classList.remove("border-[var(--brand-bg)]", "border-2");
      });

      card.addEventListener("drop", (e) => {
        e.preventDefault();
        card.classList.remove("border-[var(--brand-bg)]", "border-2");
        if (draggedIndex !== null && draggedIndex !== index) {
          const draggedItem = questions[draggedIndex];
          questions.splice(draggedIndex, 1);
          questions.splice(index, 0, draggedItem);
          renderQuestions();
          updateWeightCounter();
        }
      });

      questionsContainer.appendChild(card);
    });

    // Eventos dentro de las tarjetas
    document.querySelectorAll(".q-text-input").forEach(input => {
      input.addEventListener("input", (e) => {
        const id = e.target.dataset.id;
        const q = questions.find(item => item.id === id);
        if (q) q.text = e.target.value;
      });
    });

    document.querySelectorAll(".q-weight-input").forEach(input => {
      input.addEventListener("input", (e) => {
        const id = e.target.dataset.id;
        const q = questions.find(item => item.id === id);
        if (q) {
          let val = parseInt(e.target.value) || 0;
          if (val < 0) {
            val = 0;
            e.target.value = 0;
          }
          q.weight = val;
          updateWeightCounter();
        }
      });
    });

    // Re-initialize dropdown logic for newly rendered components
    questions.forEach(q => {
      setupDropdown(`q-type-${q.id}`, (val) => {
        q.type = val;
        if (q.type !== 'scale_1_5') q.weight = 0;
        renderQuestions();
        updateWeightCounter();
      });
      setupDropdown(`q-category-${q.id}`, (val) => {
        q.categoryId = parseInt(val);
      });

      const btn = document.getElementById(`q-type-${q.id}-btn`);
      if (btn) btn.classList.add("pl-10");
    });

    document.querySelectorAll(".btn-delete-q").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        questions = questions.filter(item => item.id !== id);
        renderQuestions();
        updateWeightCounter();
      });
    });
  };

  btnAddQuestion.addEventListener("click", () => {
    questions.push({
      id: Date.now().toString(),
      text: "",
      type: "scale_1_5",
      categoryId: categoriesData.length > 0 ? categoriesData[0].id : 1,
      weight: 0
    });
    renderQuestions();
    updateWeightCounter();
  });

  // --- GUARDADO ---
  btnSave.addEventListener("click", async () => {
    if (hasActivePeriod) {
      showToast("Periodo activo", "warning", "Cierra el periodo activo para poder guardar cambios.");
      return;
    }

    const title = inputTitle.value.trim();
    if (!title) {
      showToast("Falta el título", "error", "Debes darle un título a la formulario.");
      return;
    }

    if (questions.length === 0) {
      showToast("Sin preguntas", "error", "La formulario debe tener al menos una pregunta.");
      return;
    }

    // Validar que las preguntas tengan texto
    const emptyQ = questions.find(q => !q.text.trim());
    if (emptyQ) {
      showToast("Pregunta vacía", "error", "Hay preguntas sin texto. Por favor completa todas.");
      return;
    }

    // Validar suma de puntos (100)
    const totalWeight = questions.reduce((sum, q) => sum + (parseInt(q.weight) || 0), 0);
    const hasScale = questions.some(q => q.type === 'scale_1_5');

    if (hasScale && totalWeight !== 100) {
      if (totalWeight < 100) {
        showToast("Faltan puntos", "warning", `La suma total es ${totalWeight}. Debes sumar exactamente 100.`);
      } else {
        showToast("Sobran puntos", "warning", `La suma total es ${totalWeight}. Has superado el límite de 100.`);
      }
      return;
    }

    // Preparar objeto para enviar a la BD (pasando por forms.service.js)
    const formattedQuestions = questions.map(q => ({
      id: q.id,
      text: q.text,
      categoryId: parseInt(q.categoryId),
      type: q.type,
      weight: parseFloat(q.weight) || 0
    }));

    const formData = {
      title,
      description: inputDesc.value.trim(),
      targetRole: document.getElementById("form-role").value,
      questions: formattedQuestions,
      adminId: authService.getSession()?.id,
    };
    if (editId) {
      formData.id = editId;
      formData.originalQuestions = originalQuestions;

      // El texto de una pregunta ya usada no se sobreescribe: se versiona
      // (fila nueva, la vieja queda is_active=FALSE) -- es irreversible desde
      // la UI. Avisamos antes de mandarlo, en vez de que sea automático.
      const changedTexts = formattedQuestions.filter(q => {
        const original = originalQuestions.find(o => o.id === q.id);
        return original && original.text !== q.text;
      });
      if (changedTexts.length > 0) {
        const confirmed = await showConfirm(
          `Vas a reformular el texto de ${changedTexts.length} pregunta(s) ya usada(s). ` +
          `Esto crea una nueva versión y no se puede deshacer (la anterior queda inactiva). ¿Continuar?`
        );
        if (!confirmed) return;
      }
    }

    // Se llama solo si la IA objeta la coherencia texto<->categoria de
    // una pregunta puntual (ver forms.service.js.updateForm) --
    // muestra su razon real, no un aviso generico.
    // Se declara FUERA del try a proposito: el catch del 409 reintenta el
    // guardado tras cerrar el periodo y necesita pasar este mismo callback.
    // Declarada dentro del try quedaba fuera de alcance ahi (ReferenceError).
    const onCoherenceConfirm = async (question, aiMessage) => await showConfirm(
      `${escapeHtml(aiMessage || "La IA no está segura de que el nuevo texto siga encajando en su categoría.")}\n\n` +
      `¿Guardar de todas formas?`
    );

    try {
      btnSave.disabled = true;
      btnSave.innerHTML = "Guardando...";

      if (editId) {
        await formsService.updateForm(editId, formData, onCoherenceConfirm);
      } else {
        await formsService.createForm(formData);
      }

      showToast("Formulario Guardada", "success");
      await showList();
    } catch (error) {
      // No es un error HTTP: es el aborto interno que lanza forms.service.js
      // cuando el admin no confirma el versionado del texto (por eso se mira
      // .cancelled y no .status/.detail).
      if (error.cancelled) {
        showToast("Guardado cancelado", "warning", "No se confirmó el cambio de texto; no se guardó nada.");
      } else if (error.status === 409) {
        const closeIt = await showConfirm("Periodo Activo", "Para editar este formulario, primero debes cerrar el periodo activo actual. ¿Deseas cerrarlo automáticamente ahora?", "warning");
        if (closeIt) {
          try {
            const { periodService } = await import("../../services/periods.service.js");
            const periods = await periodService.get();
            const activePeriod = periods.find(p => p.is_active);
            if (activePeriod) {
              await periodService.update(activePeriod.id, { is_active: false });
              await formsService.updateForm(editId, formData, onCoherenceConfirm);
              showToast("Periodo cerrado y formulario guardado", "success");
              // Antes llamaba a closeBuilder(), que no existe en este archivo
              // (ReferenceError). showList() ya oculta el constructor y
              // recarga la lista, que era la intencion.
              await showList();
            }
          } catch (err) {
            showToast("Error", "error", "No se pudo cerrar el periodo o guardar el formulario.");
            console.error(err);
          }
        }
      } else {
        showToast("Error", "error", "No se pudo guardar el formulario.");
      }
      console.error(error);
    } finally {
      btnSave.disabled = false;
      btnSave.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Guardar Formulario`;
    }
  });


  // --- RENDERIZADO DE LA LISTA ---
  let allForms = [];
  const formSearchSlot = document.getElementById("form-search-slot");

  const renderFormCards = (forms) => {
    if (forms.length === 0) {
      formsContainer.innerHTML = emptyStateComponent(
        allForms.length === 0 ? "No hay formularios" : "Sin resultados",
        allForms.length === 0 ? "Comienza creando un nuevo formulario de evaluación." : "Ningún formulario coincide con la búsqueda."
      );
      return;
    }

    formsContainer.innerHTML = `
      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        ${forms.map(t => {
      const statusText = t.is_active ? 'Activa' : 'Inactiva';
      const dateStr = formatDate(t.created_at) || 'Fecha no disponible';

      return `
          <div class="group flex flex-col justify-between rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-sm hover:border-[var(--brand-hover)] transition-all duration-300 hover:shadow-md cursor-pointer btn-edit-form" data-id="${t.id}">
            <div>
              <div class="flex items-center justify-between mb-4">
                <span class="inline-flex items-center rounded-full bg-[var(--brand-bg)]/10 px-3 py-1 text-xs font-bold text-[var(--brand-bg)] capitalize">
                  🎯 Para: ${escapeHtml((t.targetRole || t.target_role || '').replace('_', ' '))}
                </span>
                <span class="text-xs text-[var(--text-muted)] font-medium shrink-0 ml-2">
                  ${t.questions ? t.questions.length : 0} preg.
                </span>
              </div>
              ${t.is_form ? `
                <span class="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-2" title="Es una formulario base: no recibe respuestas hasta que se use para crear un formulario activo.">
                  📋 Formulario base
                </span>
              ` : ''}
              <h3 class="text-xl font-bold text-[var(--text-main)] font-heading leading-tight">${escapeHtml(t.title)}</h3>
              <p class="mt-2 text-sm text-[var(--text-muted)] line-clamp-2">${escapeHtml(t.description || 'Sin descripción')}</p>
            </div>
            
            <div class="mt-6 pt-4 border-t border-[var(--border-main)] flex items-center justify-between">
              <div class="flex items-center gap-3">
                ${statusBadgeComponent({ status: statusText, variant: 'dot' })}
                ${dateStr ? `<span class="text-xs font-medium text-[var(--text-muted)]">${dateStr}</span>` : ''}
              </div>
              <div class="flex items-center">
                <button class="btn-clone-form text-[var(--text-muted)] hover:text-[var(--brand-bg)] transition-colors p-2" data-id="${t.id}" title="Duplicar Formulario">
                  <svg class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                </button>
                <button class="btn-delete-form text-[var(--text-muted)] hover:text-[var(--danger-text)] transition-colors p-2 -mr-2" data-id="${t.id}" title="Eliminar">
                  <svg class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
          </div>
          `;
    }).join('')}
      </div>
    `;

    // Eventos para editar
    document.querySelectorAll(".btn-edit-form").forEach(card => {
      card.addEventListener("click", async (e) => {
        // Evitar que el click en el botón de borrar o duplicar active la edición normal
        if (e.target.closest('.btn-delete-form') || e.target.closest('.btn-clone-form')) return;

        const id = card.dataset.id;
        try {
          const forms = await formsService.getForms();
          const form = forms.find(t => t.id === id || t.id === parseInt(id));

          if (form) {
            editId = form.id;
            inputTitle.value = form.title;
            inputDesc.value = form.description || "";

            // dropdownComponent update requires us to use the specific DOM ID and maybe dispatch change
            const evaluatorRoleEl = document.getElementById("evaluator-role");
            if (evaluatorRoleEl) { evaluatorRoleEl.value = form.evaluatorRole || "coder"; }
            if (selectRole) { selectRole.value = form.targetRole || form.target_role || "tutor"; }

            // getFormForEdit trae el weight_percent real (GET /forms no lo expone) y
            // convierte input_type/category_id al formato que usa el constructor visual.
            const editData = await formsService.getFormForEdit(form);
            questions = editData.questions.map(q => ({
              id: q.id,
              text: q.text,
              type: q.type,
              categoryId: q.categoryId,
              weight: q.weight,
            }));
            // Snapshot para que updateForm() pueda diferenciar qué preguntas
            // se agregaron/quitaron/reformularon al guardar.
            originalQuestions = editData.questions.map(q => ({ id: q.id, text: q.text }));

            renderQuestions();
            showBuilder();
          }
        } catch (error) {
          showToast("Error", "error", "Error al cargar la formulario para editar.");
        }
      });
    });

    // Eventos para duplicar
    document.querySelectorAll(".btn-clone-form").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation(); // Prevenir que abra modo edición
        const id = btn.dataset.id;
        try {
          const forms = await formsService.getForms();
          const form = forms.find(t => t.id === id || t.id === parseInt(id));

          if (form) {
            editId = null; // Important: this makes it a new form!
            originalQuestions = [];
            inputTitle.value = "Copia de " + form.title;
            inputDesc.value = form.description || "";

            const evaluatorRoleEl = document.getElementById("evaluator-role");
            if (evaluatorRoleEl) { evaluatorRoleEl.value = form.evaluatorRole || "coder"; }
            if (selectRole) { selectRole.value = form.targetRole || form.target_role || "tutor"; }

            // Reset IDs for the cloned questions (mismo mapeo que el modo edición,
            // ver getFormForEdit, pero con IDs nuevos para que se creen como preguntas nuevas)
            const editData = await formsService.getFormForEdit(form);
            questions = editData.questions.map(q => ({
              id: (Date.now() + Math.random()).toString(),
              text: q.text,
              type: q.type,
              categoryId: q.categoryId,
              weight: q.weight,
            }));

            renderQuestions();
            showBuilder();
            showToast("Formulario duplicado", "success", "Ahora estás creando un nuevo formulario basado en el anterior.");
          }
        } catch (error) {
          showToast("Error", "error", "Error al duplicar el formulario.");
        }
      });
    });

    // Eventos para borrar
    document.querySelectorAll(".btn-delete-form").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = e.target.dataset.id || e.target.closest('.btn-delete-form').dataset.id;
        if (await showConfirm("¿Estás seguro de que deseas eliminar este formulario?")) {
          try {
            await formsService.deleteForm(id);
            showToast("Formulario eliminado", "success");
            renderFormsList();
          } catch (error) {
            if (error.status === 409) {
              const closeIt = await showConfirm("Periodo Activo", "Para eliminar este formulario, primero debes cerrar el periodo activo actual. ¿Deseas cerrarlo automáticamente ahora?", "warning");
              if (closeIt) {
                try {
                  const { periodService } = await import("../../services/periods.service.js");
                  const periods = await periodService.get();
                  const activePeriod = periods.find(p => p.is_active);
                  if (activePeriod) {
                    await periodService.update(activePeriod.id, { is_active: false });
                    await formsService.deleteForm(id);
                    showToast("Periodo cerrado y formulario eliminado", "success");
                    renderFormsList();
                  }
                } catch (err) {
                  showToast("Error", "error", "No se pudo cerrar el periodo o eliminar el formulario.");
                }
              }
            } else {
              showToast("Error", "error", "No se pudo eliminar el formulario.");
            }
          }
        }
      });
    });
  };

  const renderFormsList = async () => {
    try {
      allForms = await formsService.getForms();
    } catch (error) {
      showToast("Error", "error", "No se pudieron cargar las formularios.");
      console.error(error);
      formsContainer.innerHTML = `
        <section class="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-12 text-center shadow-sm">
          <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--danger-bg)] text-[var(--danger-text)] mb-4">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
          </div>
          <h3 class="text-xl font-bold text-[var(--text-main)]">No se pudieron cargar las formularios</h3>
          <p class="mt-2 text-[var(--text-muted)] max-w-md mx-auto">Revisa tu conexión e intenta de nuevo.</p>
          <button id="btn-retry-forms" class="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[var(--brand-bg)] px-5 py-3 text-sm font-bold text-[var(--brand-text)] transition-all hover:bg-[var(--brand-hover)] cursor-pointer">
            Reintentar
          </button>
        </section>
      `;
      document.getElementById("btn-retry-forms")?.addEventListener("click", renderFormsList);
      return;
    }

    renderFormCards(allForms);

    if (formSearchSlot) {
      // Se regenera para no acumular listeners de recargas anteriores.
      formSearchSlot.innerHTML = searchBoxComponent('form-search', 'Buscar formulario por título...');
      setupSearch('form-search', allForms, ['title', 'description'], renderFormCards);
    }
  };

  // Inicializar mostrando la lista
  refreshPeriodGate();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('action') === 'create') {
    showBuilder();
  } else {
    renderFormsList();
  }
};
