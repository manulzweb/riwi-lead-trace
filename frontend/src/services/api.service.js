// En desarrollo local no hace falta configurar nada (usa el valor por
// defecto). Al desplegar, la plataforma (Vercel/GitHub Pages) debe definir
// la variable de entorno VITE_API_BASE_URL con la URL real del backend
// desplegado; Vite la reemplaza en tiempo de build.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const TOKEN_KEY = "SESSION_TOKEN" // debe coincidir con la misma clave en auth.service.js

const jsonHeaders = {
  "Content-Type": "application/json"
}

// El backend protege casi todos los endpoints con JWT: si hay token guardado,
// lo mandamos en cada petición sin que cada *.service.js tenga que acordarse.
const authHeader = () => {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const request = async (path, options = {}) => {
  const response = await fetch(BASE_URL + path, {
    ...options,
    headers: { ...authHeader(), ...options.headers }
  })
  if (!response.ok) {
    throw new Error(`Error: ${response.status} La peticion ha fallado en el endpoint ${BASE_URL}${path}`)
  }
  return await response.json()
}

export const jsonOptions = (method, data) => ({
  method: method,
  headers: jsonHeaders,
  body: JSON.stringify(data)
})
