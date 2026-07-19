import { request } from './api.service.js'

const get = async () => await request('/periods')
const update = async (id, data) => await request(`/periods/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data)
})

export const periodService = {
  get,
  update
}
