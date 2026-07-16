import { navBarComponent } from "../../components/navbar";
import { showToast } from "../../components/alerts";
import { escapeHtml } from "../../utils/validators";
import { dropdownComponent, setupDropdown } from "../../components/dropdown";

export const renderAdminEvaluations = () => `
  ${navBarComponent()}
  <main class="mx-auto max-w-6xl px-6 py-10 relative">
    
    <!-- 1. VISTA LISTA DE PLANTILLAS -->
    <div id="list-view" class="block transition-all duration-300">
      <section class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Admin</p>
          <h1 class="mt-1 text-4xl font-black font-heading tracking-tight text-[var(--text-main)]">Gestión de Evaluaciones</h1>
          <p class="mt-4 text-[var(--text-muted)]">Crea y gestiona las plantillas de feedback para tu equipo.</p>
        </div>
        <button id="btn-create-template" class="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--brand-bg)] px-6 py-3 text-sm font-bold text-[var(--brand-text)] transition-all duration-300 ease-in-out hover:bg-[var(--brand-hover)] hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Nueva Plantilla
        </button>
      </section>

      <div id="templates-container">
        <!-- Generado dinámicamente -->
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
        <div class="flex items-center gap-3">
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
          <div>
            <label class="mb-2 block text-sm font-bold text-[var(--text-main)]">Dirigido a (Rol destino)</label>
            <div class="md:w-1/2">
              ${dropdownComponent('template-role', [
                { value: 'coder', label: 'Coders' },
                { value: 'tutor', label: 'Tutores' }
              ], 'coder')}
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
  const btnCreate = document.getElementById("btn-create-template");
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

  // --- LÓGICA DE VISTAS ---
  const showBuilder = () => {
    viewList.classList.add("hidden");
    viewBuilder.classList.remove("hidden");
    setupDropdown('template-role');
  };

  const showList = () => {
    viewBuilder.classList.add("hidden");
    viewList.classList.remove("hidden");
    renderTemplatesList();
  };

  btnCreate.addEventListener("click", () => {
    // Resetear constructor para nueva plantilla
    editId = null;
    inputTitle.value = "";
    inputDesc.value = "";
    selectRole.value = "coder";
    questions = [{ id: Date.now().toString(), text: "", type: "scale_1_5" }];
    renderQuestions();
    showBuilder();
  });

  btnBack.addEventListener("click", showList);

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
            
            <div class="mt-4">
              <div class="w-64 relative">
                ${dropdownComponent(`q-type-${q.id}`, [
                  {value: 'scale_1_5', label: 'Escala (1-5)'},
                  {value: 'yes_no', label: 'Sí / No'},
                  {value: 'open_text', label: 'Texto Abierto'}
                ], q.type)}
                <div class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none z-10">
                  ${getQuestionIcon(q.type)}
                </div>
              </div>
            </div>
            
            <!-- Vista Previa Visual -->
            ${getQuestionPreview(q.type)}
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

    // Configurar dropdowns dinámicos para el tipo de pregunta
    questions.forEach(q => {
      setupDropdown(`q-type-${q.id}`, (val) => {
        q.type = val;
        renderQuestions();
      });
      // Ajustar el padding izquierdo del botón del dropdown generado para que no tape el ícono
      const btn = document.getElementById(`q-type-${q.id}-btn`);
      if (btn) btn.classList.add("pl-10");
    });

    document.querySelectorAll(".btn-delete-q").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        questions = questions.filter(item => item.id !== id);
        renderQuestions();
      });
    });
  };

  btnAddQuestion.addEventListener("click", () => {
    questions.push({ id: Date.now().toString(), text: "", type: "scale_1_5" });
    renderQuestions();
  });

  // --- GUARDADO ---
  btnSave.addEventListener("click", () => {
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

    const templateData = {
      id: editId || Date.now().toString(),
      title,
      description: inputDesc.value.trim(),
      targetRole: document.getElementById("template-role").value,
      questions,
      createdAt: new Date().toISOString()
    };

    // Guardar en localStorage
    let templates = JSON.parse(localStorage.getItem("evaluation_templates") || "[]");
    
    if (editId) {
      templates = templates.map(t => t.id === editId ? templateData : t);
    } else {
      templates.push(templateData);
    }

    localStorage.setItem("evaluation_templates", JSON.stringify(templates));
    showToast("Plantilla Guardada", "success");
    showList();
  });


  // --- RENDERIZADO DE LA LISTA ---
  const renderTemplatesList = () => {
    const templates = JSON.parse(localStorage.getItem("evaluation_templates") || "[]");
    
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
        ${templates.map(t => `
          <div class="group flex flex-col justify-between rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-sm hover:border-[var(--brand-hover)] transition-all duration-300 hover:shadow-md cursor-pointer btn-edit-template" data-id="${t.id}">
            <div>
              <div class="flex items-center justify-between mb-4">
                <span class="inline-flex items-center rounded-full bg-[var(--brand-bg)]/10 px-3 py-1 text-xs font-bold text-[var(--brand-bg)] capitalize">
                  Para: ${escapeHtml(t.targetRole)}
                </span>
                <span class="text-xs text-[var(--text-muted)] font-medium">
                  ${t.questions.length} preg.
                </span>
              </div>
              <h3 class="text-xl font-bold text-[var(--text-main)] font-heading leading-tight">${escapeHtml(t.title)}</h3>
              <p class="mt-2 text-sm text-[var(--text-muted)] line-clamp-2">${escapeHtml(t.description || 'Sin descripción')}</p>
            </div>
            
            <div class="mt-6 pt-4 border-t border-[var(--border-main)] flex items-center justify-between">
              <span class="text-xs text-[var(--text-muted)]">
                ${new Date(t.createdAt).toLocaleDateString()}
              </span>
              <button class="btn-delete-template text-[var(--text-muted)] hover:text-[var(--danger-text)] transition-colors p-2 -mr-2" data-id="${t.id}" title="Eliminar">
                <svg class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Eventos para editar
    document.querySelectorAll(".btn-edit-template").forEach(card => {
      card.addEventListener("click", (e) => {
        // Evitar que el click en el botón de borrar active la edición
        if (e.target.closest('.btn-delete-template')) return;
        
        const id = card.dataset.id;
        const templates = JSON.parse(localStorage.getItem("evaluation_templates") || "[]");
        const template = templates.find(t => t.id === id);
        
        if (template) {
          editId = template.id;
          inputTitle.value = template.title;
          inputDesc.value = template.description || "";
          selectRole.value = template.targetRole || "coder";
          questions = JSON.parse(JSON.stringify(template.questions));
          renderQuestions();
          showBuilder();
        }
      });
    });

    // Eventos para borrar
    document.querySelectorAll(".btn-delete-template").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = e.target.dataset.id;
        if (confirm("¿Estás seguro de que deseas eliminar esta plantilla?")) {
          let templates = JSON.parse(localStorage.getItem("evaluation_templates") || "[]");
          templates = templates.filter(t => t.id !== id);
          localStorage.setItem("evaluation_templates", JSON.stringify(templates));
          renderTemplatesList();
          showToast("Plantilla eliminada", "success");
        }
      });
    });
  };

  // Inicializar mostrando la lista
  renderTemplatesList();
};
