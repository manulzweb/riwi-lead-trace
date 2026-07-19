import dayjs from 'dayjs';
import 'dayjs/locale/es.js';

dayjs.locale('es');

// Fecha corta, ej. "19/07/2026" (reemplaza new Date(x).toLocaleDateString() suelto).
export const formatDate = (value) => (value ? dayjs(value).format('DD/MM/YYYY') : '');

// Fecha larga en español, ej. "19 de julio de 2026" (usada en historial de evaluaciones).
export const formatDateLong = (value) => (value ? dayjs(value).format('D [de] MMMM [de] YYYY') : '');

// Fecha + hora, ej. "19/07/2026 17:24" (usada en la bitacora de actividad).
export const formatDateTime = (value) => (value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '');

export { dayjs };
