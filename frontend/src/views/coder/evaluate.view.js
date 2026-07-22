import { navBarComponent } from "../../components/navbar";
import { dropdownComponent, setupDropdown, setDropdownValue } from "../../components/dropdown";
import { evaluablesService } from "../../services/evaluables.service";
import { evaluationService } from "../../services/evaluation.service";
import { periodService } from "../../services/periods.service";
import { authService } from "../../services/auth.service";
import { showToast } from "../../components/alerts";
import { renderRoute } from "../../router/router";
import { z } from "zod";

// Preguntas de escala/si-no son obligatorias; texto abierto es opcional. La
// validacion vive aca en vez de un if/else imperativo por cada pregunta --
// mas facil de leer que "que hace falta para poder enviar" de un vistazo.
const answerSchema = z.object({
  question_id: z.number(),
  type: z.enum(["scale", "scale_1_5", "yes_no", "open_text", "text"]),
  score: z.number().min(1).max(5).nullable(),
  comment: z.string().nullable(),
}).superRefine((answer, ctx) => {
  const isScale = answer.type === "scale" || answer.type === "scale_1_5";
  if (isScale && (answer.score === null || Number.isNaN(answer.score))) {
    ctx.addIssue({ code: "custom", message: "Selecciona una opción.", path: ["score"] });
  }
  if (answer.type === "yes_no" && !answer.comment) {
    ctx.addIssue({ code: "custom", message: "Selecciona una opción.", path: ["comment"] });
  }
});

const evaluationAnswersSchema = z.array(answerSchema).min(1, "La evaluación debe tener al menos una pregunta.");

let allUsers = [];
let activePeriod = null;
let currentForm = null;

export const renderEvaluate = () => `
  ${navBarComponent()}
  <main class="px-6 py-10 transition-all duration-300 ease-in-out">
    <div class="mx-auto max-w-4xl">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-[var(--text-main)]">Nueva evaluación</h1>
      <p class="mt-2 text-[var(--text-muted)]">Completa el formulario estructurado para evaluar a tu Team Leader o Tutor.</p>
    </div>

    <div class="mb-8 hidden sticky top-20 z-40 bg-[var(--bg-secondary)]/30 py-4 backdrop-blur-md border-[var(--border-main)] mx-6 px-6 rounded-full max-w-4xl" id="progress-container">
      <div class="flex justify-between items-center mb-2">
        <div class="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
          <span id="progress-text">0 de 0 respondidas</span> (<span id="progress-percentage">0%</span>)
        </div>
        <div id="autosave-indicator" class="text-xs font-bold text-[var(--brand-bg)] opacity-0 transition-opacity duration-300 flex items-center gap-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          Guardado
        </div>
      </div>
      <div class="h-2 w-full rounded-full bg-[var(--border-main)] overflow-hidden">
        <div id="progress-bar-fill" class="h-full w-0 rounded-full bg-[var(--brand-bg)] transition-all duration-300"></div>
      </div>
    </div>

    <form id="evaluate-form" class="mt-8 grid gap-6">
      <section class="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-8 shadow-sm">
        
        <div class="grid gap-6 md:grid-cols-2 mb-8">
          <div id="target-role-container">
            <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="target-role">¿A quién evalúas?</label>
            ${dropdownComponent('target-role', [
  { value: '', label: 'Selecciona un rol...' },
  { value: 'team_leader', label: 'Team Leader' },
  { value: 'tutor', label: 'Tutor' }
], '')}
          </div>

          <div id="evaluatee-container">
            <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="evaluatee">Persona a evaluar</label>
            ${dropdownComponent('evaluatee', [
  { value: '', label: 'Primero selecciona un rol...' }
], '')}
          </div>
        </div>

        <div id="questions-container" class="grid gap-8"></div>
      </section>

      <section id="anonymous-section" class="flex flex-col sm:flex-row sm:items-center gap-4 rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-sm">
        <label class="relative inline-flex cursor-pointer items-center">
          <input type="checkbox" id="is-anonymous" name="anonymous" class="peer sr-only" aria-describedby="anon-help" />
          <span class="sr-only">Enviar esta evaluación de forma anónima</span>
          <div aria-hidden="true" class="peer h-6 w-11 rounded-full bg-[var(--border-main)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[var(--brand-bg)] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--brand-hover)]"></div>
        </label>
        <div>
          <h3 class="text-base font-bold text-[var(--text-main)]">Envío Anónimo</h3>
          <p id="anon-help" class="text-sm text-[var(--text-muted)]">
            Si lo activas, tu evaluación será anónima para el Team Leader o Tutor evaluado. Sin embargo, se guardará en tu historial privado para que puedas revisar tus respuestas en el futuro.
          </p>
        </div>
      </section>

      
      <div class="flex flex-col-reverse sm:flex-row justify-end gap-4" id="wizard-buttons">
        <button type="button" id="prev-btn" class="hidden cursor-pointer rounded-2xl border border-[var(--border-main)] bg-transparent px-6 py-3 text-sm font-bold text-[var(--text-main)] transition-all hover:bg-[var(--bg-base)] hover:shadow-sm">
          Anterior
        </button>
        <button type="button" id="next-btn" class="hidden cursor-pointer rounded-2xl bg-[var(--brand-bg)] px-6 py-3 text-sm font-bold text-[var(--brand-text)] transition-all hover:bg-[var(--brand-hover)] hover:shadow-md focus:ring-4 focus:ring-[var(--border-main)]">
          Siguiente
        </button>
        <button type="button" id="draft-btn" class="cursor-pointer rounded-2xl border border-[var(--border-main)] bg-transparent px-6 py-3 text-sm font-bold text-[var(--text-main)] transition-all hover:bg-[var(--bg-base)] hover:shadow-sm">
          Guardar borrador
        </button>
        <button type="submit" id="submit-btn" class="hidden cursor-pointer rounded-2xl bg-[var(--brand-bg)] px-6 py-3 text-sm font-bold text-[var(--brand-text)] transition-all hover:bg-[var(--brand-hover)] hover:shadow-md focus:ring-4 focus:ring-[var(--border-main)]">
          Enviar evaluación
        </button>
      </div>

    </form>
    </div>
  </main>
`;

export const setupEvaluate = async () => {
  const form = document.getElementById("evaluate-form");
  const submitBtn = document.getElementById("submit-btn");
  const draftBtn = document.getElementById("draft-btn");
  const targetRole = document.getElementById("target-role");
  // NO se captura el nodo: `handleRoleChange()` reemplaza #evaluatee-container
  // con `outerHTML` (4 sitios), lo que DESTRUYE y recrea #evaluatee. Una
  // constante capturada aqui quedaria apuntando a un nodo huerfano, y escribir
  // o leer `.value` sobre el no lanza error -- falla en silencio.
  //
  // Eso rompia tres cosas a la vez: la preseleccion desde la tarjeta, el
  // evaluatee_id del envio, y sobre todo la clave del borrador
  // (`evaluation_draft_${user}_${evaluatee.value}`), que con value vacio hacia
  // que TODOS los borradores de todas las personas colapsaran en una sola
  // entrada de localStorage.
  const getEvaluatee = () => document.getElementById("evaluatee");
  const evaluateeValue = () => getEvaluatee()?.value || "";
  const draftKey = () => `evaluation_draft_${currentUser.id}_${evaluateeValue()}`;

  const qContainer = document.getElementById("questions-container");
  const anonCheck = document.getElementById("is-anonymous");
  const progressContainer = document.getElementById("progress-container");
  const progressBarFill = document.getElementById("progress-bar-fill");
  const progressText = document.getElementById("progress-text");
  const progressPercent = document.getElementById("progress-percentage");

  if (!form || !submitBtn || !targetRole || !getEvaluatee() || !qContainer) return;

  setupDropdown('target-role');
  setupDropdown('evaluatee');

  const currentUser = authService.getSession();

  // Purga del borrador corrupto que dejo el bug de la referencia huerfana:
  // se guardaba bajo la clave con sufijo VACIO, mezclando en una sola entrada
  // los borradores de todas las personas (gana el ultimo que escribio). No se
  // migra a la clave nueva a proposito: ese contenido no se puede atribuir con
  // certeza a nadie, y adjudicarselo a la persona equivocada seria peor que
  // perderlo. Es lo que hacia aparecer "borrador cargado" sin haber guardado.
  localStorage.removeItem(`evaluation_draft_${currentUser.id}_`);

  // Lógica centralizada para auto-guardado
  let autosaveTimeout;
  const saveDraftLocally = () => {
    const answers = {};
    qContainer.querySelectorAll("[data-question-id]").forEach(el => {
      if (el.dataset.selectedValue) {
        answers[el.dataset.questionId] = el.dataset.selectedValue;
      }
    });

    const draft = {
      role: targetRole.value,
      evaluatee: evaluateeValue(),
      anonymous: anonCheck.checked,
      answers: answers
    };
    localStorage.setItem(draftKey(),  JSON.stringify(draft));

    // Feedback visual
    const indicator = document.getElementById("autosave-indicator");
    if (indicator) {
      indicator.classList.remove("opacity-0");
      clearTimeout(autosaveTimeout);
      autosaveTimeout = setTimeout(() => {
        indicator.classList.add("opacity-0");
      }, 2000);
    }
  };

  // Función para actualizar la barra de progreso
  const updateProgress = () => {
    const questionElements = qContainer.querySelectorAll("[data-question-id]");
    if (questionElements.length === 0) return;

    let answered = 0;
    questionElements.forEach(el => {
      if (el.dataset.selectedValue) answered++;
    });

    const percentage = Math.round((answered / questionElements.length) * 100);
    progressBarFill.style.width = `${percentage}%`;
    progressText.textContent = `${answered} de ${questionElements.length} respondidas`;
    progressPercent.textContent = `${percentage}%`;

    // Disparar auto-guardado cada vez que cambia el progreso
    saveDraftLocally();
  };

  // Evaluaciones que este coder ya envio. Se carga de entrada (no solo al
  // elegir un rol) para poder decir "ya completaste todo" desde el primer
  // render, sin obligar al coder a probar rol por rol.
  let misEvaluaciones = [];

  try {
    // /evaluables (no /users): devuelve solo Tutores y Team Leaders que ESTE
    // coder puede evaluar, ya filtrados por clan en el servidor.
    const [evaluables, periods, previas] = await Promise.all([
      evaluablesService.get(currentUser.id),
      periodService.get(),
      evaluationService.getByEvaluator(currentUser.id),
    ]);
    allUsers = evaluables;
    misEvaluaciones = previas;
    activePeriod = periods.find(p => p.is_active) || (periods.length ? periods[0] : null);

    if (!activePeriod) {
      showToast("Error", "error", "No hay ningún periodo de evaluación activo.");
      submitBtn.disabled = true;
    }
  } catch (err) {
    showToast("Error", "error", "No se pudo cargar la información inicial.");
    console.error(err);
  }

  // Manejador de cambio de rol (funcion nombrada: se reutiliza para la preseleccion via query params)
  // Personas que aun le faltan al coder en el periodo activo, SIN mirar el rol.
  // Es lo que distingue "no queda nadie de este rol" de "ya terminaste todo",
  // que es la diferencia entre un aviso parcial y el mensaje global.
  const pendientesEnElPeriodo = () => {
    if (!activePeriod) return [];
    const yaEvaluados = misEvaluaciones
      .filter(e => e.period_id === activePeriod.id)
      .map(e => String(e.evaluatee_id));
    return allUsers.filter(u => u.id !== currentUser.id && !yaEvaluados.includes(String(u.id)));
  };

  // Con todo completado, el formulario no tiene nada que hacer: se ocultan el
  // envio anonimo y los botones. Dejarlos visibles ofrece acciones que no
  // aplican a nada -- no hay evaluacion que guardar ni enviar.
  const mostrarEstadoCompletado = () => {
    document.getElementById('anonymous-section')?.classList.add('hidden');
    document.getElementById('wizard-buttons')?.classList.add('hidden');
    progressContainer.classList.add('hidden');
    qContainer.innerHTML = `
      <div class="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-10 text-center shadow-sm">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-bg)]/10 text-[var(--brand-bg)]">
          <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        </div>
        <h3 class="text-xl font-bold text-[var(--text-main)]">Ya completaste todas tus evaluaciones</h3>
        <p class="mt-2 text-sm text-[var(--text-muted)] max-w-md mx-auto">
          No te queda nadie por evaluar en este periodo, ni Team Leaders ni Tutores.
          Puedes revisar lo que enviaste en <a href="/evaluations" data-navigo class="font-bold text-[var(--brand-bg)] hover:underline">Mis evaluaciones</a>.
        </p>
      </div>`;
  };

  const handleRoleChange = async () => {
    const role = targetRole.value;
    qContainer.innerHTML = "";
    currentForm = null;
    progressContainer.classList.add("hidden");

    // Se restauran por si venian ocultos de un estado "completado" anterior:
    // sin esto, pasar de un rol sin pendientes a otro con pendientes dejaba el
    // formulario sin botones y sin la opcion de envio anonimo.
    document.getElementById('anonymous-section')?.classList.remove('hidden');
    document.getElementById('wizard-buttons')?.classList.remove('hidden');

      document.getElementById('evaluatee-container').outerHTML = `
          <div id="evaluatee-container">
            <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="evaluatee">Persona a evaluar</label>
            ${dropdownComponent('evaluatee', [{ value: '', label: 'Cargando...' }], '')}
          </div>`;
        setupDropdown('evaluatee');

    if (!role) {
      // Con el filtro en su valor por defecto tambien se informa el estado
      // global: si ya no queda nadie, decirlo aqui evita que el coder tenga
      // que probar rol por rol para descubrir que termino.
      if (pendientesEnElPeriodo().length === 0) {
        document.getElementById('evaluatee-container').outerHTML = `
          <div id="evaluatee-container">
            <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="evaluatee">Persona a evaluar</label>
            ${dropdownComponent('evaluatee', [{ value: '', label: 'No queda nadie por evaluar' }], '')}
          </div>`;
        setupDropdown('evaluatee');
        mostrarEstadoCompletado();
        return;
      }

      document.getElementById('evaluatee-container').outerHTML = `
        <div id="evaluatee-container">
          <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="evaluatee">Persona a evaluar</label>
          ${dropdownComponent('evaluatee', [{ value: '', label: 'Primero selecciona un rol...' }], '')}
        </div>`;
      setupDropdown('evaluatee');
      return;
    }

    try {
      qContainer.innerHTML = `
        <div class="flex flex-col gap-6">
          <div class="h-24 skeleton-shimmer rounded-3xl"></div>
          <div class="h-24 skeleton-shimmer rounded-3xl"></div>
          <div class="h-24 skeleton-shimmer rounded-3xl"></div>
        </div>
      `;

      const [form, previousEvaluations] = await Promise.all([
        evaluationService.getForm(role),
        evaluationService.getByEvaluator(currentUser.id)
      ]);
      currentForm = form;
      // Se cachea en el scope de la vista para que `pendientesEnElPeriodo()`
      // pueda responder "¿queda alguien, en CUALQUIER rol?" sin repetir la
      // peticion ni depender de que se haya elegido un rol.
      misEvaluaciones = previousEvaluations;

      // Personas ya evaluadas en este periodo, para sacarlas del selector.
      //
      // El filtro es solo por periodo, sin `form_id`, por dos razones: (1) la
      // regla real de no-duplicado es (evaluador, evaluado, periodo) --el
      // constraint `uq_submission_once`--, el formulario no entra; (2) las
      // participaciones anonimas llegan con `form_id` en null (no hay vinculo
      // con el contenido), asi que compararlo las descartaba y el coder volvia
      // a ver en la lista a alguien que ya evaluo anonimamente, para chocar
      // luego contra un 409. La lista de candidatos ya viene filtrada por rol,
      // asi que no hace falta desambiguar por formulario.
      const evaluatedIds = previousEvaluations
        .filter(e => e.period_id === activePeriod.id)
        .map(e => String(e.evaluatee_id));

      // Sin filtro de clan: `allUsers` ya viene filtrado por el servidor
      // (GET /evaluables?evaluator_id=...). Filtrarlo aqui por `clan_id`
      // excluia a TODOS los Team Leaders, porque su clan_id es NULL y su
      // relacion con clanes vive en `team_leader_clans`.
      const filtered = allUsers.filter(u =>
        u.roles?.includes(role) &&
        u.id !== currentUser.id &&
        !evaluatedIds.includes(String(u.id))
      );

      if (filtered.length === 0) {
        document.getElementById('evaluatee-container').outerHTML = `
          <div id="evaluatee-container">
            <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="evaluatee">Persona a evaluar</label>
            ${dropdownComponent('evaluatee', [{ value: '', label: 'Ya has evaluado a todos para este rol' }], '')}
          </div>`;
        setupDropdown('evaluatee');
        // Si tampoco queda nadie en el OTRO rol, el mensaje correcto es el
        // global: decir "completaste este rol" cuando ya terminaste todo deja
        // al coder buscando en el otro filtro para nada.
        if (pendientesEnElPeriodo().length === 0) {
          mostrarEstadoCompletado();
        } else {
          qContainer.innerHTML = '<div class="text-center py-4 text-[var(--brand-bg)] font-bold">¡Has completado todas las evaluaciones para este rol en el periodo actual!</div>';
        }
        return;
      }

      const evaluateeOptions = [
        { value: '', label: 'Selecciona una persona...' },
        ...filtered.map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))
      ];

      document.getElementById('evaluatee-container').outerHTML = `
        <div id="evaluatee-container">
          <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="evaluatee">Persona a evaluar</label>
          ${dropdownComponent('evaluatee', evaluateeOptions, '')}
        </div>`;
      setupDropdown('evaluatee');

      renderQuestions(currentForm.questions);

      progressContainer.classList.remove("hidden");
      updateProgress();
      loadDraft(role);
    } catch (err) {
      // 404 = no hay formulario activo para ese rol (ver contrato de /forms).
      if (err.status === 404) {
        qContainer.innerHTML = `
          <div class="text-center py-10 bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-main)] shadow-sm">
            <svg class="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <h3 class="text-lg font-bold text-[var(--text-main)] mb-1">Sin evaluaciones disponibles</h3>
            <p class="text-sm text-[var(--text-muted)] max-w-sm mx-auto">No hay ningún formulario de evaluación activo en este momento para el rol seleccionado.</p>
          </div>
        `;
        getEvaluatee().disabled = true;
        getEvaluatee().innerHTML = '<option value="">Sin formulario disponible</option>';
      } else {
        qContainer.innerHTML = '<div class="text-[var(--danger-text)] bg-[var(--danger-bg)] p-4 rounded-xl text-center">Error al cargar preguntas de la formulario.</div>';
        console.error(err);
      }
    }
  };

  
  targetRole.addEventListener("change", handleRoleChange);

  // Delegado en `document` y NO sobre el nodo: #evaluatee se destruye y recrea
  // en cada handleRoleChange(), asi que un listener puesto directamente sobre
  // el se pierde con el primer cambio de rol. El evento 'change' que despacha
  // setupDropdown burbujea (`bubbles: true`), asi que llega hasta aqui.
  document.addEventListener("change", (e) => {
    if (e.target?.id !== "evaluatee") return;
    if (evaluateeValue()) {
      loadDraft(targetRole.value);
    }
  });


  // La preselección por query params NO va aquí: `handleRoleChange()` llama a
  // `renderQuestions`, declarada mas abajo con `const`, y `const` no se
  // hoistea. Invocarla en este punto entra en la zona muerta temporal y lanza
  // "Cannot access 'renderQuestions' before initialization", que abortaba el
  // bloque entero -- por eso NADA se preseleccionaba, ni siquiera el rol.
  //
  // Se ejecuta al FINAL de setupEvaluate, cuando todas las declaraciones ya
  // corrieron. Ver `aplicarPreseleccion()` abajo.

  
  let currentStep = 0;
  let wizardPages = [];
  const QUESTIONS_PER_STEP = 3;

  const updateWizardUI = () => {
    wizardPages.forEach((page, idx) => {
      if (idx === currentStep) {
        page.classList.remove("hidden");
      } else {
        page.classList.add("hidden");
      }
    });

    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const submitBtn = document.getElementById("submit-btn");

    if (currentStep === 0) {
      prevBtn.classList.add("hidden");
    } else {
      prevBtn.classList.remove("hidden");
    }

    if (currentStep === wizardPages.length - 1) {
      nextBtn.classList.add("hidden");
      submitBtn.classList.remove("hidden");
    } else {
      nextBtn.classList.remove("hidden");
      submitBtn.classList.add("hidden");
    }
  };

  const nextBtn = document.getElementById("next-btn");
  const prevBtn = document.getElementById("prev-btn");

  nextBtn.addEventListener("click", () => {
    if (currentStep < wizardPages.length - 1) {
      currentStep++;
      updateWizardUI();
    }
  });

  prevBtn.addEventListener("click", () => {
    if (currentStep > 0) {
      currentStep--;
      updateWizardUI();
    }
  });

  const renderQuestions = (questions) => {
    qContainer.innerHTML = "";
    wizardPages = [];
    currentStep = 0;

    if (questions.length === 0) return;

    for (let i = 0; i < questions.length; i += QUESTIONS_PER_STEP) {
      const pageQuestions = questions.slice(i, i + QUESTIONS_PER_STEP);
      const pageDiv = document.createElement("div");
      pageDiv.className = "wizard-page hidden";

      // Para mostrar la categoria
      let currentCategory = null;

      pageQuestions.forEach(q => {
        if (q.category !== currentCategory) {
          currentCategory = q.category;
          const catHeader = document.createElement("h3");
          catHeader.className = "text-xl font-bold text-[var(--text-main)] mb-6";
          catHeader.textContent = currentCategory;
          pageDiv.appendChild(catHeader);
        }

        const qDiv = document.createElement("div");
        qDiv.className = "mb-8 last:mb-0 question-group";
        qDiv.dataset.questionId = q.id;
        qDiv.dataset.inputType = q.input_type;

        const qLabel = document.createElement("p");
        qLabel.className = "mb-4 text-base font-medium text-[var(--text-main)]";
        qLabel.textContent = q.text;
        qDiv.appendChild(qLabel);

        if (q.input_type === "scale" || q.input_type === "scale_1_5") {
          const scaleDiv = document.createElement("div");
          scaleDiv.className = "grid grid-cols-5 gap-3";

          for (let val = 1; val <= 5; val++) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "flex h-12 w-full items-center justify-center rounded-xl border border-[var(--border-main)] bg-transparent text-sm font-medium text-[var(--text-muted)] transition-all hover:border-[var(--brand-hover)] focus:outline-none";
            btn.textContent = val;
            btn.dataset.value = val;

            btn.addEventListener("click", () => {
              scaleDiv.querySelectorAll("button").forEach(b => {
                b.classList.remove("border-[var(--brand-bg)]", "text-[var(--brand-bg)]", "shadow-sm", "bg-[var(--brand-bg)]/10");
              });
              btn.classList.add("border-[var(--brand-bg)]", "text-[var(--brand-bg)]", "shadow-sm", "bg-[var(--brand-bg)]/10");
              qDiv.dataset.selectedValue = val;

              const errorMsg = qDiv.querySelector(".error-msg");
              if (errorMsg) errorMsg.classList.add("hidden");

              updateProgress();
            });

            scaleDiv.appendChild(btn);
          }
          qDiv.appendChild(scaleDiv);

          const errorMsg = document.createElement("p");
          errorMsg.className = "error-msg mt-2 hidden text-sm text-red-500";
          errorMsg.textContent = "Por favor selecciona una opción.";
          qDiv.appendChild(errorMsg);

        } else if (q.input_type === "yes_no") {
          const yesNoDiv = document.createElement("div");
          yesNoDiv.className = "flex gap-4";

          ['Sí', 'No'].forEach(val => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "flex h-12 flex-1 items-center justify-center rounded-xl border border-[var(--border-main)] bg-transparent font-bold text-[var(--text-muted)] transition-all hover:border-[var(--brand-hover)] focus:outline-none";
            btn.textContent = val;
            btn.dataset.value = val;

            btn.addEventListener("click", () => {
              yesNoDiv.querySelectorAll("button").forEach(b => {
                b.classList.remove("border-[var(--brand-bg)]", "text-[var(--brand-bg)]", "shadow-sm", "bg-[var(--brand-bg)]/10");
              });
              btn.classList.add("border-[var(--brand-bg)]", "text-[var(--brand-bg)]", "shadow-sm", "bg-[var(--brand-bg)]/10");
              qDiv.dataset.selectedValue = val;

              const errorMsg = qDiv.querySelector(".error-msg");
              if (errorMsg) errorMsg.classList.add("hidden");

              updateProgress();
            });

            yesNoDiv.appendChild(btn);
          });
          qDiv.appendChild(yesNoDiv);

          const errorMsg = document.createElement("p");
          errorMsg.className = "error-msg mt-2 hidden text-sm text-red-500";
          errorMsg.textContent = "Por favor selecciona una opción.";
          qDiv.appendChild(errorMsg);

        } else {
          const textarea = document.createElement("textarea");
          textarea.className = "w-full resize-none rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] p-4 text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-hover)]";
          textarea.placeholder = "Escribe tu respuesta...";
          textarea.rows = 4;

          textarea.addEventListener("input", (e) => {
            qDiv.dataset.selectedValue = e.target.value;
            updateProgress();
          });

          qDiv.appendChild(textarea);
        }

        pageDiv.appendChild(qDiv);
      });

      wizardPages.push(pageDiv);
      qContainer.appendChild(pageDiv);
    }
    updateWizardUI();
  };

  // Lógica de guardado manual del borrador (mantiene el toast original)
  if (draftBtn) {
    draftBtn.addEventListener("click", () => {
      saveDraftLocally();
      showToast("Borrador guardado", "success", "Tu progreso ha sido guardado localmente.");
    });
  }

  // Lógica de carga de borrador
  const loadDraft = (currentRole) => {
    const savedDraft = localStorage.getItem(draftKey());
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.role === currentRole) {
          if (draft.evaluatee) setDropdownValue('evaluatee', draft.evaluatee);
          if (draft.anonymous !== undefined) anonCheck.checked = draft.anonymous;

          qContainer.querySelectorAll("[data-question-id]").forEach(el => {
            const qId = el.dataset.questionId;
            const savedVal = draft.answers[qId];

            if (savedVal) {
              el.dataset.selectedValue = savedVal;
              if (el.dataset.inputType === "scale" || el.dataset.inputType === "scale_1_5" || el.dataset.inputType === "yes_no") {
                const btn = el.querySelector(`button[data-value="${savedVal}"]`);
                if (btn) btn.classList.add("border-[var(--brand-bg)]", "text-[var(--brand-bg)]", "shadow-sm", "bg-[var(--brand-bg)]/10");
              } else {
                const textarea = el.querySelector("textarea");
                if (textarea) textarea.value = savedVal;
              }
            }
          });
          updateProgress();
          showToast("Borrador recuperado", "info", "Se ha cargado tu información guardada.");
        }
      } catch (e) {
        console.error("Error al cargar borrador", e);
      }
    }
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentForm || !activePeriod) {
      showToast("Error", "error", "No se ha cargado la formulario o periodo activo.");
      return;
    }

    const questionElements = qContainer.querySelectorAll("[data-question-id]");
    const draftAnswers = Array.from(questionElements).map(el => {
      const type = el.dataset.inputType;
      const val = el.dataset.selectedValue;
      return {
        question_id: parseInt(el.dataset.questionId),
        type,
        score: (type === "scale" || type === "scale_1_5") ? (val ? parseInt(val) : null) : null,
        comment: (type === "text" || type === "open_text" || type === "yes_no") ? (val || null) : null,
      };
    });

    questionElements.forEach(el => el.querySelector(".error-msg")?.classList.add("hidden"));

    const validation = evaluationAnswersSchema.safeParse(draftAnswers);
    if (!validation.success) {
      validation.error.issues.forEach(issue => {
        const index = issue.path[0];
        questionElements[index]?.querySelector(".error-msg")?.classList.remove("hidden");
      });
      showToast("Formulario incompleto", "warning", "Por favor completa todas las preguntas obligatorias.");
      return;
    }

    // El backend no espera el campo "type" (solo se usaba para validar aca).
    const answers = draftAnswers.map(({ type, ...rest }) => rest);

    const evaluationData = {
      evaluator_id: currentUser.id,
      evaluatee_id: parseInt(evaluateeValue()),
      form_id: currentForm.id,
      period_id: activePeriod.id,
      is_anonymous: anonCheck.checked,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      answers
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    try {
      // Se espera al servidor antes de anunciar exito: el periodo puede haberse
      // cerrado o la evaluacion estar duplicada, y ahi la SPA no es la autoridad
      // (regla 5). Confirmar antes de tiempo dejaba al coder creyendo que evaluo.
      await evaluationService.create(evaluationData);

      showToast("¡Evaluación enviada!", "success", "Tu feedback ha sido registrado exitosamente.");
      localStorage.removeItem(draftKey());
      window.history.pushState({}, "", "/evaluations");
      renderRoute();
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar evaluación";

      // El borrador nunca se borro, pero se reescribe con lo ultimo respondido
      // por si el usuario cambio algo despues de cargarlo.
      localStorage.setItem(draftKey(),  JSON.stringify({
        role: targetRole.value,
        evaluatee: evaluateeValue(),
        anonymous: anonCheck.checked,
        answers: draftAnswers.reduce((acc, curr) => {
          acc[curr.question_id] = curr.score !== null ? curr.score.toString() : curr.comment;
          return acc;
        }, {})
      }));

      if (err.status === 409) {
        // El backend usa 409 para DOS conflictos distintos: ya evaluaste a esa
        // persona en el periodo, o el periodo no esta activo. Lo unico que los
        // distingue es `err.detail`, que puede venir vacio -- por eso siempre va
        // acompanado de una frase propia y nunca se usa como texto unico.
        const reason = err.detail
          ? err.detail
          : "Puede que ya hayas evaluado a esta persona en este periodo, o que el periodo de evaluación ya no esté activo.";
        showToast("No se pudo enviar la evaluación", "error", `${reason} Tu progreso se guardó en borradores.`);
      } else {
        showToast("Error", "error", "Hubo un problema al enviar la evaluación. Tu progreso se guardó en borradores.");
      }
      console.error(err);
    }
  });

  // --- PRESELECCIÓN POR QUERY PARAMS (va al final a proposito) ---
  //
  // Se llega a esta vista de dos formas y no deben tratarse igual:
  //   a) desde una tarjeta de /evaluables -> rol y persona YA estan decididos;
  //      volver a preguntarlos es pedir dos veces lo mismo.
  //   b) entrando directo a /evaluations/new -> hay que elegir ambos.
  //
  // Corre aqui, no arriba, porque `handleRoleChange()` usa `renderQuestions`,
  // que se declara con `const` mas arriba en el cuerpo pero DESPUES del punto
  // donde antes se llamaba. `const` no se hoistea: aquello lanzaba un
  // ReferenceError por zona muerta temporal y abortaba toda la preseleccion.
  const aplicarPreseleccion = async () => {
    const params = new URLSearchParams(window.location.search);
    const preselectedRole = params.get("role");
    const preselectedId = params.get("evaluatee_id");

    // El rol se preselecciona aunque no venga la persona. El guard anterior
    // exigia los dos, asi que un id ausente dejaba tambien el rol vacio.
    if (preselectedRole) {
      // setDropdownValue y no `.value = x`: este dropdown es un input oculto
      // mas un boton; asignar `.value` deja la etiqueta visible en el
      // placeholder y el usuario ve "Selecciona un rol" sobre un valor puesto.
      setDropdownValue('target-role', preselectedRole);
      await handleRoleChange();
    } else if (pendientesEnElPeriodo().length === 0) {
      // Sin rol en la URL, `handleRoleChange` no correria y la vista quedaria
      // en "Primero selecciona un rol..." aunque ya no haya nada que evaluar.
      // Se informa el estado global de entrada, con el filtro en su default.
      mostrarEstadoCompletado();
    }

    // La persona va DESPUES de handleRoleChange, que es quien repuebla el
    // dropdown con la gente de ese rol: antes, la opcion no existe en el DOM.
    const personaLista = preselectedId
      ? setDropdownValue('evaluatee', preselectedId)
      : false;

    // Con ambos resueltos se ocultan los selectores. No se eliminan del DOM:
    // el resto del flujo (borrador, envio) sigue leyendo #evaluatee.
    if (preselectedRole && personaLista) {
      document.getElementById('target-role-container')?.classList.add('hidden');
      document.getElementById('evaluatee-container')?.classList.add('hidden');
      // El borrador se carga a mano: el listener de 'change' no dispara cuando
      // la seleccion la hace el codigo, no el usuario.
      loadDraft(preselectedRole);
    }
  };

  await aplicarPreseleccion();
};