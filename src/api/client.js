/**
 * =============================================================================
 * CLIENTE HTTP DE LA APLICACIÓN (client.js)
 * =============================================================================
 * Wrapper sobre la API estándar `fetch()` del navegador que centraliza:
 * 
 * 1. Base URL dinámica: Se obtiene de `import.meta.env.VITE_API_URL` con fallback.
 * 2. Inyección de Autenticación: Inserta automáticamente el header `Authorization: Bearer <token>`
 *    obtenido desde `localStorage` en cada petición.
 * 3. Serialización Automática: Convierte cuerpos de objetos JSON a texto plano y fija `Content-Type`.
 * 4. Interceptor 401 Unauthorized: Si el servidor rechaza una solicitud por expiración del token,
 *    elimina las credenciales caducadas de `localStorage` y redirige al usuario hacia `/login`.
 * 5. Normalización de Errores: Envuelve fallos HTTP en la clase `ApiError` para acceso estándar a `status` y `data`.
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://ulamonitors-uat-back.grye.org'

// Bandera para evitar bucles o múltiples redirecciones simultáneas al login
let isRedirecting = false

/**
 * Clase de Error estándar para peticiones de API.
 * Permite acceder a `err.response.status` y `err.response.data`.
 */
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

/**
 * Construye la URL final concatenando la base, el endpoint y los parámetros de búsqueda (query params).
 */
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

/**
 * Función central de ejecución HTTP
 */
const requestWithFetch = async (endpoint, method = 'GET', body = null, options = {}) => {
  const url = buildUrl(endpoint, options.params)
  const token = localStorage.getItem('access_token') || localStorage.getItem('token')

  const headers = {
    ...options.headers,
  }

  // 1. Inyección automática del Bearer Token si el usuario ha iniciado sesión
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`
  }

  let formattedBody = body

  // 2. Serialización a JSON si el body no es FormData ni URLSearchParams
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

    // 3. Manejo de expiración de sesión (401 Unauthorized)
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

    // 4. Verificación de respuesta exitosa (status 200-299)
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
    // Errores de red o de conexión física
    throw new ApiError(error.message || 'Error de conexión', 0, { detail: error.message })
  }
}

/**
 * Objeto exportado con métodos semánticos correspondientes a los verbos HTTP
 */
const client = {
  get: (endpoint, options = {}) => requestWithFetch(endpoint, 'GET', null, options),
  post: (endpoint, body = null, options = {}) => requestWithFetch(endpoint, 'POST', body, options),
  patch: (endpoint, body = null, options = {}) => requestWithFetch(endpoint, 'PATCH', body, options),
  delete: (endpoint, options = {}) => requestWithFetch(endpoint, 'DELETE', null, options),
}

export default client
