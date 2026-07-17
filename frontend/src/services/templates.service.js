import { request, jsonOptions } from './api.service.js';

const getTemplates = async () => await request('/forms');

const createTemplate = async (templateData) => await request('/forms', jsonOptions('POST', templateData));

const updateTemplate = async (id, templateData) => await request(`/forms/${id}`, jsonOptions('PUT', templateData));

const deleteTemplate = async (id) => await request(`/forms/${id}`, { method: 'DELETE' });

export const templatesService = {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate
};
