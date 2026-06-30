const SESSION_KEY = "SESSION_ACTUAL"

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
    setSession,
    getSession,
    clearSession,
}