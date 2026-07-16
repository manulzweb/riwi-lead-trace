import { request, jsonOptions } from './api.service.js'

const SESSION_KEY = "SESSION_ACTUAL"
const TOKEN_KEY = "SESSION_TOKEN" // debe coincidir con la misma clave en api.service.js

const login = async (email, password) =>
    await request('/auth/login', jsonOptions('POST', { email, password }))

const setSession = (user, token) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    localStorage.setItem(TOKEN_KEY, token)
}

const getSession = () => {
    const sessionJSON = localStorage.getItem(SESSION_KEY);
    return JSON.parse(sessionJSON) || null;
}

const clearSession = () => {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(TOKEN_KEY)
}


export const authService = {
    login,
    setSession,
    getSession,
    clearSession,
}
