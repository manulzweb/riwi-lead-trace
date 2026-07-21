import { request } from './api.service.js'

const getSummary = async (periodId) => {
  const res = await request(`/metrics/summary?period_id=${periodId}`);
  return Array.isArray(res) ? res[0] : res;
};

const getAiSummary = async (evaluateeId, periodId) => {
  const res = await request(`/metrics/ai-summary?evaluatee_id=${evaluateeId}&period_id=${periodId}`);
  return Array.isArray(res) ? res[0] : res;
};

const getHistory = async (evaluateeId) => await request(`/metrics/history?evaluatee_id=${evaluateeId}`);

export const metricsService = {
  getSummary,
  getAiSummary,
  getHistory
}
