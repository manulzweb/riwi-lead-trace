import { request, jsonOptions } from './api.service.js';

const getCategories = async () => {
  return await request('/categories');
};

const create = async (name) => await request('/categories', jsonOptions('POST', { name }));
const update = async (id, name) => await request(`/categories/${id}`, jsonOptions('PUT', { name }));
const remove = async (id, adminId) => {
  const query = adminId ? `?admin_id=${adminId}` : '';
  return await request(`/categories/${id}${query}`, { method: 'DELETE' });
};

export const categoryService = {
  getCategories,
  create,
  update,
  remove
};
