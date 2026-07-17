import { request } from './api.service.js'

const getSummary = async (periodId) => {
  const res = await request(`/metrics_summary?period_id=${periodId}`);
  return Array.isArray(res) ? res[0] : res;
};

const getAiSummary = async (evaluateeId, periodId) => {
  const res = await request(`/metrics_ai_summary?evaluatee_id=${evaluateeId}&period_id=${periodId}`);
  return Array.isArray(res) ? res[0] : res;
};

export const metricsService = {
  getSummary,
  getAiSummary
}
