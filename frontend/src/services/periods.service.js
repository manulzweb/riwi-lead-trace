import { request, jsonOptions } from './api.service.js'

const get = async () => await request('/periods')
const update = async (id, data) => await request(`/periods/${id}`, jsonOptions('PUT', data))
const create = async (data) => await request('/periods', jsonOptions('POST', data))
const remove = async (id) => await request(`/periods/${id}`, { method: 'DELETE' })

export const periodService = {
  get,
  update,
  create,
  remove
}
