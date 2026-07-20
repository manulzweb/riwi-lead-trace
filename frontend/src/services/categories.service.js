import { request } from './api.service.js';

const getCategories = async () => {
  return await request('/categories');
};

export const categoryService = {
  getCategories
};
