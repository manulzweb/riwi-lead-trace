import Swal from 'sweetalert2';

export const showEvaluationDetailModal = (evaluation, evaluateeName, form, questionsMap) => {
  const answersHtml = evaluation.answers.map(ans => {
    const questionData = questionsMap.get(String(ans.question_id));
    const questionText = questionData ? questionData.text : `Pregunta #${ans.question_id}`;
    
    let answerDisplay = '';
    if (questionData && (questionData.input_type === 'scale' || questionData.input_type === 'scale_1_5')) {
      answerDisplay = `
        <div class="mt-3 flex items-end gap-1">
          <span class="font-black text-[var(--brand-bg)] text-3xl leading-none">${ans.score || 'N/A'}</span> 
          <span class="text-[var(--text-muted)] font-medium text-sm mb-1">/ 5</span>
        </div>`;
    } else if (questionData && questionData.input_type === 'yes_no') {
      const isYes = String(ans.comment).toLowerCase() === 'yes' || String(ans.comment).toLowerCase() === 'sí';
      const colorClass = isYes 
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800';
      
      answerDisplay = `
        <div class="mt-3 inline-flex items-center rounded-xl border px-4 py-1.5 text-sm font-bold ${colorClass}">
          ${ans.comment || 'N/A'}
        </div>`;
    } else {
      answerDisplay = ans.comment 
        ? `<div class="mt-3 rounded-2xl bg-[var(--bg-base)] p-4 text-sm text-[var(--text-main)] border border-[var(--border-main)] shadow-sm">
            <p class="italic">"${ans.comment}"</p>
           </div>` 
        : `<p class="mt-3 text-sm text-[var(--text-muted)] italic px-2 border-l-2 border-[var(--border-main)]">Sin respuesta</p>`;
    }

    return `
      <div class="bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-2xl p-5 mb-4 shadow-sm transition-shadow hover:shadow-md">
        <h4 class="text-sm font-bold text-[var(--text-main)] leading-relaxed">${questionText}</h4>
        ${answerDisplay}
      </div>
    `;
  }).join("");

  Swal.fire({
    title: `
      <div class="text-left border-b border-[var(--border-main)] pb-4 mb-2">
        <h3 class="text-2xl font-black text-[var(--text-main)] tracking-tight">Resultados de Evaluación</h3>
        <p class="text-sm text-[var(--text-muted)] mt-1.5 font-medium flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          Evaluado: <span class="font-bold text-[var(--text-main)]">${evaluateeName}</span>
        </p>
      </div>
    `,
    html: `
      <div class="text-left mt-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        ${answersHtml}
      </div>
    `,
    width: '650px',
    showCloseButton: true,
    confirmButtonText: "Cerrar detalles",
    buttonsStyling: false,
    customClass: {
      popup: "rounded-[2.5rem] border border-[var(--border-main)] bg-[var(--bg-base)] p-4 sm:p-6 shadow-2xl",
      closeButton: "text-[var(--text-muted)] hover:text-[var(--danger-text)] hover:bg-[var(--danger-bg)] rounded-full transition-colors m-4",
      confirmButton: "rounded-2xl bg-[var(--brand-bg)] border-none px-8 py-3.5 font-bold text-white hover:bg-[var(--brand-hover)] w-full mt-6 transition-all shadow-md hover:shadow-lg"
    }
  });
};
