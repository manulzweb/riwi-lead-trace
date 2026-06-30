const BASE_URL = 'http://localhost:3000'

const jsonHeaders = {
  "Content-Type": "application/json"
}

export const request = async (path, options) => {
  const response = await fetch(BASE_URL + path, options)
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
