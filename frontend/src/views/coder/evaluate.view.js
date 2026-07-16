import { navBarComponent } from "../../components/navbar";
import { userService } from "../../services/users.service";
import { evaluationService } from "../../services/evaluation.service";
import { periodService } from "../../services/periods.service";
import { authService } from "../../services/auth.service";
import { showToast } from "../../components/alerts";
import { renderRoute } from "../../router/router";

let allUsers = [];
let activePeriod = null;
let currentTemplate = null;

export const renderEvaluate = () => `
  ${navBarComponent()}
  <main class="mx-auto max-w-4xl px-6 py-10">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-[var(--text-main)]">Nueva evaluación</h1>
      <p class="mt-2 text-[var(--text-muted)]">Completa el formulario estructurado para evaluar a tu Team Leader o Tutor.</p>
    </div>

    <div class="mb-8 hidden" id="progress-container">
      <div class="h-2 w-full rounded-full bg-[var(--border-main)]">
        <div id="progress-bar-fill" class="h-2 w-0 rounded-full bg-[var(--brand-bg)] transition-all duration-300"></div>
      </div>
      <div class="mt-2 flex justify-between text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
        <span id="progress-text">0 de 0 respondidas</span>
        <span id="progress-percentage">0%</span>
      </div>
    </div>

    <form id="evaluate-form" class="mt-8 grid gap-6">
      <section class="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-8 shadow-sm">
        
        <div class="grid gap-6 md:grid-cols-2 mb-8">
          <div>
            <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="target-role">¿A quién evalúas?</label>
            <select id="target-role" required
              class="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:outline-none">
              <option value="">Selecciona un rol...</option>
              <option value="team_leader">Team Leader</option>
              <option value="tutor">Tutor</option>
            </select>
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="evaluatee">Persona a evaluar</label>
            <select id="evaluatee" disabled required
              class="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:outline-none disabled:cursor-not-allowed disabled:text-[var(--text-muted)]">
              <option value="">Primero selecciona un rol...</option>
            </select>
          </div>
        </div>

        <div id="questions-container" class="grid gap-8"></div>
      </section>

      <section class="flex flex-col sm:flex-row sm:items-center gap-4 rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-sm">
        <label class="relative inline-flex cursor-pointer items-center">
          <input type="checkbox" id="is-anonymous" name="anonymous" class="peer sr-only" />
          <div class="peer h-6 w-11 rounded-full bg-[var(--border-main)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[var(--brand-bg)] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--brand-hover)]"></div>
        </label>
        <div>
          <h3 class="text-base font-bold text-[var(--text-main)]">Envío Anónimo</h3>
          <p class="text-sm text-[var(--text-muted)]">Si lo activas, nadie (incluyendo coordinadores y administradores) sabrá quién envió esta evaluación. El anonimato es irreversible.</p>
        </div>
      </section>

      <div class="flex flex-col-reverse sm:flex-row justify-end gap-4">
        <button type="button" id="draft-btn"
          class="cursor-pointer rounded-2xl border border-[var(--border-main)] bg-transparent px-6 py-3 text-sm font-bold text-[var(--text-main)] transition-all hover:bg-[var(--bg-base)] hover:shadow-sm">
          Guardar borrador
        </button>
        <button type="submit" id="submit-btn"
          class="cursor-pointer rounded-2xl bg-[var(--brand-bg)] px-6 py-3 text-sm font-bold text-[var(--brand-text)] transition-all hover:bg-[var(--brand-hover)] hover:shadow-md focus:ring-4 focus:ring-[var(--border-main)]">
          Enviar evaluación
        </button>
      </div>
    </form>
  </main>
`;

export const setupEvaluate = async () => {
  const form = document.getElementById("evaluate-form");
  const submitBtn = document.getElementById("submit-btn");
  const draftBtn = document.getElementById("draft-btn");
  const targetRole = document.getElementById("target-role");
  const evaluatee = document.getElementById("evaluatee");
  const qContainer = document.getElementById("questions-container");
  const anonCheck = document.getElementById("is-anonymous");
  const progressContainer = document.getElementById("progress-container");
  const progressBarFill = document.getElementById("progress-bar-fill");
  const progressText = document.getElementById("progress-text");
  const progressPercent = document.getElementById("progress-percentage");

  if (!form || !submitBtn || !targetRole || !evaluatee || !qContainer) return;

  const currentUser = authService.getSession();

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
  };

  try {
    allUsers = await userService.get();
    const periods = await periodService.get();
    activePeriod = periods.find(p => p.is_active) || (periods.length ? periods[0] : null);

    if (!activePeriod) {
      showToast("Error", "error", "No hay ningún periodo de evaluación activo.");
      submitBtn.disabled = true;
    }
  } catch (err) {
    showToast("Error", "error", "No se pudo cargar la información inicial.");
    console.error(err);
  }

  targetRole.addEventListener("change", async () => {
    const role = targetRole.value;
    qContainer.innerHTML = "";
    currentTemplate = null;
    progressContainer.classList.add("hidden");

    if (!role) {
      evaluatee.disabled = true;
      evaluatee.innerHTML = '<option value="">Primero selecciona un rol...</option>';
      return;
    }

    const filtered = allUsers.filter(u => u.role === role && u.id !== currentUser.id);
    evaluatee.disabled = false;
    evaluatee.innerHTML = '<option value="">Selecciona una persona...</option>' +
      filtered.map(u => `<option value="${u.id}">${u.name} (${u.email})</option>`).join("");

    try {
      qContainer.innerHTML = '<div class="text-center py-4 text-[var(--text-muted)] animate-pulse">Cargando preguntas...</div>';
      currentTemplate = await evaluationService.getForm(role);
      renderQuestions(currentTemplate.questions);

      progressContainer.classList.remove("hidden");
      updateProgress();
      loadDraft(role); // Cargar borrador si existe para este rol
    } catch (err) {
      qContainer.innerHTML = '<div class="text-red-500 py-4 text-center">Error al cargar preguntas de la plantilla.</div>';
      console.error(err);
    }
  });

  const renderQuestions = (questions) => {
    qContainer.innerHTML = "";
    const grouped = {};

    questions.forEach(q => {
      if (!grouped[q.category]) grouped[q.category] = [];
      grouped[q.category].push(q);
    });

    for (const [category, qs] of Object.entries(grouped)) {
      const catSection = document.createElement("div");
      catSection.className = "mb-6 last:mb-0";

      const catHeader = document.createElement("h3");
      catHeader.className = "text-xl font-bold text-[var(--text-main)] mb-6";
      catHeader.textContent = category;
      catSection.appendChild(catHeader);

      qs.forEach(q => {
        const qDiv = document.createElement("div");
        qDiv.className = "mb-8 last:mb-0 question-group";
        qDiv.dataset.questionId = q.id;
        qDiv.dataset.inputType = q.input_type;

        const qLabel = document.createElement("p");
        qLabel.className = "mb-4 text-base font-medium text-[var(--text-main)]";
        qLabel.textContent = q.text;
        qDiv.appendChild(qLabel);

        if (q.input_type === "scale") {
          const scaleDiv = document.createElement("div");
          scaleDiv.className = "grid grid-cols-5 gap-3";

          for (let i = 1; i <= 5; i++) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "flex h-12 w-full items-center justify-center rounded-xl border border-[var(--border-main)] bg-transparent text-sm font-medium text-[var(--text-muted)] transition-all hover:border-[var(--brand-hover)] focus:outline-none";
            btn.textContent = i;
            btn.dataset.value = i;

            btn.addEventListener("click", () => {
              scaleDiv.querySelectorAll("button").forEach(b => {
                b.classList.remove("border-[var(--brand-bg)]", "text-[var(--brand-bg)]", "shadow-sm");
              });
              btn.classList.add("border-[var(--brand-bg)]", "text-[var(--brand-bg)]", "shadow-sm");
              qDiv.dataset.selectedValue = i;

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

        } else {
          const textarea = document.createElement("textarea");
          textarea.className = "w-full resize-none rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] p-4 text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-hover)]";
          textarea.placeholder = "Escribe tu comentario opcional...";
          textarea.rows = 4;

          textarea.addEventListener("input", (e) => {
            qDiv.dataset.selectedValue = e.target.value;
            updateProgress();
          });

          qDiv.appendChild(textarea);
        }

        catSection.appendChild(qDiv);
      });

      qContainer.appendChild(catSection);
    }
  };

  // Lógica de guardado de borrador
  if (draftBtn) {
    draftBtn.addEventListener("click", () => {
      const answers = {};
      qContainer.querySelectorAll("[data-question-id]").forEach(el => {
        if (el.dataset.selectedValue) {
          answers[el.dataset.questionId] = el.dataset.selectedValue;
        }
      });

      const draft = {
        role: targetRole.value,
        evaluatee: evaluatee.value,
        anonymous: anonCheck.checked,
        answers: answers
      };

      localStorage.setItem("evaluation_draft", JSON.stringify(draft));
      showToast("Borrador guardado", "success", "Tu progreso ha sido guardado localmente.");
    });
  }

  // Lógica de carga de borrador
  const loadDraft = (currentRole) => {
    const savedDraft = localStorage.getItem("evaluation_draft");
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.role === currentRole) {
          if (draft.evaluatee) evaluatee.value = draft.evaluatee;
          if (draft.anonymous !== undefined) anonCheck.checked = draft.anonymous;

          qContainer.querySelectorAll("[data-question-id]").forEach(el => {
            const qId = el.dataset.questionId;
            const savedVal = draft.answers[qId];

            if (savedVal) {
              el.dataset.selectedValue = savedVal;
              if (el.dataset.inputType === "scale") {
                const btn = el.querySelector(`button[data-value="${savedVal}"]`);
                if (btn) btn.classList.add("border-[var(--brand-bg)]", "text-[var(--brand-bg)]", "shadow-sm");
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

    if (!currentTemplate || !activePeriod) {
      showToast("Error", "error", "No se ha cargado la plantilla o periodo activo.");
      return;
    }

    const answers = [];
    const questionElements = qContainer.querySelectorAll("[data-question-id]");
    let allValid = true;

    questionElements.forEach(el => {
      const qId = parseInt(el.dataset.questionId);
      const type = el.dataset.inputType;
      const val = el.dataset.selectedValue;
      const errorMsg = el.querySelector(".error-msg");

      if (type === "scale" && !val) {
        allValid = false;
        if (errorMsg) errorMsg.classList.remove("hidden");
      }

      answers.push({
        question_id: qId,
        score: type === "scale" ? parseInt(val) : null,
        comment: type === "text" ? val || "" : null
      });
    });

    if (!allValid) {
      showToast("Formulario incompleto", "warning", "Por favor califica todas las preguntas de escala.");
      return;
    }

    const evaluationData = {
      evaluatee_id: parseInt(evaluatee.value),
      template_id: currentTemplate.id,
      period_id: activePeriod.id,
      is_anonymous: anonCheck.checked,
      status: "submitted",
      answers
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    try {
      await evaluationService.create(evaluationData);
      localStorage.removeItem("evaluation_draft"); // Limpiar borrador tras envío exitoso
      showToast("¡Evaluación enviada!", "success", "Tu feedback ha sido registrado exitosamente.");
      window.history.pushState({}, "", "/evaluations");
      renderRoute();
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar evaluación";
      if (err.message && err.message.includes("409")) {
        showToast("Conflicto", "error", "Ya has evaluado a esta persona en el periodo actual.");
      } else {
        showToast("Error", "error", "Hubo un problema al enviar la evaluación.");
      }
      console.error(err);
    }
  });
};