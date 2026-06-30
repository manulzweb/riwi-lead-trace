import { request, jsonOptions } from './api.service.js'
import { authService } from './auth.service.js'

const get = async () => await request('/tasks')

const post = async (newData) => await request('/tasks', jsonOptions('POST', newData))

const getById = async (id) => await request(`/tasks/${id}`)

const ensureOwnerOrAdmin = async (id) => {
  const user = authService.getSession();
  if (!user) throw new Error('No autenticado');
  const task = await getById(id);
  const isAdmin = user.roles && user.roles.includes('admin');
  if (!isAdmin && String(task.userId) !== String(user.id)) {
    throw new Error('No autorizado: no eres propietario de la tarea');
  }
  return task;
}

const put = async (id, newData) => {
  await ensureOwnerOrAdmin(id);
  return await request(`/tasks/${id}`, jsonOptions('PUT', newData))
}

const patch = async (id, newData) => {
  await ensureOwnerOrAdmin(id);
  return await request(`/tasks/${id}`, jsonOptions('PATCH', newData))
}

const del = async (id) => {
  await ensureOwnerOrAdmin(id);
  return await request(`/tasks/${id}`, { method: 'DELETE' })
}
export const taskService = {
  get,
  post,
  put,
  patch,
  del,
  getById
}