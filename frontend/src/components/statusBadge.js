export const statusBadgeComponent = (status) => {
  const statusColors = {
    "Completada": "text-green-600",
    "En progreso": "text-blue-600",
    "Pendiente": "text-amber-600"
  };

  const colorClass = statusColors[status] || "text-slate-600";

  return `
    <p class="text-xs font-bold uppercase tracking-[0.25em] ${colorClass}">${status}</p>
  `;
};
