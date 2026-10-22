// src/api/client.js - Cliente HTTP 100% nativo basado en fetch del navegador
const API_URL = import.meta.env.VITE_API_URL || 'https://ulamonitors-uat-back.grye.org'

let isRedirecting = false

// Error personalizado para mantener compatibilidad con lecturas de status y detail
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.response = {
      status,
      data,
    }
  }
}

const buildUrl = (endpoint, params) => {
  let url = `${API_URL}${endpoint}`
  if (params && typeof params === 'object') {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val)
      }
    })
    const queryString = searchParams.toString()
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString
    }
  }
  return url
}

const requestWithFetch = async (endpoint, method = 'GET', body = null, options = {}) => {
  const url = buildUrl(endpoint, options.params)
  const token = localStorage.getItem('access_token') || localStorage.getItem('token')

  const headers = {
    ...options.headers,
  }

  // Inyección automática del token de autorización
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`
  }

  let formattedBody = body

  // Si el cuerpo es un objeto plano, serializamos a JSON
  if (body && !(body instanceof URLSearchParams) && !(body instanceof FormData) && typeof body === 'object') {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }
    formattedBody = JSON.stringify(body)
  }

  try {
    const response = await fetch(url, {
      ...options,
      method,
      headers,
      body: method === 'GET' ? undefined : formattedBody,
    })

    // Manejo de expiración de sesión (401 Unauthorized)
    const isLoginEndpoint = endpoint.includes('/token')
    const isOnLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login'

    if (response.status === 401 && !isLoginEndpoint) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('token')

      if (!isRedirecting && !isOnLoginPage) {
        isRedirecting = true
        window.location.href = '/login'
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage =
        (typeof errorData.detail === 'string' ? errorData.detail : null) ||
        `Error HTTP ${response.status}: ${response.statusText}`
      throw new ApiError(errorMessage, response.status, errorData)
    }

    const data = await response.json().catch(() => ({}))

    return {
      data,
      status: response.status,
      ok: response.ok,
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    // Errores de red o de conexión
    throw new ApiError(error.message || 'Error de conexión', 0, { detail: error.message })
  }
}

// Wrapper cliente con métodos semánticos (get, post, patch, delete)
const client = {
  get: (endpoint, options = {}) => requestWithFetch(endpoint, 'GET', null, options),
  post: (endpoint, body = null, options = {}) => requestWithFetch(endpoint, 'POST', body, options),
  patch: (endpoint, body = null, options = {}) => requestWithFetch(endpoint, 'PATCH', body, options),
  delete: (endpoint, options = {}) => requestWithFetch(endpoint, 'DELETE', null, options),
}

export default client
