import { request } from './api.service.js'

const get = async () => await request('/evaluables')

export const evaluablesService = {
  get
}
