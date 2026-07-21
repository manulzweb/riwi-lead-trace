import { request } from './api.service.js';

export const cohortsService = {
  async get() {
    return await request('/cohorts');
  }
};
