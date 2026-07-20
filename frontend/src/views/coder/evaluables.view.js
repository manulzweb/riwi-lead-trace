import { navBarComponent } from "../../components/navbar";
import { evaluablesService } from "../../services/evaluables.service";
import { authService } from "../../services/auth.service";
import { evaluationService } from "../../services/evaluation.service";
import { periodService } from "../../services/periods.service";
import { escapeHtml } from "../../utils/validators";
import { showToast } from "../../components/alerts";

let evaluables = [];
let evaluations = [];
let activePeriod = null;
let currentFilter = "all"; // 'all' | 'team_leader' | 'tutor'

export const renderEvaluables = () => {
  return `
    ${navBarComponent()}
    <main class="mx-auto max-w-6xl px-6 py-10">
      <section class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-bg)]">Coder</p>
          <h1 class="mt-1 text-4xl font-black tracking-tight text-[var(--text-main)]">Elegir evaluado</h1>
          <p class="mt-2 text-sm text-[var(--text-muted)]">Selecciona a un Team Leader o Tutor para enviarle tu retroalimentación.</p>
        </div>
        
        <!-- Filtros de rol -->
        <div class="flex items-center gap-2 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-1.5 self-start md:self-auto">
          <button id="filter-all" class="rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer">
            Todos
          </button>
          <button id="filter-team_leader" class="rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer">
            Team Leaders
          </button>
          <button id="filter-tutor" class="rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer">
            Tutores
          </button>
        </div>
      </section>

      <section id="evaluables-list" class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div class="h-44 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
        <div class="h-44 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
        <div class="h-44 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
      </section>
    </main>
  `;
};

const updateFilterButtons = () => {
  const filters = ["all", "team_leader", "tutor"];
  filters.forEach(f => {
    const btn = document.getElementById(`filter-${f}`);
    if (btn) {
      if (currentFilter === f) {
        btn.className = "rounded-xl bg-[var(--brand-bg)] px-4 py-2 text-xs font-bold text-white shadow-sm cursor-pointer";
      } else {
        btn.className = "rounded-xl px-4 py-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer";
      }
    }
  });
};

const renderEvaluablesList = () => {
  const container = document.getElementById("evaluables-list");
  if (!container) return;

  const currentUser = authService.getSession();

  // Filtrar según el rol seleccionado (Excluir al usuario logueado)
  let filtered = evaluables.filter(u => u.id !== currentUser?.id);

  if (currentFilter !== "all") {
    filtered = filtered.filter(u => u.roles?.includes(currentFilter));
  }

  if (filtered.length === 0) {
    container.className = "mt-8";
    container.innerHTML = `
      <article class="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-12 text-center shadow-lg">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--border-main)] text-[var(--brand-bg)]">
          <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 class="mt-6 text-xl font-bold text-[var(--text-main)]">Sin evaluables asignados</h3>
        <p class="mt-2 text-sm text-[var(--text-muted)]">No se encontraron Team Leaders o Tutores disponibles para evaluar bajo los filtros seleccionados.</p>
      </article>
    `;
    return;
  }

  container.className = "mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3";
  container.innerHTML = filtered.map(user => {
    const isEvaluated = evaluations.some(ev =>
      ev.evaluatee_id === user.id &&
      ev.period_id === activePeriod?.id &&
      ev.status === "submitted"
    );

    // Un usuario puede tener ambos roles (team_leader y tutor) a la vez: si el
    // filtro activo coincide con uno de sus roles se usa ese; si no, se prioriza
    // team_leader (mismo criterio binario que ya tenía el badge).
    const evaluableRole = currentFilter !== "all" && user.roles?.includes(currentFilter)
      ? currentFilter
      : (user.roles?.includes("team_leader") ? "team_leader" : "tutor");

    const roleBadge = evaluableRole === "team_leader"
      ? `<span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-950/20 dark:text-blue-400">Team Leader</span>`
      : `<span class="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-600 dark:bg-purple-950/20 dark:text-purple-400">Tutor</span>`;

    const statusBadge = isEvaluated
      ? `<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 flex items-center gap-1">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
          Evaluado
         </span>`
      : `<span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600 dark:bg-amber-950/20 dark:text-amber-400">Pendiente</span>`;

    const actionButton = isEvaluated
      ? `<button disabled class="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-base)] px-4 py-3 text-sm font-bold text-[var(--text-muted)] cursor-not-allowed">
          Ya evaluado
         </button>`
      : `<a href="/evaluations/new?evaluatee_id=${user.id}&role=${evaluableRole}"
          class="w-full text-center rounded-2xl bg-[var(--brand-bg)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--brand-hover)] hover:shadow-md transition duration-300">
          Evaluar
         </a>`;

    return `
      <article class="flex flex-col justify-between rounded-3xl border border-[var(--border-main)] bg-[var(--bg-panel)] p-6 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <div>
          <div class="flex items-center justify-between gap-3">
            ${roleBadge}
            ${statusBadge}
          </div>
          <h3 class="mt-4 text-lg font-bold text-[var(--text-main)] truncate">${escapeHtml(user.name)}</h3>
          <p class="text-xs text-[var(--text-muted)] truncate mt-1">${escapeHtml(user.email)}</p>
        </div>
        <div class="mt-6 flex">
          ${actionButton}
        </div>
      </article>
    `;
  }).join("");
};

export const setupEvaluables = async () => {
  currentFilter = "all";
  updateFilterButtons();

  const currentUser = authService.getSession();

  // Registrar listeners de filtros
  const filters = ["all", "team_leader", "tutor"];
  filters.forEach(f => {
    const btn = document.getElementById(`filter-${f}`);
    if (btn) {
      btn.addEventListener("click", () => {
        currentFilter = f;
        updateFilterButtons();
        renderEvaluablesList();
      });
    }
  });

  try {
    const [evalsList, activePeriodData, allEvaluables] = await Promise.all([
      evaluationService.getByEvaluator(currentUser.id),
      periodService.get().then(periods => periods.find(p => p.is_active) || periods[0]),
      evaluablesService.get()
    ]);

    evaluations = evalsList;
    activePeriod = activePeriodData;
    evaluables = allEvaluables;

    renderEvaluablesList();
  } catch (err) {
    showToast("Error", "error", "No se pudieron cargar los evaluables disponibles.");
    console.error(err);
  }
};
