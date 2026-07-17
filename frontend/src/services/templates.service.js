import { request, jsonOptions } from './api.service.js';

const getTemplates = async () => await request('/custom_templates');

const createTemplate = async (templateData) => await request('/custom_templates', jsonOptions('POST', templateData));

const updateTemplate = async (id, templateData) => await request(`/custom_templates/${id}`, jsonOptions('PUT', templateData));

const deleteTemplate = async (id) => await request(`/custom_templates/${id}`, { method: 'DELETE' });

export const templatesService = {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate
};
