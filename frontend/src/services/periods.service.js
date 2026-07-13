import { request } from './api.service.js'

const get = async () => await request('/periods')

export const periodService = {
  get
}
