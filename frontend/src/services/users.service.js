import { request, jsonOptions } from './api.service.js'

const get = async () => await request('/users')

const post = async (newData) => await request('/users', jsonOptions('POST', newData))

const put = async (id, newData) => await request(`/users/${id}`, jsonOptions('PUT', newData))

const patch = async (id, newData) => await request(`/users/${id}`, jsonOptions('PATCH', newData))

const del = async (id) => await request(`/users/${id}`, { method: 'DELETE' })

export const userService = {
  get,
  post,
  put,
  patch,
  del
}