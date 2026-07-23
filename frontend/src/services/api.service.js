import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Builds options for POST/PUT/PATCH.
// Kept for backward compatibility with existing code calling jsonOptions
export const jsonOptions = (method, data) => ({
  method,
  data
});

export const request = async (path, options = {}) => {
  try {
    const config = {
      url: path,
      method: options.method || 'GET',
    };
    
    // Support both the old fetch 'body' string and the new axios 'data' object
    if (options.data) {
      config.data = options.data;
    } else if (options.body) {
      config.data = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    }

    if (options.headers) {
      config.headers = options.headers;
    }

    const response = await api(config);
    return response.status === 204 ? null : response.data;
  } catch (axiosError) {
    if (axiosError.response) {
      let detail = axiosError.response.data?.detail ?? null;
      if (Array.isArray(detail)) {
        detail = detail.map(err => {
          const field = err.loc ? err.loc[err.loc.length - 1] : "Campo";
          return `${field}: ${err.msg}`;
        }).join(" | ");
      } else if (typeof detail === "object" && detail !== null) {
        detail = JSON.stringify(detail);
      }
      
      const error = new Error(`Error: ${axiosError.response.status} La peticion ha fallado en el endpoint ${BASE_URL}${path}`);
      error.status = axiosError.response.status;
      error.detail = detail;
      throw error;
    } else {
      const error = new Error(`Error: La peticion ha fallado en el endpoint ${BASE_URL}${path} - ${axiosError.message}`);
      throw error;
    }
  }
}