import { request } from './api.service.js';

export const clansService = {
  async get() {
    return await request('/clans');
  }
};
