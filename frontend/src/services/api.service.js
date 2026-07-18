// En desarrollo local no hace falta configurar nada (usa el valor por
// defecto). Al desplegar, la plataforma (Vercel/GitHub Pages) debe definir
// la variable de entorno VITE_API_BASE_URL con la URL real del backend
// desplegado; Vite la reemplaza en tiempo de build.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const jsonHeaders = {
  "Content-Type": "application/json"
}

// Arma las options de fetch para un POST/PUT/PATCH con body JSON. Varios
// services (auth, evaluation, users, templates) dependen de este helper.
export const jsonOptions = (method, data) => ({
  method,
  headers: jsonHeaders,
  body: JSON.stringify(data)
})

export const request = async (path, options) => {
  const response = await fetch(BASE_URL + path, options)
  if (!response.ok) {
    throw new Error(`Error: ${response.status} La peticion ha fallado en el endpoint ${BASE_URL}${path}`)
  }
  return await response.json()
}