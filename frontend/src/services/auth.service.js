import { request, jsonOptions } from './api.service.js'

const SESSION_KEY = "SESSION_ACTUAL"

const login = async (email, password) =>
    await request('/auth/login', jsonOptions('POST', { email, password }))

const setSession = (user) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

const getSession = () => {
    const sessionJSON = localStorage.getItem(SESSION_KEY);
    return JSON.parse(sessionJSON) || null;
}

const clearSession = () => {
    localStorage.removeItem(SESSION_KEY)
}


export const authService = {
    login,
    setSession,
    getSession,
    clearSession,
}