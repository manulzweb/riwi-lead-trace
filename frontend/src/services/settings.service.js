import { request, jsonOptions } from './api.service.js';

// api.service.js exports neither BASE_URL nor a binary-response helper
// (request always calls response.json()), so the CSV download resolves the URL
// here. Known duplication, already reported to the team.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const getSettings = async () => await request('/settings');

// Factory values exposed by the backend. Read-only: it persists nothing.
const getDefaults = async () => await request('/settings/defaults');

const updateSettings = async (data) => await request('/settings', jsonOptions('PUT', data));

// Returns the activity log CSV as a Blob. Throws the same error shape as
// request (status/detail) so views can branch on err.status.
const downloadActivityLogCsv = async () => {
  const response = await fetch(`${BASE_URL}/activity-log/export`, { cache: 'no-store' });

  if (!response.ok) {
    let detail = null;
    try {
      detail = (await response.json())?.detail ?? null;
    } catch {
      // Empty or non-JSON body: detail stays null.
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
