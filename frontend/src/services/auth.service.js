import { request, jsonOptions } from './api.service.js'

const SESSION_KEY = "SESSION_ACTUAL"
const TOKEN_KEY = "SESSION_TOKEN" // debe coincidir con la misma clave en api.service.js

const login = async (email, password) => {
    // Para json-server-auth es /login, para el backend real era /auth/login
    const response = await request('/login', jsonOptions('POST', { email, password }));
    // Normalizamos para soportar ambos backends (accessToken vs access_token)
    return {
        user: response.user,
        access_token: response.accessToken || response.access_token
    };
}

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
