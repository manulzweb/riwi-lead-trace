import { navBarComponent } from "../../components/navbar";
import { evaluationService } from "../../services/evaluation.service";
import { authService } from "../../services/auth.service";
import { userService } from "../../services/users.service";
import { periodService } from "../../services/periods.service";
import { showToast } from "../../components/alerts";
import { templatesService } from "../../services/templates.service";
import Swal from 'sweetalert2';

export const renderMyEvaluations = () => `
  ${navBarComponent()}
  <main class="mx-auto max-w-6xl px-6 py-10">
    <section class="flex items-center justify-between">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Coder</p>
        <h1 class="mt-1 text-4xl font-black tracking-tight text-[var(--text-main)]">Mis evaluaciones</h1>
      </div>
      <a href="/evaluables"
        class="inline-flex items-center justify-center rounded-2xl bg-[var(--brand-bg)] px-5 py-3 text-sm font-bold text-[var(--brand-text)] transition-all duration-300 ease-in-out hover:bg-[var(--brand-hover)] hover:shadow-md">
        Nueva evaluación
      </a>
    </section>

    <section id="evaluations-list" class="mt-8 grid gap-4">
      <div class="h-20 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
      <div class="h-20 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
      <div class="h-20 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
    </section>
  </main>
`;

export const setupMyEvaluations = async () => {
  const container = document.getElementById("evaluations-list");
  if (!container) return;

  const currentUser = authService.getSession();

  try {
    const [evaluations, users, periods, templates] = await Promise.all([
      evaluationService.getByEvaluator(currentUser.id),
      userService.get(),
      periodService.get(),
      templatesService.getTemplates()
    ]);

    const usersMap = new Map(users.map(u => [u.id, u]));
    const periodsMap = new Map(periods.map(p => [p.id, p]));
    const templatesMap = new Map(templates.map(t => [t.id, t]));

    if (evaluations.length === 0) {
      container.innerHTML = `
        <article class="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-10 text-center">
          <p class="text-[var(--text-muted)]">No has realizado ninguna evaluación visible todavía.</p>
          <p class="text-xs text-[var(--text-muted)] mt-2">Nota: Las evaluaciones enviadas como "Anónimas" no se asocian a tu perfil para resguardar tu privacidad.</p>
        </article>
      `;
      return;
    }

    container.innerHTML = evaluations.map(ev => {
      const evaluatee = usersMap.get(ev.evaluatee_id);
      const period = periodsMap.get(ev.period_id);
      const evaluateeName = evaluatee ? evaluatee.name : `Usuario #${ev.evaluatee_id}`;
      const evaluateeRole = evaluatee?.roles?.length
        ? evaluatee.roles.map(r => r.replace('_', ' ')).join(' / ')
        : 'Colaborador';
      const periodName = period ? period.name : `Periodo #${ev.period_id}`;

      const formattedDate = ev.submitted_at
        ? new Date(ev.submitted_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
        : "No enviada";

      const statusBadge = ev.status === "submitted"
        ? `<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">Enviada</span>`
        : `<span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600 dark:bg-amber-950/20 dark:text-amber-400">Borrador</span>`;

      return `
        <article class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-md transition-all hover:shadow-lg">
          <div>
            <div class="flex items-center gap-3">
              <h3 class="text-lg font-bold text-[var(--text-main)]">${evaluateeName}</h3>
              ${statusBadge}
            </div>
            <p class="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-wider font-semibold">${evaluateeRole}</p>
            <p class="text-sm text-[var(--text-muted)] mt-2">Periodo: <strong class="text-[var(--text-main)]">${periodName}</strong> · Fecha: <strong class="text-[var(--text-main)]">${formattedDate}</strong></p>
          </div>
          
          <div class="flex items-center gap-3">
            <button class="rounded-xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-2 text-xs font-bold text-[var(--text-main)] transition hover:bg-[var(--border-main)]" 
              onclick="showEvaluationDetail(${ev.id})">
              Ver detalle
            </button>
          </div>
        </article>
      `;
    }).join("");

    // Agregar función global temporal para ver el detalle de la evaluación
    window.showEvaluationDetail = (evalId) => {
      const evaluation = evaluations.find(e => e.id === evalId);
      if (!evaluation) return;

      const evaluatee = usersMap.get(evaluation.evaluatee_id);
      const evaluateeName = evaluatee ? evaluatee.name : `Usuario #${evaluation.evaluatee_id}`;

      const template = templatesMap.get(evaluation.template_id);
      const questionsMap = new Map();
      if (template && template.questions) {
        template.questions.forEach(q => questionsMap.set(String(q.id), q));
      }

      const answersHtml = evaluation.answers.map(ans => {
        const questionData = questionsMap.get(String(ans.question_id));
        const questionText = questionData ? questionData.text : `Pregunta #${ans.question_id}`;
        
        let answerDisplay = '';
        if (questionData && (questionData.input_type === 'scale' || questionData.input_type === 'scale_1_5')) {
          answerDisplay = `<div class="mt-2 text-sm"><span class="font-bold text-[var(--brand-bg)] text-2xl">${ans.score || 'N/A'}</span> <span class="text-[var(--text-muted)] font-medium">/ 5</span></div>`;
        } else if (questionData && questionData.input_type === 'yes_no') {
          answerDisplay = `<div class="mt-2 inline-flex items-center rounded-xl bg-[var(--brand-bg)]/10 px-4 py-2 text-sm font-bold text-[var(--brand-bg)]">${ans.comment || 'N/A'}</div>`;
        } else {
           answerDisplay = ans.comment ? `<p class="mt-2 rounded-xl bg-[var(--bg-base)] p-4 text-sm text-[var(--text-main)] border border-[var(--border-main)]">"${ans.comment}"</p>` : `<p class="mt-2 text-sm text-[var(--text-muted)] italic">Sin respuesta</p>`;
        }

        return `
          <div class="border-b border-[var(--border-main)] pb-5 mb-5 last:border-b-0 last:mb-0">
            <h4 class="text-base font-semibold text-[var(--text-main)] leading-snug">${questionText}</h4>
            ${answerDisplay}
          </div>
        `;
      }).join("");

      Swal.fire({
        title: `<div class="text-left"><h3 class="text-2xl font-black text-[var(--text-main)]">Resultados</h3><p class="text-sm text-[var(--text-muted)] mt-1 font-normal">Evaluación a <span class="font-semibold text-[var(--text-main)]">${evaluateeName}</span></p></div>`,
        html: `
          <div class="text-left mt-6 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
            ${answersHtml}
          </div>
        `,
        width: '600px',
        showCloseButton: true,
        confirmButtonText: "Cerrar ventana",
        customClass: {
          popup: "rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-2",
          confirmButton: "rounded-2xl bg-[var(--bg-base)] border border-[var(--border-main)] px-6 py-3 font-bold text-[var(--text-main)] hover:bg-[var(--border-main)] w-full mt-4 transition-colors"
        }
      });
    };

  } catch (err) {
    showToast("Error", "error", "No se pudieron cargar tus evaluaciones.");
    console.error(err);
  }
};
