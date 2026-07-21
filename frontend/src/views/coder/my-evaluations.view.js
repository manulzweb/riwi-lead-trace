import { navBarComponent } from "../../components/navbar";
import { evaluationService } from "../../services/evaluation.service";
import { authService } from "../../services/auth.service";
import { userService } from "../../services/users.service";
import { periodService } from "../../services/periods.service";
import { showToast } from "../../components/alerts";
import { templatesService } from "../../services/templates.service";
import Swal from 'sweetalert2';
import { formatDateLong } from "../../utils/date";
import { dropdownComponent, setupDropdown } from "../../components/dropdown";

export const renderMyEvaluations = () => {
  const params = new URLSearchParams(window.location.search);
  const initialFilter = params.get("filter") || "all";

  return `
    ${navBarComponent()}
    <main class="mx-auto max-w-6xl px-6 py-10">
    <section class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Coder</p>
        <h1 class="mt-1 text-4xl font-black tracking-tight text-[var(--text-main)]">Mis evaluaciones</h1>
      </div>
      <div class="flex flex-wrap items-center gap-4">
        <div class="w-48 z-10 relative">
          ${dropdownComponent('filter-status', [
            { value: 'all', label: 'Todas' },
            { value: 'submitted', label: 'Enviadas' },
            { value: 'draft', label: 'Borradores' }
          ], initialFilter)}
        </div>
        <a href="/evaluables"
          class="inline-flex items-center justify-center rounded-2xl bg-[var(--brand-bg)] px-5 py-3 text-sm font-bold text-[var(--brand-text)] transition-all duration-300 ease-in-out hover:bg-[var(--brand-hover)] hover:shadow-md">
          Nueva evaluación
        </a>
      </div>
    </section>

    <section id="evaluations-list" class="mt-8 grid gap-4">
      <div class="h-20 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
      <div class="h-20 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
      <div class="h-20 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
    </section>
    <div id="pagination-controls" class="mt-8 flex flex-wrap items-center justify-center gap-2"></div>
  </main>
`;
};

export const setupMyEvaluations = async () => {
  const container = document.getElementById("evaluations-list");
  const paginationControls = document.getElementById("pagination-controls");
  const filterSelect = document.getElementById("filter-status");
  if (!container) return;

  let allEvaluations = [];
  let currentPage = 1;
  const itemsPerPage = 5;
  let currentFilter = (new URLSearchParams(window.location.search)).get("filter") || "all";

  const currentUser = authService.getSession();

  try {
    const [evaluations, users, periods, templates] = await Promise.all([
      evaluationService.getByEvaluator(currentUser.id),
      userService.get(),
      periodService.get(),
      templatesService.getTemplates()
    ]);

    allEvaluations = evaluations;

    const usersMap = new Map(users.map(u => [u.id, u]));
    const periodsMap = new Map(periods.map(p => [p.id, p]));
    const templatesMap = new Map(templates.map(t => [t.id, t]));

    const renderList = () => {
      let filtered = allEvaluations;
      if (currentFilter !== 'all') {
        filtered = filtered.filter(ev => ev.status === currentFilter);
      }

      if (filtered.length === 0) {
        container.innerHTML = `
          <article class="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-10 text-center">
            <p class="text-[var(--text-muted)]">No hay evaluaciones que coincidan con tu búsqueda.</p>
            ${currentFilter === 'all' ? '<p class="text-xs text-[var(--text-muted)] mt-2">Nota: Las evaluaciones enviadas como "Anónimas" no se asocian a tu perfil para resguardar tu privacidad.</p>' : ''}
          </article>
        `;
        paginationControls.innerHTML = "";
        return;
      }

      const totalPages = Math.ceil(filtered.length / itemsPerPage);
      if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;

      const startIndex = (currentPage - 1) * itemsPerPage;
      const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

      container.innerHTML = paginated.map(ev => {
        const evaluatee = usersMap.get(Number(ev.evaluatee_id)) || usersMap.get(String(ev.evaluatee_id));
        const period = periodsMap.get(Number(ev.period_id)) || periodsMap.get(String(ev.period_id));
        const evaluateeName = evaluatee ? evaluatee.name : `Usuario #${ev.evaluatee_id}`;
        const evaluateeRole = evaluatee?.roles?.length
          ? evaluatee.roles.map(r => r.replace('_', ' ')).join(' / ')
          : 'Colaborador';
        const periodName = period ? period.name : `Periodo #${ev.period_id}`;

        const formattedDate = ev.submitted_at ? formatDateLong(ev.submitted_at) : "No enviada";

        const statusBadge = ev.status === "submitted"
          ? `<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">Enviada</span>`
          : `<span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600 dark:bg-amber-950/20 dark:text-amber-400">Borrador</span>`;

        return `
          <article class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-md transition-all hover:shadow-lg">
            <div>
              <div class="flex items-center gap-3">
                <h3 class="text-lg font-bold text-[var(--text-main)]"><span class="font-medium text-[var(--text-muted)]">Evaluaste a:</span> ${evaluateeName}</h3>
                ${statusBadge}
              </div>
              <p class="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-wider font-semibold">${evaluateeRole}</p>
              <p class="text-sm text-[var(--text-muted)] mt-2">Periodo: <strong class="text-[var(--text-main)]">${periodName}</strong> · Fecha: <strong class="text-[var(--text-main)]">${formattedDate}</strong></p>
            </div>
            
            <div class="flex items-center gap-3">
              ${ev.status === "draft" 
                ? `<a href="/evaluations/new?role=${evaluatee?.roles?.[0] || 'coder'}&evaluatee_id=${ev.evaluatee_id}" class="rounded-xl border border-[var(--brand-bg)] bg-[var(--brand-bg)] px-4 py-2 text-xs font-bold text-white transition hover:bg-[var(--brand-hover)]">Continuar evaluación</a>`
                : `<button class="rounded-xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-2 text-xs font-bold text-[var(--text-main)] transition hover:bg-[var(--border-main)]" 
                    onclick="showEvaluationDetail(${ev.id})">
                    Ver detalle
                  </button>`
              }
            </div>
          </article>
        `;
      }).join("");

      renderPagination(totalPages);
    };

    const renderPagination = (totalPages) => {
      if (totalPages <= 1) {
        paginationControls.innerHTML = "";
        return;
      }
      
      let html = `<button id="prev-page" class="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-main)] bg-[var(--bg-base)] text-[var(--text-main)] transition-colors hover:bg-[var(--border-main)] disabled:opacity-50 disabled:cursor-not-allowed" ${currentPage === 1 ? 'disabled' : ''}>
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
      </button>`;
      
      for (let i = 1; i <= totalPages; i++) {
        const isActive = i === currentPage;
        html += `<button class="page-btn flex h-10 w-10 items-center justify-center rounded-xl font-bold transition-all ${isActive ? 'bg-[var(--brand-bg)] text-white shadow-md' : 'border border-[var(--border-main)] bg-[var(--bg-base)] text-[var(--text-main)] hover:bg-[var(--border-main)]'}" data-page="${i}">${i}</button>`;
      }
      
      html += `<button id="next-page" class="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-main)] bg-[var(--bg-base)] text-[var(--text-main)] transition-colors hover:bg-[var(--border-main)] disabled:opacity-50 disabled:cursor-not-allowed" ${currentPage === totalPages ? 'disabled' : ''}>
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
      </button>`;

      paginationControls.innerHTML = html;

      const prevBtn = document.getElementById('prev-page');
      if (prevBtn) prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderList(); } });

      const nextBtn = document.getElementById('next-page');
      if (nextBtn) nextBtn.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; renderList(); } });

      document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          currentPage = parseInt(e.target.dataset.page);
          renderList();
        });
      });
    };

    setupDropdown('filter-status', (val) => {
      currentFilter = val;
      currentPage = 1;
      renderList();
    });

    // Initialize initial render
    renderList();

    // Usar la función importada del modal (ya existente en components) si se integra,
    // o mantener la actual pero importando showEvaluationDetailModal.
    // Como ya existe un modal bonito en evaluation_detail_modal.js, lo usamos:
    window.showEvaluationDetail = (evalId) => {
      const evaluation = allEvaluations.find(e => e.id === evalId);
      if (!evaluation) return;

      const evaluatee = usersMap.get(Number(evaluation.evaluatee_id)) || usersMap.get(String(evaluation.evaluatee_id));
      const evaluateeName = evaluatee ? evaluatee.name : `Usuario #${evaluation.evaluatee_id}`;

      const template = templatesMap.get(evaluation.form_id);
      const questionsMap = new Map();
      if (template && template.questions) {
        template.questions.forEach(q => questionsMap.set(String(q.id), q));
      }

      // Evitamos error si no está definida en el scope y usamos importación dinámica o manual:
      import('../../components/evaluation_detail_modal.js').then(module => {
        module.showEvaluationDetailModal(evaluation, evaluateeName, template, questionsMap);
      }).catch(err => {
        console.error("No se pudo cargar el modal", err);
      });
    };

  } catch (err) {
    showToast("Error", "error", "No se pudieron cargar tus evaluaciones.");
    console.error(err);
  }
};
