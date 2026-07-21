import { request, jsonOptions } from './api.service.js';

// api.service.js no exporta BASE_URL ni un helper para respuestas binarias
// (`request` siempre hace response.json()), asi que la descarga del CSV resuelve
// la URL aqui. Es duplicacion consciente y esta reportada al equipo: lo correcto
// es exportar BASE_URL / un `requestBlob` desde api.service.js y consumirlo aqui.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const getSettings = async () => await request('/settings');

// Valores de fabrica que expone el backend. Es una lectura: no guarda nada.
const getDefaults = async () => await request('/settings/defaults');

const updateSettings = async (data) => await request('/settings', jsonOptions('PUT', data));

// Devuelve el CSV de la bitacora como Blob. Lanza un error con la misma forma
// que `request` (status/detail) para que las vistas discriminen por err.status.
const downloadActivityLogCsv = async () => {
  const response = await fetch(`${BASE_URL}/activity-log/export`, { cache: 'no-store' });

  if (!response.ok) {
    let detail = null;
    try {
      detail = (await response.json())?.detail ?? null;
    } catch {
      // body vacio o no-JSON, se deja detail en null
    }
    const error = new Error(`Error: ${response.status} La peticion ha fallado en el endpoint ${BASE_URL}/activity-log/export`);
    error.status = response.status;
    error.detail = detail;
    throw error;
  }

  return await response.blob();
};

export const settingsService = {
  getSettings,
  getDefaults,
  updateSettings,
  downloadActivityLogCsv
};
