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
  <main class="mx-auto max-w-3xl px-6 py-10">
    <section class="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-8 shadow-xl">
      <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Evaluación</p>
      <h1 class="mt-2 text-4xl font-black tracking-tight text-[var(--text-main)]">Nueva evaluación</h1>
      <p class="mt-4 text-[var(--text-muted)]">Completa el formulario para evaluar a tu Team Leader o Tutor.</p>

      <form id="evaluate-form" class="mt-8 grid gap-6">
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

        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-main)]" for="area">Área</label>
          <select id="area" required
            class="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-[var(--text-main)] focus:border-[var(--brand-hover)] focus:outline-none">
            <option value="Desarrollo">Desarrollo Software</option>
            <option value="Ingles">Inglés</option>
            <option value="HSE">HSE (Habilidades Blandas)</option>
          </select>
        </div>

        <div id="questions-container" class="grid gap-6"></div>

        <div class="rounded-2xl border border-yellow-200/50 bg-yellow-50/50 p-4 dark:bg-yellow-950/20 dark:border-yellow-900/50">
          <label class="flex items-start gap-3 cursor-pointer">
            <input id="is-anonymous" type="checkbox" class="mt-1 h-4 w-4 rounded border-[var(--border-main)] accent-[var(--brand-bg)]" />
            <div>
              <span class="text-sm font-bold text-[var(--text-main)] block">Enviar de forma anónima</span>
              <span class="text-xs text-[var(--text-muted)]">El anonimato es irreversible. Si lo activas, nadie (incluyendo coordinadores y administradores) sabrá quién envió esta evaluación.</span>
            </div>
          </label>
        </div>

        <button id="submit-btn" type="submit"
          class="inline-flex items-center justify-center rounded-2xl bg-[var(--brand-bg)] px-5 py-3 text-sm font-bold text-white transition-all duration-300 ease-in-out hover:bg-[var(--brand-hover)] hover:shadow-md hover:cursor-pointer focus:ring-4 focus:ring-[var(--border-main)]">
          Enviar evaluación
        </button>
      </form>
    </section>
  </main>
`;

export const setupEvaluate = async () => {
  const form       = document.getElementById("evaluate-form");
  const submitBtn  = document.getElementById("submit-btn");
  const targetRole = document.getElementById("target-role");
  const evaluatee  = document.getElementById("evaluatee");
  const qContainer = document.getElementById("questions-container");
  const anonCheck  = document.getElementById("is-anonymous");

  if (!form || !submitBtn || !targetRole || !evaluatee || !qContainer) return;

  const currentUser = authService.getSession();

  try {
    // 1. Cargar usuarios y periodo activo
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

  // 2. Evento de cambio de rol
  targetRole.addEventListener("change", async () => {
    const role = targetRole.value;
    qContainer.innerHTML = "";
    currentTemplate = null;

    if (!role) {
      evaluatee.disabled = true;
      evaluatee.innerHTML = '<option value="">Primero selecciona un rol...</option>';
      return;
    }

    // Filtrar personas a evaluar (excluyendo al usuario actual si tuviera ese rol)
    const filtered = allUsers.filter(u => u.role === role && u.id !== currentUser.id);
    
    evaluatee.disabled = false;
    evaluatee.innerHTML = '<option value="">Selecciona una persona...</option>' + 
      filtered.map(u => `<option value="${u.id}">${u.name} (${u.email})</option>`).join("");

    // Cargar preguntas para este rol
    try {
      qContainer.innerHTML = '<div class="text-center py-4 text-[var(--text-muted)] animate-pulse">Cargando preguntas...</div>';
      currentTemplate = await evaluationService.getForm(role);
      renderQuestions(currentTemplate.questions);
    } catch (err) {
      qContainer.innerHTML = '<div class="text-red-500 py-4 text-center">Error al cargar preguntas de la plantilla.</div>';
      console.error(err);
    }
  });

  // 3. Renderizar preguntas
  const renderQuestions = (questions) => {
    qContainer.innerHTML = "";
    
    // Agrupar por categoría
    const grouped = {};
    questions.forEach(q => {
      if (!grouped[q.category]) grouped[q.category] = [];
      grouped[q.category].push(q);
    });

    for (const [category, qs] of Object.entries(grouped)) {
      const catSection = document.createElement("div");
      catSection.className = "rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] p-5 grid gap-4";
      
      const catHeader = document.createElement("h3");
      catHeader.className = "text-lg font-bold text-[var(--brand-bg)] border-b border-[var(--border-main)] pb-2";
      catHeader.textContent = category;
      catSection.appendChild(catHeader);

      qs.forEach(q => {
        const qDiv = document.createElement("div");
        qDiv.className = "grid gap-2";
        qDiv.dataset.questionId = q.id;
        qDiv.dataset.inputType = q.input_type;

        const qLabel = document.createElement("label");
        qLabel.className = "text-sm font-medium text-[var(--text-main)]";
        qLabel.textContent = q.text;
        qDiv.appendChild(qLabel);

        if (q.input_type === "scale") {
          // Escala del 1 al 5
          const scaleDiv = document.createElement("div");
          scaleDiv.className = "flex gap-2 justify-between max-w-md mt-1";
          
          for (let i = 1; i <= 5; i++) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "w-10 h-10 rounded-full border border-[var(--border-main)] font-semibold transition-all hover:bg-[var(--brand-bg)] hover:text-white hover:border-[var(--brand-bg)]";
            btn.textContent = i;
            btn.dataset.value = i;
            
            btn.addEventListener("click", () => {
              scaleDiv.querySelectorAll("button").forEach(b => {
                b.classList.remove("bg-[var(--brand-bg)]", "text-white", "border-[var(--brand-bg)]");
              });
              btn.classList.add("bg-[var(--brand-bg)]", "text-white", "border-[var(--brand-bg)]");
              qDiv.dataset.selectedValue = i;
            });

            scaleDiv.appendChild(btn);
          }
          qDiv.appendChild(scaleDiv);
        } else {
          // Comentario de texto
          const textarea = document.createElement("textarea");
          textarea.className = "w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-bg)]";
          textarea.placeholder = "Escribe tu comentario opcional...";
          textarea.rows = 3;
          textarea.addEventListener("input", (e) => {
            qDiv.dataset.selectedValue = e.target.value;
          });
          qDiv.appendChild(textarea);
        }
        
        catSection.appendChild(qDiv);
      });

      qContainer.appendChild(catSection);
    }
  };

  // 4. Enviar formulario
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

      if (type === "scale" && !val) {
        allValid = false;
        el.classList.add("border-red-500");
      } else {
        el.classList.remove("border-red-500");
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
      evaluator_id: currentUser.id,
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
