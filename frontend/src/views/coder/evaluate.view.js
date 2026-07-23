import { navBarComponent } from "../../components/navbar";
import { modalComponent, setupModal } from "../../components/modal";
import { evaluablesService } from "../../services/evaluables.service";
import { evaluationService } from "../../services/evaluation.service";
import { periodService } from "../../services/periods.service";
import { authService } from "../../services/auth.service";
import { escapeHtml } from "../../utils/validators";
import { showToast } from "../../components/alerts";
import { renderRoute } from "../../router/router";
import { z } from "zod";

// Single source of truth for "required question" (progress bar, answerSchema,
// "Opcional" badge): scale and yes/no feed the ICP, open text does not.
const REQUIRED_TYPES = new Set(["scale", "scale_1_5", "yes_no"]);
const isRequired = (inputType) => REQUIRED_TYPES.has(inputType);

// Schema instead of per-question if/else: what blocks submit is visible at a glance.
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

// Avatar initials (up to two words). No images: the backend has no profile photos.
const getInitials = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";

const roleLabel = (role) => (role === "team_leader" ? "Team Leader" : "Tutor");

// Same role colors as the /evaluables cards (blue TL, purple tutor), so the role
// reads the same across both views.
const roleBadge = (role) =>
  role === "team_leader"
    ? `<span class="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:bg-blue-950/20 dark:text-blue-400">Team Leader</span>`
    : `<span class="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-600 dark:bg-purple-950/20 dark:text-purple-400">Tutor</span>`;

const compactCard = (user, role) => `
  <button type="button" data-user-id="${user.id}" data-role="${role}"
    class="flex items-center gap-3 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] p-3 text-left transition-all hover:border-[var(--brand-hover)] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--brand-hover)]">
    <span aria-hidden="true" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-bg)]/10 text-sm font-bold text-[var(--brand-bg)]">${escapeHtml(getInitials(user.name))}</span>
    <span class="min-w-0 flex-1">
      <span class="block truncate text-sm font-bold text-[var(--text-main)]">${escapeHtml(user.name)}</span>
      <span class="mt-0.5 block">${roleBadge(role)}</span>
    </span>
  </button>
`;

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

        <div id="evaluatee-context" class="mb-8 empty:mb-0"></div>

        <div id="questions-container" class="grid gap-8"></div>
      </section>

      <section id="anonymous-section" class="hidden flex flex-col sm:flex-row sm:items-center gap-4 rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-sm">
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

      
      <div class="hidden flex flex-col-reverse sm:flex-row justify-end gap-4" id="wizard-buttons">
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

    ${modalComponent({
      id: "evaluatee-modal",
      title: "¿A quién vas a evaluar?",
      size: "lg",
      children: `
        <p class="mb-5 -mt-4 text-sm text-[var(--text-muted)]">Selecciona a un Team Leader o Tutor pendiente en este periodo.</p>
        <div id="evaluatee-modal-list" class="grid gap-3 sm:grid-cols-2 max-h-[55vh] overflow-y-auto p-1" aria-live="polite"></div>
        <div class="mt-6 flex justify-end">
          <button type="button" id="evaluatee-modal-cancel"
            class="cursor-pointer rounded-2xl border border-[var(--border-main)] bg-transparent px-6 py-3 text-sm font-bold text-[var(--text-main)] transition-all hover:bg-[var(--bg-base)] hover:shadow-sm">
            Cancelar
          </button>
        </div>
      `,
    })}
    </div>
  </main>
`;

export const setupEvaluate = async () => {
  const form = document.getElementById("evaluate-form");
  const submitBtn = document.getElementById("submit-btn");
  const draftBtn = document.getElementById("draft-btn");

  // Selection is local state. Shape: { id, name, email, role } or null.
  let selection = null;
  const draftKey = () => `evaluation_draft_${currentUser.id}_${selection?.id || ""}`;

  const qContainer = document.getElementById("questions-container");
  const contextCard = document.getElementById("evaluatee-context");
  const anonCheck = document.getElementById("is-anonymous");
  const progressContainer = document.getElementById("progress-container");
  const progressBarFill = document.getElementById("progress-bar-fill");
  const progressText = document.getElementById("progress-text");
  const progressPercent = document.getElementById("progress-percentage");

  if (!form || !submitBtn || !qContainer) return;

  const currentUser = authService.getSession();

  // Drop corrupt draft keyed with empty suffix
  localStorage.removeItem(`evaluation_draft_${currentUser.id}_`);

  let autosaveTimeout;
  const saveDraftLocally = () => {
    const answers = {};
    qContainer.querySelectorAll("[data-question-id]").forEach(el => {
      if (el.dataset.selectedValue) {
        answers[el.dataset.questionId] = el.dataset.selectedValue;
      }
    });

    const draft = {
      role: selection?.role,
      evaluatee: selection?.id,
      anonymous: anonCheck.checked,
      answers: answers
    };
    localStorage.setItem(draftKey(), JSON.stringify(draft));

    const indicator = document.getElementById("autosave-indicator");
    if (indicator) {
      indicator.classList.remove("opacity-0");
      clearTimeout(autosaveTimeout);
      autosaveTimeout = setTimeout(() => {
        indicator.classList.add("opacity-0");
      }, 2000);
    }
  };

  const updateProgress = () => {
    const questionElements = qContainer.querySelectorAll("[data-question-id]");
    if (questionElements.length === 0) return;

    const requiredQuestions = Array.from(questionElements).filter(el => isRequired(el.dataset.inputType));

    if (requiredQuestions.length === 0) {
      progressContainer.classList.add("hidden");
      saveDraftLocally();
      return;
    }

    let answered = 0;
    requiredQuestions.forEach(el => {
      if (el.dataset.selectedValue) answered++;
    });

    const percentage = Math.round((answered / requiredQuestions.length) * 100);
    progressBarFill.style.width = `${percentage}%`;
    progressText.textContent = `${answered} de ${requiredQuestions.length} respondidas`;
    progressPercent.textContent = `${percentage}%`;

    saveDraftLocally();
  };

  let myEvaluations = [];

  try {
    const [evaluatees, periods, previousEvaluations] = await Promise.all([
      evaluablesService.get(currentUser.id),
      periodService.get(),
      evaluationService.getByEvaluator(currentUser.id),
    ]);
    allUsers = evaluatees;
    myEvaluations = previousEvaluations;
    activePeriod = periods.find(p => p.is_active) || (periods.length ? periods[0] : null);

    if (!activePeriod) {
      showToast("Error", "error", "No hay ningún periodo de evaluación activo.");
      submitBtn.disabled = true;
    }
  } catch (err) {
    showToast("Error", "error", "No se pudo cargar la información inicial.");
    console.error(err);
  }

  const pendingInPeriod = () => {
    if (!activePeriod) return [];
    const alreadyEvaluated = myEvaluations
      .filter(e => e.period_id === activePeriod.id)
      .map(e => String(e.evaluatee_id));
    return allUsers.filter(u => u.id !== currentUser.id && !alreadyEvaluated.includes(String(u.id)));
  };

  const showAllDoneState = () => {
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

  // uq_submission_once ignores role: one card per person. team_leader wins on
  // dual-role users, same as /evaluables.
  const deriveRole = (user) => (user.roles?.includes("team_leader") ? "team_leader" : "tutor");

  // Context card above the form: who is being evaluated. "Cambiar" reopens the modal.
  const renderContextCard = () => {
    if (!contextCard) return;
    if (!selection) { contextCard.innerHTML = ""; return; }
    contextCard.innerHTML = `
      <div class="flex items-center gap-4 rounded-3xl border border-[var(--border-main)] bg-[var(--bg-base)] p-5">
        <span aria-hidden="true" class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--brand-bg)]/10 text-base font-bold text-[var(--brand-bg)]">${escapeHtml(getInitials(selection.name))}</span>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Evaluando a</p>
          <p class="truncate text-lg font-bold text-[var(--text-main)]">${escapeHtml(selection.name)}</p>
          <div class="mt-1 flex flex-wrap items-center gap-2">
            ${roleBadge(selection.role)}
            <span class="truncate text-xs text-[var(--text-muted)]">${escapeHtml(selection.email || "")}</span>
          </div>
        </div>
        <button type="button" id="evaluatee-change"
          class="shrink-0 cursor-pointer rounded-2xl border border-[var(--border-main)] bg-transparent px-4 py-2 text-sm font-bold text-[var(--text-main)] transition-all hover:bg-[var(--bg-panel)] hover:shadow-sm">
          Cambiar
        </button>
      </div>`;
    document.getElementById("evaluatee-change")?.addEventListener("click", (e) => openSelectionModal(e.currentTarget));
  };

  // Loads and renders the role form; shared by the modal choice and the URL preselection.
  const loadForm = async (role) => {
    currentForm = null;
    document.getElementById("anonymous-section")?.classList.remove("hidden");
    document.getElementById("wizard-buttons")?.classList.remove("hidden");
    qContainer.innerHTML = `
      <div class="flex flex-col gap-6">
        <div class="h-24 skeleton-shimmer rounded-3xl"></div>
        <div class="h-24 skeleton-shimmer rounded-3xl"></div>
        <div class="h-24 skeleton-shimmer rounded-3xl"></div>
      </div>`;

    try {
      currentForm = await evaluationService.getForm(role);
      renderQuestions(currentForm.questions);
      progressContainer.classList.remove("hidden");
      updateProgress();
      loadDraft(role);
    } catch (err) {
      // 404 = no active form for that role (see the /forms contract).
      if (err.status === 404) {
        document.getElementById("anonymous-section")?.classList.add("hidden");
        document.getElementById("wizard-buttons")?.classList.add("hidden");
        progressContainer.classList.add("hidden");
        qContainer.innerHTML = `
          <div class="text-center py-10 bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-main)] shadow-sm">
            <svg class="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <h3 class="text-lg font-bold text-[var(--text-main)] mb-1">Sin evaluaciones disponibles</h3>
            <p class="text-sm text-[var(--text-muted)] max-w-sm mx-auto">No hay ningún formulario de evaluación activo en este momento para el rol seleccionado.</p>
          </div>`;
      } else {
        qContainer.innerHTML = '<div class="text-[var(--danger-text)] bg-[var(--danger-bg)] p-4 rounded-xl text-center">Error al cargar las preguntas del formulario.</div>';
        console.error(err);
      }
    }
  };

  // Single selection point. selection is set BEFORE closing the modal, or onClose
  // reads it as a cancel and navigates to /evaluables.
  const selectEvaluatee = async (user, role) => {
    selection = { id: user.id, name: user.name, email: user.email, role };
    renderContextCard();
    selectionModal.close();
    await loadForm(role);
  };

  const renderModalList = () => {
    const list = document.getElementById("evaluatee-modal-list");
    if (!list) return;
    const pending = pendingInPeriod();
    if (pending.length === 0) {
      list.innerHTML = `<p class="col-span-full py-6 text-center text-sm text-[var(--text-muted)]">No queda nadie por evaluar en este periodo.</p>`;
      return;
    }
    list.innerHTML = pending.map(u => compactCard(u, deriveRole(u))).join("");
  };

  const openSelectionModal = (triggerEl) => {
    renderModalList();
    selectionModal.open(triggerEl);
  };

  // Closing with no selection (Esc/Cancel) leaves the view: a targetless form is
  // a dead screen. With a previous selection, nothing happens.
  const selectionModal = setupModal("evaluatee-modal", {
    onClose: () => {
      if (!selection) {
        window.history.pushState({}, "", "/evaluables");
        renderRoute();
      }
    },
  });

  // Delegated on the container: survives renderModalList re-renders. closest()
  // because the click may land on the avatar or the name.
  document.getElementById("evaluatee-modal-list")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-user-id]");
    if (!btn) return;
    const user = allUsers.find(u => String(u.id) === btn.dataset.userId);
    if (user) selectEvaluatee(user, btn.dataset.role);
  });

  document.getElementById("evaluatee-modal-cancel")?.addEventListener("click", () => selectionModal.close());


  // View entry does NOT go here: it needs renderQuestions, a const declared below
  // and therefore not hoisted (TDZ). It runs at the end, see enterView().


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

        // "Opcional" badge: without it the bar reads 100% with an empty textarea
        // and looks like a bug.
        if (!isRequired(q.input_type)) {
          const optionalBadge = document.createElement("span");
          optionalBadge.className = "ml-2 align-middle rounded-full bg-[var(--bg-base)] px-2 py-0.5 text-xs font-semibold text-[var(--text-muted)] border border-[var(--border-main)]";
          optionalBadge.textContent = "Opcional";
          qLabel.appendChild(optionalBadge);
        }

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

  if (draftBtn) {
    draftBtn.addEventListener("click", () => {
      saveDraftLocally();
      showToast("Borrador guardado", "success", "Tu progreso ha sido guardado localmente.");
    });
  }

  const loadDraft = (currentRole) => {
    const savedDraft = localStorage.getItem(draftKey());
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.role === currentRole) {
          // The evaluatee is not restored: draftKey is already namespaced per
          // evaluatee, so this draft belongs to the current selection.
          if (draft.anonymous !== undefined) anonCheck.checked = draft.anonymous;

          // Selecting from code fires no 'change'/click event (only a real user
          // click does), so dataset and styles are restored by hand here.
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

    if (!currentForm || !activePeriod || !selection) {
      showToast("Error", "error", "No se ha cargado el formulario, el periodo activo o la persona a evaluar.");
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

    // The backend does not expect "type": it was only used to validate here.
    const answers = draftAnswers.map(({ type, ...rest }) => rest);

    const evaluationData = {
      evaluator_id: currentUser.id,
      evaluatee_id: parseInt(selection.id),
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
      // Wait for the server before claiming success: the SPA is not the authority
      // on closed periods or duplicates (rule 5).
      await evaluationService.create(evaluationData);

      showToast("¡Evaluación enviada!", "success", "Tu feedback ha sido registrado exitosamente.");
      localStorage.removeItem(draftKey());
      window.history.pushState({}, "", "/evaluations");
      renderRoute();
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar evaluación";

      // The draft was never deleted, but rewrite it with the latest answers.
      localStorage.setItem(draftKey(),  JSON.stringify({
        role: selection.role,
        evaluatee: selection.id,
        anonymous: anonCheck.checked,
        answers: draftAnswers.reduce((acc, curr) => {
          acc[curr.question_id] = curr.score !== null ? curr.score.toString() : curr.comment;
          return acc;
        }, {})
      }));

      if (err.status === 409) {
        // 409 covers duplicate and inactive period; only err.detail tells them
        // apart and it may be empty, so always keep a fallback.
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

  // --- VIEW ENTRY --- Last on purpose: it uses renderQuestions, a const that is
  // not hoisted, so calling it earlier would throw a TDZ ReferenceError.
  const enterView = async () => {
    // No active period: nothing to evaluate, and "all done" would lie (rule 5).
    if (!activePeriod) {
      document.getElementById("anonymous-section")?.classList.add("hidden");
      document.getElementById("wizard-buttons")?.classList.add("hidden");
      progressContainer.classList.add("hidden");
      qContainer.innerHTML = `
        <div class="rounded-[2rem] border border-dashed border-[var(--border-main)] bg-[var(--bg-panel)] p-10 text-center">
          <p class="text-sm text-[var(--text-muted)]">No hay un periodo de evaluación activo en este momento.</p>
        </div>`;
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const preselectedRole = params.get("role");
    const preselectedId = params.get("evaluatee_id");

    // Preselection is valid only if the person is evaluable. Role comes from the
    // URL, else it is derived (the URL may carry an inconsistent one).
    const preUser = preselectedId
      ? allUsers.find(u => String(u.id) === String(preselectedId))
      : null;

    if (preUser) {
      const role = preselectedRole || deriveRole(preUser);
      await selectEvaluatee(preUser, role);
      return;
    }

    const pending = pendingInPeriod();

    if (pending.length === 0) {
      showAllDoneState();
      return;
    }

    // A single pending person: the modal would ask for a choice that does not
    // exist. "Cambiar" on the context card reopens it if needed.
    if (pending.length === 1) {
      const onlyCandidate = pending[0];
      await selectEvaluatee(onlyCandidate, deriveRole(onlyCandidate));
      return;
    }

    // Two or more: the choice is real, the modal is the only way.
    openSelectionModal();
  };

  await enterView();
};