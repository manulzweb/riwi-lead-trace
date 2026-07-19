import { navBarComponent } from "../../components/navbar";
import { statusBadgeComponent } from "../../components/statusBadge.js";
import { showToast } from "../../components/alerts";
import { escapeHtml } from "../../utils/validators";
import { dropdownComponent, setupDropdown } from "../../components/dropdown";
import { templatesService } from "../../services/templates.service.js";
import { categoryService } from "../../services/categories.service.js";
import { periodService } from "../../services/periods.service.js";

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
      <button id="btn-new-template"
        class="inline-flex items-center gap-2 rounded-2xl bg-[var(--brand-bg)] px-5 py-3 text-sm font-bold text-[var(--brand-text)] transition-all hover:bg-[var(--brand-hover)] hover:shadow-lg hover:shadow-[var(--brand-bg)]/20 focus:ring-4 focus:ring-[var(--border-main)]">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Nuevo Formulario
      </button>
    </div>

    <div id="active-period-banner" class="hidden mb-6 flex items-center gap-3 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-5 py-4 text-sm font-semibold text-[var(--danger-text)]">
      <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
      Hay un periodo activo. Los formularios y preguntas solo se pueden crear, editar o eliminar con el periodo cerrado.
    </div>

    <!-- 1. VISTA LISTA DE PLANTILLAS -->
    <div id="list-view" class="block transition-all duration-300">
      <div id="templates-container">
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div class="h-48 animate-pulse rounded-[2rem] bg-[var(--bg-panel)]"></div>
          <div class="h-48 animate-pulse rounded-[2rem] bg-[var(--bg-panel)]"></div>
          <div class="h-48 animate-pulse rounded-[2rem] bg-[var(--bg-panel)]"></div>
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
          <button id="btn-save-template" class="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--brand-bg)] px-6 py-3 text-sm font-bold text-[var(--brand-text)] transition-all duration-300 ease-in-out hover:bg-[var(--brand-hover)] hover:shadow-md cursor-pointer">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            Guardar Plantilla
          </button>
        </div>
      </section>

      <!-- Configuracion Principal -->
      <section class="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-8 shadow-sm mb-6">
        <div class="grid gap-6">
          <div>
            <label class="mb-2 block text-sm font-bold text-[var(--text-main)]">Título de la Evaluación</label>
            <input type="text" id="template-title" placeholder="Ej. Evaluación de Desempeño Q3" class="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-hover)]/20 text-lg font-medium" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-bold text-[var(--text-main)]">Descripción / Instrucciones (Opcional)</label>
            <textarea id="template-desc" rows="2" placeholder="Instrucciones para quien llena el formulario..." class="w-full resize-none rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] p-4 text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-hover)]/20"></textarea>
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
                ${dropdownComponent('template-role', [
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
  </main>
`;

export const setupAdminEvaluations = () => {
  // --- ELEMENTOS DOM ---
  const viewList = document.getElementById("list-view");
  const viewBuilder = document.getElementById("builder-view");
  const btnCreate = document.getElementById("btn-new-template");
  const btnBack = document.getElementById("btn-back");
  const btnAddQuestion = document.getElementById("btn-add-question");
  const btnSave = document.getElementById("btn-save-template");
  const questionsContainer = document.getElementById("questions-container");
  const templatesContainer = document.getElementById("templates-container");

  // Inputs principales
  const inputTitle = document.getElementById("template-title");
  const inputDesc = document.getElementById("template-desc");
  const selectRole = document.getElementById("template-role");

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
    const banner = document.getElementById("active-period-banner");
    try {
      const periods = await periodService.get();
      hasActivePeriod = periods.some(p => p.is_active);
    } catch (err) {
      hasActivePeriod = false; // si falla la consulta, no bloqueamos -- el backend igual lo valida
    }
    if (banner) banner.classList.toggle("hidden", !hasActivePeriod);
    btnCreate.disabled = hasActivePeriod;
    btnCreate.classList.toggle("opacity-50", hasActivePeriod);
    btnCreate.classList.toggle("cursor-not-allowed", hasActivePeriod);
    btnCreate.title = hasActivePeriod ? "Cierra el periodo activo para poder crear formularios." : "";
    if (btnSave) {
      btnSave.disabled = hasActivePeriod;
      btnSave.classList.toggle("opacity-50", hasActivePeriod);
      btnSave.classList.toggle("cursor-not-allowed", hasActivePeriod);
      btnSave.title = hasActivePeriod ? "Cierra el periodo activo para poder guardar cambios." : "";
    }
  };

  // --- LÓGICA DE VISTAS ---
  const showBuilder = async () => {
    viewList.classList.add("hidden");
    viewBuilder.classList.remove("hidden");
    setupDropdown('template-role');
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
    await renderTemplatesList();
  };

  btnCreate.addEventListener("click", async () => {
    if (hasActivePeriod) {
      showToast("Periodo activo", "warning", "Cierra el periodo activo para poder crear formularios.");
      return;
    }
    // Resetear constructor para nueva plantilla
    editId = null;
    originalQuestions = [];
    inputTitle.value = "";
    inputDesc.value = "";
    selectRole.value = "tutor";
    document.getElementById("evaluator-role").value = "coder";
    questions = [{ id: Date.now().toString(), text: "", input_type: "scale_1_5", category_id: 1, weight: 100 }];
    await showBuilder();
  });

  btnBack.addEventListener("click", showList);

  const updateWeightCounter = () => {
    const total = questions.reduce((sum, q) => sum + (parseInt(q.weight) || 0), 0);
    const counterSpan = document.getElementById("total-weight-value");
    if(counterSpan) {
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
          ${[1,2,3,4,5].map(v => `<div class="w-10 h-10 rounded-lg border-2 border-[var(--border-main)] flex items-center justify-center font-bold text-xs">${v}</div>`).join('')}
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

  const renderQuestions = () => {
    questionsContainer.innerHTML = "";
    questions.forEach((q, index) => {
      const card = document.createElement("div");
      card.className = "group relative rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-sm hover:border-[var(--brand-hover)] transition-all duration-300";
      
      card.innerHTML = `
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-center gap-3 bg-[var(--bg-base)] px-3 py-1.5 rounded-lg border border-[var(--border-main)] text-[var(--text-muted)] font-bold text-xs">
            ${index + 1}
          </div>
          
          <div class="flex-1">
            <input type="text" class="q-text-input w-full bg-transparent text-lg font-bold text-[var(--text-main)] focus:outline-none placeholder-[var(--text-muted)]" placeholder="Escribe tu pregunta aquí..." value="${escapeHtml(q.text)}" data-id="${q.id}">
            
            <div class="mt-4 flex flex-wrap gap-4 items-center">
              <div class="w-64 relative">
                ${dropdownComponent(`q-type-${q.id}`, [
                  {value: 'scale_1_5', label: 'Escala (1-5)'},
                  {value: 'yes_no', label: 'Sí / No'},
                  {value: 'open_text', label: 'Texto Abierto'}
                ], q.input_type)}
                <div class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none z-10">
                  ${getQuestionIcon(q.input_type)}
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <label class="text-sm font-bold text-[var(--text-muted)]">Categoría:</label>
                <div class="w-48 relative">
                  ${dropdownComponent(`q-category-${q.id}`, categoriesData.map(c => ({ value: c.id, label: c.name })), q.category_id || (categoriesData[0]?.id || 1))}
                </div>
              </div>

              <div class="flex items-center gap-2">
                <label class="text-sm font-bold text-[var(--text-muted)]">Puntos:</label>
                <input type="number" min="0" max="100" class="q-weight-input w-24 rounded-xl border border-[var(--border-main)] bg-[var(--bg-base)] px-3 py-2 text-[var(--text-main)] font-bold focus:border-[var(--brand-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-bg)]/20 disabled:opacity-50" placeholder="0-100" value="${q.input_type === 'scale_1_5' ? (q.weight || 0) : 0}" data-id="${q.id}" ${q.input_type !== 'scale_1_5' ? 'disabled' : ''}>
              </div>
            </div>
            
            <!-- Vista Previa Visual -->
            ${getQuestionPreview(q.input_type)}
          </div>
          
          <button class="btn-delete-q p-2 text-[var(--text-muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)] rounded-xl transition-colors cursor-pointer" data-id="${q.id}" title="Eliminar pregunta">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      `;

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
        q.input_type = val;
        if (q.input_type !== 'scale_1_5') q.weight = 0;
        renderQuestions();
        updateWeightCounter();
      });
      setupDropdown(`q-category-${q.id}`, (val) => {
        q.category_id = parseInt(val);
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
      input_type: "scale_1_5",
      category_id: categoriesData.length > 0 ? categoriesData[0].id : 1,
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
      showToast("Falta el título", "error", "Debes darle un título a la plantilla.");
      return;
    }

    if (questions.length === 0) {
      showToast("Sin preguntas", "error", "La plantilla debe tener al menos una pregunta.");
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
    const hasScale = questions.some(q => q.input_type === 'scale_1_5');
    
    if (hasScale && totalWeight !== 100) {
      if (totalWeight < 100) {
        showToast("Faltan puntos", "warning", `La suma total es ${totalWeight}. Debes sumar exactamente 100.`);
      } else {
        showToast("Sobran puntos", "warning", `La suma total es ${totalWeight}. Has superado el límite de 100.`);
      }
      return;
    }

    // Preparar objeto para enviar a la BD (pasando por templates.service.js)
    const formattedQuestions = questions.map(q => ({
      id: q.id,
      text: q.text,
      categoryId: parseInt(q.category_id),
      type: q.input_type,
      weight: parseFloat(q.weight) || 0
    }));

    const templateData = {
      title,
      description: inputDesc.value.trim(),
      targetRole: document.getElementById("template-role").value,
      questions: formattedQuestions
    };
    if (editId) {
      templateData.id = editId;
      templateData.originalQuestions = originalQuestions;

      // El texto de una pregunta ya usada no se sobreescribe: se versiona
      // (fila nueva, la vieja queda is_active=FALSE) -- es irreversible desde
      // la UI. Avisamos antes de mandarlo, en vez de que sea automático.
      const changedTexts = formattedQuestions.filter(q => {
        const original = originalQuestions.find(o => o.id === q.id);
        return original && original.text !== q.text;
      });
      if (changedTexts.length > 0) {
        const confirmed = confirm(
          `Vas a reformular el texto de ${changedTexts.length} pregunta(s) ya usada(s). ` +
          `Esto crea una nueva versión y no se puede deshacer (la anterior queda inactiva). ¿Continuar?`
        );
        if (!confirmed) return;
      }
    }

    try {
      btnSave.disabled = true;
      btnSave.innerHTML = "Guardando...";
      
      if (editId) {
        await templatesService.updateTemplate(editId, templateData);
      } else {
        await templatesService.createTemplate(templateData);
      }

      showToast("Plantilla Guardada", "success");
      await showList();
    } catch (error) {
      showToast("Error", "error", "No se pudo guardar la plantilla.");
      console.error(error);
    } finally {
      btnSave.disabled = false;
      btnSave.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Guardar Plantilla`;
    }
  });


  // --- RENDERIZADO DE LA LISTA ---
  const renderTemplatesList = async () => {
    let templates = [];
    try {
      templates = await templatesService.getTemplates();
    } catch (error) {
      showToast("Error", "error", "No se pudieron cargar las plantillas.");
      console.error(error);
      templatesContainer.innerHTML = `
        <section class="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-12 text-center shadow-sm">
          <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--danger-bg)] text-[var(--danger-text)] mb-4">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
          </div>
          <h3 class="text-xl font-bold text-[var(--text-main)]">No se pudieron cargar las plantillas</h3>
          <p class="mt-2 text-[var(--text-muted)] max-w-md mx-auto">Revisa tu conexión e intenta de nuevo.</p>
          <button id="btn-retry-templates" class="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[var(--brand-bg)] px-5 py-3 text-sm font-bold text-[var(--brand-text)] transition-all hover:bg-[var(--brand-hover)] cursor-pointer">
            Reintentar
          </button>
        </section>
      `;
      document.getElementById("btn-retry-templates")?.addEventListener("click", renderTemplatesList);
      return;
    }

    if (templates.length === 0) {
      templatesContainer.innerHTML = `
        <section class="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-12 text-center shadow-sm">
          <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--bg-base)] text-[var(--brand-bg)] mb-4">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </div>
          <h3 class="text-xl font-bold text-[var(--text-main)]">No hay plantillas</h3>
          <p class="mt-2 text-[var(--text-muted)] max-w-md mx-auto">Comienza creando una nueva plantilla de evaluación para asignar a tu equipo.</p>
        </section>
      `;
      return;
    }

    templatesContainer.innerHTML = `
      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        ${templates.map(t => {
          const statusText = t.is_active ? 'Activa' : 'Inactiva';
          const dateStr = t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Fecha no disponible';
          
          return `
          <div class="group flex flex-col justify-between rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-sm hover:border-[var(--brand-hover)] transition-all duration-300 hover:shadow-md cursor-pointer btn-edit-template" data-id="${t.id}">
            <div>
              <div class="flex items-center justify-between mb-4">
                <span class="inline-flex items-center rounded-full bg-[var(--brand-bg)]/10 px-3 py-1 text-xs font-bold text-[var(--brand-bg)] capitalize">
                  🎯 Para: ${escapeHtml((t.targetRole || t.target_role || '').replace('_', ' '))}
                </span>
                <span class="text-xs text-[var(--text-muted)] font-medium shrink-0 ml-2">
                  ${t.questions ? t.questions.length : 0} preg.
                </span>
              </div>
              <h3 class="text-xl font-bold text-[var(--text-main)] font-heading leading-tight">${escapeHtml(t.title)}</h3>
              <p class="mt-2 text-sm text-[var(--text-muted)] line-clamp-2">${escapeHtml(t.description || 'Sin descripción')}</p>
            </div>
            
            <div class="mt-6 pt-4 border-t border-[var(--border-main)] flex items-center justify-between">
              <div class="flex items-center gap-3">
                ${statusBadgeComponent({ status: statusText, variant: 'dot' })}
                ${dateStr ? `<span class="text-xs font-medium text-[var(--text-muted)]">${dateStr}</span>` : ''}
              </div>
              <div class="flex items-center">
                <button class="btn-clone-template text-[var(--text-muted)] hover:text-[var(--brand-bg)] transition-colors p-2" data-id="${t.id}" title="Duplicar Formulario">
                  <svg class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                </button>
                <button class="btn-delete-template text-[var(--text-muted)] hover:text-[var(--danger-text)] transition-colors p-2 -mr-2" data-id="${t.id}" title="Eliminar">
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
    document.querySelectorAll(".btn-edit-template").forEach(card => {
      card.addEventListener("click", async (e) => {
        // Evitar que el click en el botón de borrar o duplicar active la edición normal
        if (e.target.closest('.btn-delete-template') || e.target.closest('.btn-clone-template')) return;
        
        const id = card.dataset.id;
        try {
          const templates = await templatesService.getTemplates();
          const template = templates.find(t => t.id === id || t.id === parseInt(id));
          
          if (template) {
            editId = template.id;
            inputTitle.value = template.title;
            inputDesc.value = template.description || "";

            // dropdownComponent update requires us to use the specific DOM ID and maybe dispatch change
            const evaluatorRoleEl = document.getElementById("evaluator-role");
            if (evaluatorRoleEl) { evaluatorRoleEl.value = template.evaluatorRole || "coder"; }
            if (selectRole) { selectRole.value = template.targetRole || template.target_role || "tutor"; }

            // getTemplateForEdit trae el weight_percent real (GET /forms no lo expone) y
            // convierte input_type/category_id al formato que usa el constructor visual.
            const editData = await templatesService.getTemplateForEdit(template);
            questions = editData.questions.map(q => ({
              id: q.id,
              text: q.text,
              input_type: q.type,
              category_id: q.categoryId,
              weight: q.weight,
            }));
            // Snapshot para que updateTemplate() pueda diferenciar qué preguntas
            // se agregaron/quitaron/reformularon al guardar.
            originalQuestions = editData.questions.map(q => ({ id: q.id, text: q.text }));

            renderQuestions();
            showBuilder();
          }
        } catch (error) {
          showToast("Error", "error", "Error al cargar la plantilla para editar.");
        }
      });
    });

    // Eventos para duplicar
    document.querySelectorAll(".btn-clone-template").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation(); // Prevenir que abra modo edición
        const id = btn.dataset.id;
        try {
          const templates = await templatesService.getTemplates();
          const template = templates.find(t => t.id === id || t.id === parseInt(id));
          
          if (template) {
            editId = null; // Important: this makes it a new form!
            originalQuestions = [];
            inputTitle.value = "Copia de " + template.title;
            inputDesc.value = template.description || "";

            const evaluatorRoleEl = document.getElementById("evaluator-role");
            if (evaluatorRoleEl) { evaluatorRoleEl.value = template.evaluatorRole || "coder"; }
            if (selectRole) { selectRole.value = template.targetRole || template.target_role || "tutor"; }

            // Reset IDs for the cloned questions (mismo mapeo que el modo edición,
            // ver getTemplateForEdit, pero con IDs nuevos para que se creen como preguntas nuevas)
            const editData = await templatesService.getTemplateForEdit(template);
            questions = editData.questions.map(q => ({
              id: (Date.now() + Math.random()).toString(),
              text: q.text,
              input_type: q.type,
              category_id: q.categoryId,
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
    document.querySelectorAll(".btn-delete-template").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = e.target.dataset.id;
        if (confirm("¿Estás seguro de que deseas eliminar esta plantilla?")) {
          try {
            await templatesService.deleteTemplate(id);
            showToast("Plantilla eliminada", "success");
            renderTemplatesList();
          } catch (error) {
            showToast("Error", "error", "No se pudo eliminar la plantilla.");
          }
        }
      });
    });
  };

  // Inicializar mostrando la lista
  refreshPeriodGate();
  renderTemplatesList();
};
