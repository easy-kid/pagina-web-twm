/**
 * CLIENTE HTTP Y CAPA DE TRANSPORTE DE DATOS (client.js)
 * CLIENTE HTTP Y CAPA DE TRANSPORTE DE DATOS (client.js)
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://ulamonitors-uat-back.grye.org'

/**
 * Bandera de sincronización en memoria para prevenir tormentas de redirección
 * o bucles infinitos hacia `/login` ante múltiples respuestas 401 concurrentes.
 */
let isRedirecting = false

/**
 * isNotFoundError:
 * Función de utilidad compartida para evaluar si un error corresponde a un código HTTP 404.
 * Mantenida por compatibilidad hacia atrás con los módulos de Centros de Cultivo e Intervenciones.
 *
 * @param {any} error - Objeto de excepción capturado.
 * @returns {boolean} True si el estado de respuesta es 404.
 */
export const isNotFoundError = (error) => error?.response?.status === 404

/**
 * ApiError:
 * Clase de excepción personalizada que encapsula los metadatos de un fallo HTTP.
 * Permite a los bloques `try/catch` de la capa de servicio acceder de manera
 * uniforme a `err.response.status` y `err.response.data`.
 *
 * @extends Error
 */
export class ApiError extends Error {
  /**
   * @param {string} message - Descripción legible del error.
   * @param {number} status - Código de estado HTTP (p. ej. 401, 404, 500) o 0 en fallo de red.
   * @param {Object} data - Carga útil de error emitida por el servidor FastAPI (detail, validation errors).
   */
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
 * buildUrl:
 * Función pura que construye la URL canónica absoluta combinando la dirección base,
 * el segmento de ruta (endpoint) y los parámetros de consulta (query string).
 *
 * @param {string} endpoint - Ruta relativa del recurso (p. ej. '/sensors').
 * @param {Object} [params] - Mapa asociativo clave-valor de parámetros de búsqueda.
 * @returns {string} URL formateada con su cadena de consulta normalizada.
 */
const buildUrl = (endpoint, params) => {
  let url = `${API_URL}${endpoint}`
  if (params && typeof params === 'object') {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, val]) => {
      // Filtrar valores nulos, indefinidos o cadenas vacías para mantener la URL limpia
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
 * requestWithFetch:
 * Motor central de ejecución de peticiones asíncronas sobre la Fetch API.
 * Gestiona encabezados, serialización de payload, interceptación de códigos
 * de estado 401 y captura de excepciones de capa de transporte.
 *
 * @param {string} endpoint - Segmento relativo del endpoint REST.
 * @param {string} [method='GET'] - Verbo HTTP (GET, POST, PATCH, DELETE).
 * @param {any} [body=null] - Carga útil enviada en el cuerpo de la petición.
 * @param {Object} [options={}] - Parámetros adicionales (headers, params, signals de abort).
 * @returns {Promise<{ data: any, status: number, ok: boolean }>} Objeto de respuesta normalizado.
 * @throws {ApiError} Cuando el servidor responde con un código no exitoso o falla la conexión física.
 */
const requestWithFetch = async (endpoint, method = 'GET', body = null, options = {}) => {
  const url = buildUrl(endpoint, options.params)
  const token = localStorage.getItem('access_token') || localStorage.getItem('token')

  const headers = {
    ...options.headers,
  }

  // 1. Inyección automática del Bearer Token si el usuario posee sesión activa
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`
  }

  let formattedBody = body

  // 2. Serialización condicional de la carga útil (JSON vs URLSearchParams / FormData)
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

    // 3. Interceptor de seguridad ante token revocado o expirado (HTTP 401 Unauthorized)
    const isLoginEndpoint = endpoint.includes('/token')
    const isOnLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login'

    if (response.status === 401 && !isLoginEndpoint) {
      // Purgar credenciales comprometidas o caducadas del almacenamiento del cliente
      localStorage.removeItem('access_token')
      localStorage.removeItem('token')
      localStorage.removeItem('username')

      if (!isRedirecting && !isOnLoginPage) {
        isRedirecting = true
        window.location.href = '/login'
      }
    }

    // 4. Verificación de códigos de éxito HTTP (rango 200 - 299)
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
    // Errores de transporte físico, desconexión de red o bloqueo por CORS
    throw new ApiError(error.message || 'Error de conexión', 0, { detail: error.message })
  }
}

/**
 * client:
 * Módulo de interfaz pública que provee métodos semánticos correspondientes
 * a los verbos HTTP estándar, delegando la ejecución en `requestWithFetch`.
 */
const client = {
  /**
   * Ejecuta una petición HTTP GET para recuperación de recursos.
   * @param {string} endpoint - Ruta relativa del recurso.
   * @param {Object} [options] - Parámetros de consulta y opciones de cabecera.
   */
  get: (endpoint, options = {}) => requestWithFetch(endpoint, 'GET', null, options),

  /**
   * Ejecuta una petición HTTP POST para creación o envío de credenciales.
   * @param {string} endpoint - Ruta relativa del recurso.
   * @param {any} [body] - Datos a transferir en el payload.
   * @param {Object} [options] - Opciones adicionales de configuración.
   */
  post: (endpoint, body = null, options = {}) => requestWithFetch(endpoint, 'POST', body, options),

  /**
   * Ejecuta una petición HTTP PATCH para actualización parcial de entidades.
   * @param {string} endpoint - Ruta relativa del recurso.
   * @param {any} [body] - Campos a modificar en el recurso.
   * @param {Object} [options] - Opciones adicionales.
   */
  patch: (endpoint, body = null, options = {}) => requestWithFetch(endpoint, 'PATCH', body, options),

  /**
   * Ejecuta una petición HTTP DELETE para remoción de recursos.
   * @param {string} endpoint - Ruta relativa del recurso a eliminar.
   * @param {Object} [options] - Opciones adicionales.
   */
  delete: (endpoint, options = {}) => requestWithFetch(endpoint, 'DELETE', null, options),
}

export default client
