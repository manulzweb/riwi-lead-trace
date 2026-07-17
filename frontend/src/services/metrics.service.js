import { request } from './api.service.js'

const getSummary = async (periodId) => await request(`/metrics/summary?period_id=${periodId}`)

const getAiSummary = async (evaluateeId, periodId) => await request(`/metrics/ai-summary?evaluatee_id=${evaluateeId}&period_id=${periodId}`)

export const metricsService = {
  getSummary,
  getAiSummary
}
