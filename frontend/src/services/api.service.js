const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const jsonHeaders = {
  "Content-Type": "application/json"
}

// Builds the fetch options for a POST/PUT/PATCH with a JSON body.
export const jsonOptions = (method, data) => ({
  method,
  headers: jsonHeaders,
  body: JSON.stringify(data)
})

export const request = async (path, options = {}) => {
  const fetchOptions = { ...options, cache: 'no-store' };
  const response = await fetch(BASE_URL + path, fetchOptions)
  if (!response.ok) {
    // Keeps the existing message format (some callers check
    // error.message.includes("404")) and also attaches the real backend
    // payload as error.status / error.detail for whoever needs it.
    let detail = null
    try {
      detail = (await response.json())?.detail ?? null
    } catch {
      // Empty or non-JSON body: detail stays null.
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