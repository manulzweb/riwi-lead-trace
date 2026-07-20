import { request } from './api.service.js';

const getRecent = async (limit = 50) => await request(`/activity-log?limit=${limit}`);

export const activityLogService = {
  getRecent,
};
