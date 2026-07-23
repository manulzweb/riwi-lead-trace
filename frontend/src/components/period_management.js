import { periodService } from "../services/periods.service.js";
import { showToast } from "./alerts.js";
import { escapeHtml } from "../utils/validators.js";
import Swal from 'sweetalert2';

export const periodManagementComponent = () => `
  <!-- Period management section -->
  <section class="mt-16 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-[var(--border-main)] pt-12">
    <div>
      <h2 class="text-3xl font-black font-heading tracking-tight text-[var(--text-main)]">Gestión de Periodos</h2>
      <p class="mt-2 text-[var(--text-muted)]">Crea nuevos periodos de evaluación y controla cuál está activo.</p>
    </div>
    <button id="btn-create-period" class="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--text-main)] px-6 py-3 text-sm font-bold text-[var(--bg-base)] transition-all duration-300 ease-in-out hover:bg-[var(--text-muted)] hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
      <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
      Nuevo Periodo
    </button>
  </section>

  <div id="periods-container" aria-live="polite" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <!-- Rendered dynamically -->
  </div>
`;

export const setupPeriodManagement = (onPeriodStateChanged) => {
  const renderPeriodsList = async () => {
    const pContainer = document.getElementById("periods-container");
    if (!pContainer) return;
    
    try {
      const periods = await periodService.get();
      // Sort by start date, newest first.
      periods.sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at));
      
      if (periods.length === 0) {
        pContainer.innerHTML = `<div class="col-span-full p-8 text-center bg-[var(--bg-panel)] rounded-3xl border border-[var(--border-main)]"><p class="text-[var(--text-muted)]">No hay periodos creados aún.</p></div>`;
        return;
      }
      
      pContainer.innerHTML = periods.map(p => {
        const isActive = p.is_active;
        // Semantic global.css tokens: no dark: variants, they switch by theme.
        const statusBadge = isActive
          ? `<span class="bg-[var(--success-bg)] text-[var(--success-text)] px-3 py-1 rounded-full text-xs font-bold border border-[var(--success-text)]/30">Activo</span>`
          : `<span class="bg-[var(--bg-base)] text-[var(--text-muted)] px-3 py-1 rounded-full text-xs font-bold border border-[var(--border-main)]">Inactivo</span>`;
          
        return `
          <div class="flex flex-col justify-between bg-[var(--bg-panel)] border border-[var(--border-main)] p-6 rounded-3xl shadow-sm transition-all hover:shadow-md hover:border-[var(--brand-hover)]">
            <div>
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-xl font-bold text-[var(--text-main)]">${escapeHtml(p.name)}</h3>
                ${statusBadge}
              </div>
              <p class="text-sm text-[var(--text-muted)] font-medium mb-1"><span class="opacity-75">Inicio:</span> ${p.starts_at}</p>
              <p class="text-sm text-[var(--text-muted)] font-medium mb-4"><span class="opacity-75">Fin:</span> ${p.ends_at}</p>
            </div>
            <button class="btn-toggle-period w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
              isActive
                ? 'bg-[var(--danger-bg)] text-[var(--danger-text)] hover:opacity-80 transition-opacity border border-[var(--danger-border)]'
                : 'bg-[var(--brand-bg)] text-[var(--brand-text)] hover:bg-[var(--brand-hover)]'
            }" data-id="${p.id}" data-active="${isActive}">
              ${isActive ? 'Desactivar Periodo' : 'Activar Periodo'}
            </button>
          </div>
        `;
      }).join('');
      
      // Toggle button listeners
      document.querySelectorAll('.btn-toggle-period').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          const currentActive = e.target.getAttribute('data-active') === 'true';
          const newStatus = !currentActive;
          
          try {
            await periodService.update(id, { is_active: newStatus });
            showToast("Estado actualizado", "success");
            await renderPeriodsList();
            if (onPeriodStateChanged) {
              await onPeriodStateChanged();
            }
          } catch (err) {
            console.error(err);
            showToast("Error al actualizar periodo", "error");
          }
        });
      });
      
    } catch (e) {
      console.error(e);
      pContainer.innerHTML = `
        <div class="col-span-full p-4 text-center">
          <p class="text-[var(--danger-text)] text-sm">Error al cargar periodos.</p>
          <button id="btn-retry-periods-mgmt" class="mt-4 rounded-xl bg-[var(--brand-bg)] px-5 py-2.5 text-sm font-bold text-[var(--brand-text)] transition-all hover:bg-[var(--brand-hover)] cursor-pointer">Reintentar</button>
        </div>
      `;
      document.getElementById("btn-retry-periods-mgmt")?.addEventListener("click", renderPeriodsList);
    }
  };

  const btnCreatePeriod = document.getElementById("btn-create-period");
  // Prevent duplicate listeners if setup runs again.
  if (btnCreatePeriod && !btnCreatePeriod.dataset.initialized) {
    btnCreatePeriod.dataset.initialized = "true";
    btnCreatePeriod.addEventListener("click", async () => {
      const { value: formValues } = await Swal.fire({
        title: 'Nuevo Periodo de Evaluación',
        html:
          '<div class="text-left">' +
          '<label class="block text-sm font-bold text-[var(--text-main)] mb-1 mt-4">Nombre del periodo</label>' +
          '<input id="swal-p-name" class="swal2-input w-[90%] mx-auto block !rounded-xl !border-[var(--border-main)] focus:!ring-[var(--brand-bg)]" placeholder="Ej: Q3 2026">' +
          '<label class="block text-sm font-bold text-[var(--text-main)] mb-1 mt-4">Fecha de Inicio</label>' +
          '<input id="swal-p-start" type="date" class="swal2-input w-[90%] mx-auto block !rounded-xl !border-[var(--border-main)] focus:!ring-[var(--brand-bg)]">' +
          '<label class="block text-sm font-bold text-[var(--text-main)] mb-1 mt-4">Fecha de Fin</label>' +
          '<input id="swal-p-end" type="date" class="swal2-input w-[90%] mx-auto block !rounded-xl !border-[var(--border-main)] focus:!ring-[var(--brand-bg)]">' +
          '</div>',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Crear Periodo',
        cancelButtonText: 'Cancelar',
        customClass: {
          popup: 'rounded-[2rem] bg-[var(--bg-panel)] border border-[var(--border-main)]',
          title: 'text-[var(--text-main)] font-black',
          confirmButton: 'rounded-xl bg-[var(--brand-bg)] px-6 py-2.5 font-bold text-[var(--brand-text)]',
          cancelButton: 'rounded-xl bg-[var(--bg-base)] text-[var(--text-main)] px-6 py-2.5 font-bold border border-[var(--border-main)]'
        },
        preConfirm: () => {
          const name = document.getElementById('swal-p-name').value;
          const start = document.getElementById('swal-p-start').value;
          const end = document.getElementById('swal-p-end').value;
          if (!name || !start || !end) {
            Swal.showValidationMessage('Todos los campos son obligatorios');
            return false;
          }
          if (new Date(start) > new Date(end)) {
            Swal.showValidationMessage('La fecha de inicio no puede ser mayor a la fecha de fin');
            return false;
          }
          return { name, starts_at: start, ends_at: end, is_active: false };
        }
      });

      if (formValues) {
        try {
          await periodService.create(formValues);
          showToast("Periodo creado con éxito", "success");
          await renderPeriodsList();
        } catch (err) {
          console.error(err);
          showToast("Error al crear periodo", "error");
        }
      }
    });
  }
  
  return renderPeriodsList();
};
