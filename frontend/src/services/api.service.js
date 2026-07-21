const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const jsonHeaders = {
  "Content-Type": "application/json"
}

// Arma las options de fetch para un POST/PUT/PATCH con body JSON. Varios
// services (auth, evaluation, users, forms) dependen de este helper.
export const jsonOptions = (method, data) => ({
  method,
  headers: jsonHeaders,
  body: JSON.stringify(data)
})

export const request = async (path, options = {}) => {
  const fetchOptions = { ...options, cache: 'no-store' };
  const response = await fetch(BASE_URL + path, fetchOptions)
  if (!response.ok) {
    // Mantiene el formato de mensaje existente (varios callers hacen
    // error.message.includes("404")) y ademas expone el detalle real del
    // backend en error.detail/error.status para quien lo necesite (ej. el
    // texto especifico del rechazo de la IA en PATCH /questions/:id).
    let detail = null
    try {
      detail = (await response.json())?.detail ?? null
    } catch {
      // body vacio o no-JSON, se deja detail en null
    }
    const error = new Error(`Error: ${response.status} La peticion ha fallado en el endpoint ${BASE_URL}${path}`)
    error.status = response.status
    error.detail = detail
    throw error
  }
  if (response.status === 204) {
    return null;
  }
  return await response.json()
}