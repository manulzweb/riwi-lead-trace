import { navBarComponent } from "../../components/navbar";
import { evaluationService } from "../../services/evaluation.service";
import { authService } from "../../services/auth.service";
import { userService } from "../../services/users.service";
import { periodService } from "../../services/periods.service";
import { showToast } from "../../components/alerts";
import { formsService } from "../../services/forms.service";
import Swal from 'sweetalert2';
import { formatDateLong } from "../../utils/date";
import { emptyStateComponent } from "../../components/emptyState";
import { escapeHtml } from "../../utils/validators";

export const renderMyEvaluations = () => `
  ${navBarComponent()}
    <main class="px-6 py-10 transition-all duration-300 ease-in-out">
      <div class="mx-auto max-w-6xl">
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

    <section id="evaluations-list" class="mt-8 grid gap-4" aria-live="polite">
      ${Array(3).fill(`
        <article class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-md h-32">
          <div>
            <div class="flex items-center gap-3">
              <div class="h-6 w-32 skeleton-shimmer rounded-md"></div>
              <div class="h-5 w-16 skeleton-shimmer rounded-full"></div>
            </div>
            <div class="h-3 w-20 skeleton-shimmer rounded-sm mt-2"></div>
            <div class="h-4 w-48 skeleton-shimmer rounded-sm mt-3"></div>
          </div>
          <div class="flex items-center gap-3">
            <div class="h-8 w-24 skeleton-shimmer rounded-xl"></div>
          </div>
        </article>
      `).join("")}
      </section>
      </div>
    </main>
`;

// Error state
const renderLoadError = () => `
  <div class="rounded-3xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-6 text-center text-[var(--danger-text)]">
    <p class="font-semibold">No se pudieron cargar tus evaluaciones.</p>
    <p class="mt-1 text-sm">Revisa tu conexión e inténtalo de nuevo.</p>
    <button type="button" id="my-evaluations-retry"
      class="mt-4 cursor-pointer rounded-2xl bg-[var(--brand-bg)] px-5 py-2.5 text-sm font-bold text-[var(--brand-text)] transition hover:bg-[var(--brand-hover)] focus:ring-4 focus:ring-[var(--border-main)]">
      Reintentar
    </button>
  </div>
`;

export const setupMyEvaluations = async () => {
  const container = document.getElementById("evaluations-list");
  if (!container) return;

  const currentUser = authService.getSession();

  const load = async () => {
    try {
      const [evaluations, users, periods, forms] = await Promise.all([
        evaluationService.getByEvaluator(currentUser.id),
        userService.get(),
        periodService.get(),
        formsService.getFormsForHistory()
      ]);

      const usersMap = new Map(users.map(u => [u.id, u]));
      const periodsMap = new Map(periods.map(p => [p.id, p]));
      const formsMap = new Map(forms.map(t => [t.id, t]));

      if (!Array.isArray(evaluations) || evaluations.length === 0) {
        container.innerHTML = emptyStateComponent(
          "Aún no hay evaluaciones",
          "Todavía no has evaluado a nadie. Cuando lo hagas, tus envíos aparecerán aquí.",
          "Nueva evaluación",
          "/evaluables"
        );
        return;
      }

      const activePeriod = periods.find(p => p.is_active);
      const activeEvaluations = activePeriod ? evaluations.filter(e => String(e.period_id) === String(activePeriod.id)) : [];

      if (activeEvaluations.length === 0) {
        container.innerHTML = emptyStateComponent(
          "Aún no hay evaluaciones",
          "Todavía no has evaluado a nadie en el periodo activo. Cuando lo hagas, tus envíos aparecerán aquí.",
          "Nueva evaluación",
          "/evaluables"
        );
        return;
      }

      container.innerHTML = activeEvaluations.map(ev => {
        const evaluatee = usersMap.get(Number(ev.evaluatee_id)) || usersMap.get(String(ev.evaluatee_id));
        const period = periodsMap.get(Number(ev.period_id)) || periodsMap.get(String(ev.period_id));
        const evaluateeName = evaluatee ? evaluatee.name : `Usuario #${ev.evaluatee_id}`;
        const evaluateeRole = evaluatee?.roles?.length
          ? evaluatee.roles.map(r => r.replace('_', ' ')).join(' / ')
          : 'Colaborador';
        const periodName = period ? period.name : `Periodo #${ev.period_id}`;

        const isAnonymous = evaluationService.isAnonymousParticipation(ev);
        const hasDetail = evaluationService.hasVisibleDetail(ev);

        let headerBadge;
        if (isAnonymous) {
          headerBadge = `
          <span class="inline-flex items-center gap-1.5 rounded-full bg-[var(--info-bg)] px-3 py-1 text-xs font-semibold text-[var(--info-text)]">
            <svg aria-hidden="true" focusable="false" class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            Envío anónimo
          </span>`;
        } else if (ev.status === "submitted") {
          headerBadge = `<span class="rounded-full bg-[var(--success-bg)] px-3 py-1 text-xs font-semibold text-[var(--success-text)]">Enviada</span>`;
        } else {
          headerBadge = `<span class="rounded-full bg-[var(--warning-bg)] px-3 py-1 text-xs font-semibold text-[var(--warning-text)]">Borrador</span>`;
        }

        // Anonymous entries have no submitted_at; created_at (when the
        // participation was recorded) is the honest date to show.
        const dateSource = isAnonymous ? ev.created_at : ev.submitted_at;
        const formattedDate = dateSource ? formatDateLong(dateSource) : "No enviada";
        const dateLabel = isAnonymous ? "Enviada el" : "Fecha";

        const detailSlot = hasDetail
          ? `<button type="button" class="cursor-pointer rounded-xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-2 text-xs font-bold text-[var(--text-main)] transition hover:bg-[var(--border-main)]"
             data-eval-id="${escapeHtml(String(ev.evaluation_id))}">
             Ver detalle
           </button>`
          : `<p class="max-w-xs text-xs leading-relaxed text-[var(--text-muted)] sm:text-right">
             El detalle no está disponible.
           </p>`;

        return `
        <article class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-md transition-all hover:shadow-lg">
          <div>
            <div class="flex flex-wrap items-center gap-3">
              <h3 class="text-lg font-bold text-[var(--text-main)]">${escapeHtml(evaluateeName)}</h3>
              ${headerBadge}
            </div>
            <p class="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-wider font-semibold">${escapeHtml(evaluateeRole)}</p>
            <p class="text-sm text-[var(--text-muted)] mt-2">Periodo: <strong class="text-[var(--text-main)]">${escapeHtml(periodName)}</strong> · ${escapeHtml(dateLabel)}: <strong class="text-[var(--text-main)]">${escapeHtml(formattedDate)}</strong></p>
          </div>

          <div class="flex items-center gap-3">
            ${detailSlot}
          </div>
        </article>
      `;
      }).join("");

      // View-local on purpose: hanging it off window broke the view layer and the
      // global outlived navigation.
      const showEvaluationDetail = (evalId) => {
        // Looked up by evaluation_id: the history no longer carries id (these are
        // participation rows, see evaluation.service.js).
        const evaluation = evaluations.find(e => e.evaluation_id === evalId);
        // Second lock: anonymous cards never render the button, but if one got
        // here there is no content to open.
        if (!evaluation || !evaluationService.hasVisibleDetail(evaluation)) return;

        const evaluatee = usersMap.get(Number(evaluation.evaluatee_id)) || usersMap.get(String(evaluation.evaluatee_id));
        const evaluateeName = evaluatee ? evaluatee.name : `Usuario #${evaluation.evaluatee_id}`;

        const form = formsMap.get(evaluation.form_id);
        const questionsMap = new Map();
        if (form && form.questions) {
          form.questions.forEach(q => questionsMap.set(String(q.id), q));
        }

        const answersHtml = (evaluation.answers || []).map(ans => {
          const questionData = questionsMap.get(String(ans.question_id));
          const questionText = questionData ? questionData.text : `Pregunta #${ans.question_id}`;

          const inputType = questionData ? (questionData.type || questionData.input_type) : null;

          let answerDisplay = '';
          if (inputType === 'scale' || inputType === 'scale_1_5') {
            answerDisplay = `<div class="mt-2 text-sm"><span class="font-bold text-[var(--brand-bg)] text-2xl">${escapeHtml(ans.score || 'N/A')}</span> <span class="text-[var(--text-muted)] font-medium">/ 5</span></div>`;
          } else if (inputType === 'yes_no') {
            answerDisplay = `<div class="mt-2 inline-flex items-center rounded-xl bg-[var(--brand-bg)]/10 px-4 py-2 text-sm font-bold text-[var(--brand-bg)]">${escapeHtml(ans.comment || 'N/A')}</div>`;
          } else {
            answerDisplay = ans.comment ? `<p class="mt-2 rounded-xl bg-[var(--bg-base)] p-4 text-sm text-[var(--text-main)] border border-[var(--border-main)]">"${escapeHtml(ans.comment)}"</p>` : `<p class="mt-2 text-sm text-[var(--text-muted)] italic">Sin respuesta</p>`;
          }

          return `
          <div class="border-b border-[var(--border-main)] pb-5 mb-5 last:border-b-0 last:mb-0">
            <h4 class="text-base font-semibold text-[var(--text-main)] leading-snug">${escapeHtml(questionText)}</h4>
            ${answerDisplay}
          </div>
        `;
        }).join("");

        Swal.fire({
          title: `<div class="text-left"><h3 class="text-2xl font-black text-[var(--text-main)]">Resultados</h3><p class="text-sm text-[var(--text-muted)] mt-1 font-normal">Evaluación a <span class="font-semibold text-[var(--text-main)]">${escapeHtml(evaluateeName)}</span></p></div>`,
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

      // One delegated listener (the router destroys the container, so it does not
      // stack). closest() because the click may land inside the button; anonymous
      // cards carry no data-eval-id, so they never fire.
      container.addEventListener("click", (e) => {
        const trigger = e.target.closest("[data-eval-id]");
        if (!trigger) return;
        showEvaluationDetail(Number(trigger.dataset.evalId));
      });

    } catch (err) {
      container.innerHTML = renderLoadError();
      document.getElementById("my-evaluations-retry")?.addEventListener("click", load);
      showToast("Error", "error", "No se pudieron cargar tus evaluaciones.");
      console.error(err);
    }
  };

  await load();
};
