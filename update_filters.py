import re

# ================================
# 1. ACTUALIZAR metrics.view.js
# ================================
metrics_path = r'C:\Users\manue\Documents\Tutor\riwi-lead-trace\frontend\src\views\admin\metrics.view.js'
with open(metrics_path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'import { masterService }' not in content:
    content = content.replace('import { periodService } from "../../services/periods.service";', 'import { periodService } from "../../services/periods.service";\nimport { masterService } from "../../services/master.service";')

# Add variables
old_vars = """  let currentPeriodId = null;
  let currentRoleFilter = "all";
  let currentRealCohortFilter = "all";
  let currentClanFilter = "all";"""
new_vars = """  let currentPeriodId = null;
  let currentRoleFilter = "all";
  let currentRealCohortFilter = "all";
  let currentClanFilter = "all";
  let masterCohorts = [];
  let masterClans = [];"""
content = content.replace(old_vars, new_vars)

# Load master data in initPeriods
old_init = """  async function initPeriods() {
    try {
      periods = await periodService.get();"""
new_init = """  async function initPeriods() {
    try {
      [periods, masterCohorts, masterClans] = await Promise.all([
        periodService.get(),
        masterService.getCohorts(),
        masterService.getClans()
      ]);
      
      // Init static filters
      initMasterFilters();
      """
content = content.replace(old_init, new_init)

# Replace the dynamic cohort/clan filtering in loadMetrics
old_load_metrics_part = """      let list = summary.evaluatees;

      // Actualizar selectores de cohorte y clanes
      const realCohortContainer = document.getElementById("real-cohort-dropdown-container");
      const clanContainer = document.getElementById("clan-dropdown-container");
      
      if (realCohortContainer && clanContainer) {
        // Lógica de Cohorte
        const uniqueCohorts = [...new Set(summary.evaluatees.map(e => e.cohort_name).filter(Boolean))].sort();
        const cohortOptions = [
          { value: 'all', label: 'Todas las cohortes' },
          ...uniqueCohorts.map(c => ({ value: c, label: c }))
        ];
        
        realCohortContainer.innerHTML = dropdownComponent('filter-real-cohort', cohortOptions, currentRealCohortFilter);
        setupDropdown('filter-real-cohort');
        const cohortSelector = document.getElementById("filter-real-cohort");
        if (cohortSelector) {
          const newSelector = cohortSelector.cloneNode(true);
          cohortSelector.parentNode.replaceChild(newSelector, cohortSelector);
          newSelector.addEventListener("change", async (e) => {
            currentRealCohortFilter = e.target.value;
            currentClanFilter = "all"; // Reset clan on cohort change
            await loadMetrics(currentPeriodId, currentRoleFilter);
          });
        }

        // Lógica de Clan dependiente
        let possibleClans = summary.evaluatees;
        if (currentRealCohortFilter !== 'all') {
          possibleClans = possibleClans.filter(e => e.cohort_name === currentRealCohortFilter);
        }
        
        const uniqueClans = [...new Set(possibleClans.map(e => e.clan_name).filter(Boolean))].sort();
        const clanOptions = [
          { value: 'all', label: 'Todos los clanes' },
          ...uniqueClans.map(c => ({ value: c, label: c }))
        ];
        
        clanContainer.innerHTML = dropdownComponent('filter-clan', clanOptions, currentClanFilter);
        setupDropdown('filter-clan');
        const clanSelector = document.getElementById("filter-clan");
        if (clanSelector) {
          const newSelector = clanSelector.cloneNode(true);
          clanSelector.parentNode.replaceChild(newSelector, clanSelector);
          newSelector.addEventListener("change", async (e) => {
            currentClanFilter = e.target.value;
            await loadMetrics(currentPeriodId, currentRoleFilter);
          });
        }
      }

      if (roleFilter !== "all") {"""

new_load_metrics_part = """      let list = summary.evaluatees;

      if (roleFilter !== "all") {"""
content = content.replace(old_load_metrics_part, new_load_metrics_part)

init_master_filters = """  function initMasterFilters() {
    const realCohortContainer = document.getElementById("real-cohort-dropdown-container");
    const clanContainer = document.getElementById("clan-dropdown-container");

    if (realCohortContainer) {
      const cohortOptions = [
        { value: 'all', label: 'Todas las cohortes' },
        ...masterCohorts.map(c => ({ value: c.name, label: c.name }))
      ];
      realCohortContainer.innerHTML = dropdownComponent('filter-real-cohort', cohortOptions, currentRealCohortFilter);
      setupDropdown('filter-real-cohort');
      const cohortSelector = document.getElementById("filter-real-cohort");
      if (cohortSelector) {
        cohortSelector.addEventListener("change", async (e) => {
          currentRealCohortFilter = e.target.value;
          currentClanFilter = "all";
          updateClanDropdown();
          await loadMetrics(currentPeriodId, currentRoleFilter);
        });
      }
    }
    updateClanDropdown();
  }

  function updateClanDropdown() {
    const clanContainer = document.getElementById("clan-dropdown-container");
    if (!clanContainer) return;
    
    let possibleClans = masterClans;
    if (currentRealCohortFilter !== 'all') {
      possibleClans = possibleClans.filter(c => c.cohort_name === currentRealCohortFilter);
    }
    
    const clanOptions = [
      { value: 'all', label: 'Todos los clanes' },
      ...possibleClans.map(c => ({ value: c.name, label: c.name }))
    ];
    clanContainer.innerHTML = dropdownComponent('filter-clan', clanOptions, currentClanFilter);
    setupDropdown('filter-clan');
    const clanSelector = document.getElementById("filter-clan");
    if (clanSelector) {
      clanSelector.addEventListener("change", async (e) => {
        currentClanFilter = e.target.value;
        await loadMetrics(currentPeriodId, currentRoleFilter);
      });
    }
  }

  async function loadMetrics"""
content = content.replace("  async function loadMetrics", init_master_filters)

with open(metrics_path, 'w', encoding='utf-8') as f:
    f.write(content)


# ================================
# 2. ACTUALIZAR dashboard.view.js
# ================================
dash_path = r'C:\Users\manue\Documents\Tutor\riwi-lead-trace\frontend\src\views\dashboard.view.js'
with open(dash_path, 'r', encoding='utf-8') as f:
    dash_content = f.read()

if 'import { masterService }' not in dash_content:
    dash_content = dash_content.replace('import { periodService } from "../services/periods.service";', 'import { periodService } from "../services/periods.service";\nimport { masterService } from "../services/master.service";')

# Inject loading of master data in setupDashboard
old_dash_init = """    let currentPeriods = [];
    try {
      currentPeriods = await periodService.get();
    } catch (e) {"""
new_dash_init = """    let currentPeriods = [];
    let masterCohorts = [];
    let masterClans = [];
    try {
      [currentPeriods, masterCohorts, masterClans] = await Promise.all([
        periodService.get(),
        masterService.getCohorts(),
        masterService.getClans()
      ]);
    } catch (e) {"""
dash_content = dash_content.replace(old_dash_init, new_dash_init)

# Replace the options rendering
old_dash_options = """          <!-- Se llenan después -->
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <label class="text-sm font-semibold text-[var(--text-muted)]">Filtrar por Clan:</label>
        <div id="clan-filter-container">
          <!-- Se llenan después -->
        </div>
      </div>
    </div>

    <!-- Evaluadores -->"""
new_dash_options = """        </div>
      </div>
      <div class="flex flex-col gap-2">
        <label class="text-sm font-semibold text-[var(--text-muted)]">Filtrar por Clan:</label>
        <div id="clan-filter-container">
        </div>
      </div>
    </div>

    <!-- Evaluadores -->"""
dash_content = dash_content.replace(old_dash_options, new_dash_options)

old_dash_fill = """    const cohortContainer = document.getElementById('cohort-filter-container');
    const clanContainer = document.getElementById('clan-filter-container');

    if (cohortContainer) {
      const allCohorts = [...new Set(dashboardEvaluatees.map(e => e.cohort_name).filter(Boolean))];
      const opts = [{ value: 'all', label: 'Todas' }, ...allCohorts.map(c => ({ value: c, label: c }))];
      cohortContainer.innerHTML = dropdownComponent('dashboard-cohort-filter', opts, 'all');
    }
    
    if (clanContainer) {
      const allClans = [...new Set(dashboardEvaluatees.map(e => e.clan_name).filter(Boolean))];
      const opts = [{ value: 'all', label: 'Todos' }, ...allClans.map(c => ({ value: c, label: c }))];
      clanContainer.innerHTML = dropdownComponent('dashboard-clan-filter', opts, 'all');
    }

    const updateDashboardTables = () => {"""

new_dash_fill = """    const cohortContainer = document.getElementById('cohort-filter-container');
    const clanContainer = document.getElementById('clan-filter-container');

    const updateDashboardTables = () => {
      const clanSelector = document.getElementById('dashboard-clan-filter');
      const currentClan = clanSelector ? clanSelector.dataset.value || 'all' : 'all';
      const cohortSelector = document.getElementById('dashboard-cohort-filter');
      const currentCohort = cohortSelector ? cohortSelector.dataset.value || 'all' : 'all';
      
      let filtered = dashboardEvaluatees;
      if (currentClan !== 'all') filtered = filtered.filter(e => e.clan_name === currentClan);
      if (currentCohort !== 'all') filtered = filtered.filter(e => e.cohort_name === currentCohort);
      
      const topTutors = filtered.filter(e => e.role === "tutor").sort((a, b) => b.average_score - a.average_score).slice(0, 3);
      const topLeaders = filtered.filter(e => e.role === "team_leader").sort((a, b) => b.average_score - a.average_score).slice(0, 3);
      
      const buildTable = (title, data) => `
        <div class="bg-[var(--bg-panel)] rounded-3xl border border-[var(--border-main)] shadow-sm overflow-hidden flex-1">
          <div class="p-4 border-b border-[var(--border-main)] bg-[var(--bg-base)]">
            <h3 class="text-lg font-bold text-[var(--text-main)]">${title}</h3>
          </div>
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-[var(--border-main)] text-[var(--text-muted)] text-sm bg-[var(--bg-panel)]">
                <th class="px-4 py-3 font-semibold w-16 text-center">#</th>
                <th class="px-4 py-3 font-semibold">Nombre</th>
                <th class="px-4 py-3 font-semibold text-right">ICP</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--border-main)]">
              ${data.length > 0 ? data.map((e, index) => {
                let medalIcon = "";
                let rowClass = "hover:bg-[var(--bg-base)] transition-colors";
                if (index === 0) {
                  medalIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto"><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 14.7v4.6"/></svg>';
                } else if (index === 1) {
                  medalIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B8B8B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto"> <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/> <path d="M11 12 5.12 2.2"/> <path d="m13 12 5.88-9.8"/> <path d="M8 7h8"/> <circle cx="12" cy="17" r="5"/> <path d="M10.4 15.6c.4-.6 1-.9 1.7-.9.8 0 1.4.4 1.4 1 0 .6-.3.9-1.1 1.5l-1.8 1.3H14"/> </svg>';
                } else if (index === 2) {
                  medalIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B87333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto"> <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/> <path d="M11 12 5.12 2.2"/> <path d="m13 12 5.88-9.8"/> <path d="M8 7h8"/> <circle cx="12" cy="17" r="5"/> <path d="M10.5 15h2c.6 0 1 .3 1 .8s-.4.8-1 .8"/> <path d="M12.5 16.6c.8 0 1.2.4 1.2 1s-.5 1-1.4 1c-.6 0-1.1-.2-1.5-.6"/> </svg>';
                } else {
                  medalIcon = `<span class="font-bold text-[var(--text-muted)]">${index + 1}</span>`;
                }
                return `
                  <tr class="${rowClass}">
                    <td class="px-4 py-3 text-center">${medalIcon}</td>
                    <td class="px-4 py-3 font-bold text-[var(--text-main)] truncate">
                      ${escapeHtml(e.name)}
                      <span class="block text-xs font-normal text-[var(--text-muted)]">${escapeHtml(e.cohort_name || 'Sin cohorte')} - ${escapeHtml(e.clan_name || 'Sin clan')}</span>
                    </td>
                    <td class="px-4 py-3 text-right font-black text-[var(--text-main)]">${e.average_score}</td>
                  </tr>
                `;
              }).join('') : `
                <tr>
                  <td colspan="3" class="px-4 py-6 text-center text-[var(--text-muted)]">No hay suficientes datos.</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      `;
      document.getElementById('dashboard-top-tables').innerHTML = buildTable("Top Team Leaders", topLeaders) + buildTable("Top Tutores", topTutors);
    };

    const updateClanDropdown = (selectedCohort) => {
      let filteredClans = masterClans;
      if (selectedCohort && selectedCohort !== 'all') {
        filteredClans = filteredClans.filter(c => c.cohort_name === selectedCohort);
      }
      const opts = [{ value: 'all', label: 'Todos' }, ...filteredClans.map(c => ({ value: c.name, label: c.name }))];
      clanContainer.innerHTML = dropdownComponent('dashboard-clan-filter', opts, 'all');
      setupDropdown('dashboard-clan-filter', updateDashboardTables);
    };

    if (cohortContainer) {
      const opts = [{ value: 'all', label: 'Todas' }, ...masterCohorts.map(c => ({ value: c.name, label: c.name }))];
      cohortContainer.innerHTML = dropdownComponent('dashboard-cohort-filter', opts, 'all');
      setupDropdown('dashboard-cohort-filter', (val) => {
        updateClanDropdown(val);
        updateDashboardTables();
      });
    }
    
    if (clanContainer) {
      updateClanDropdown('all');
    }"""

# I need to match everything from `const updateDashboardTables` down to `document.getElementById('dashboard-top-tables')` in order to replace the old logic cleanly.
import re
dash_content = re.sub(r'const cohortContainer = document.getElementById.*?document\.getElementById\(\'dashboard-top-tables\'\)\.innerHTML = buildTable\("Top Team Leaders", topLeaders\) \+ buildTable\("Top Tutores", topTutors\);\n    };', new_dash_fill, dash_content, flags=re.DOTALL)

with open(dash_path, 'w', encoding='utf-8') as f:
    f.write(dash_content)
