/**
 * Reusable table component
 * 
 * @param {Object} props
 * @param {string} [props.title] - Optional title for the table header
 * @param {Array<{label: string, align?: string, width?: string}>} props.columns - Column headers
 * @param {Array<any>} props.data - Data to render
 * @param {Function} props.renderRow - Function that takes (item, index) and returns a <tr> HTML string
 * @param {string} [props.emptyStateHtml] - HTML to show when data is empty
 * @returns {string} HTML string of the table
 */
export const tableComponent = ({ title, columns, data, renderRow, emptyStateHtml }) => {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  };

  const headerHtml = title ? `
    <div class="p-4 border-b border-[var(--border-main)] bg-[var(--bg-base)]">
      <h3 class="text-lg font-bold text-[var(--text-main)]">${title}</h3>
    </div>
  ` : '';

  const columnsHtml = columns.map(col => {
    const alignment = alignClass[col.align || 'left'];
    const widthStyle = col.width ? `w-${col.width}` : '';
    return `<th scope="col" class="px-4 py-3 font-semibold ${alignment} ${widthStyle}">${col.label}</th>`;
  }).join('');

  const bodyHtml = data.length > 0 
    ? data.map((item, index) => renderRow(item, index)).join('')
    : `<tr>
        <td colspan="${columns.length}" class="px-4 py-10 text-center text-[var(--text-muted)]">
          ${emptyStateHtml || 'No hay datos disponibles.'}
        </td>
      </tr>`;

  return `
    <div class="bg-[var(--bg-panel)] rounded-3xl border border-[var(--border-main)] shadow-sm overflow-hidden flex-1">
      ${headerHtml}
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-[var(--border-main)] text-[var(--text-muted)] text-sm bg-[var(--bg-panel)]">
            ${columnsHtml}
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--border-main)]">
          ${bodyHtml}
        </tbody>
      </table>
    </div>
  `;
};
