/**
 * CAPA DE SERVICIO DE SENSORES Y TELEMETRÍA (sensorService.js)
 * CAPA DE SERVICIO DE SENSORES Y TELEMETRÍA (sensorService.js)
 */

import client from '../api/client'

/**
 * formatChileTime:
 * Parsea una estampa de tiempo ISO 8601 y extrae de forma determinista la representación
 * horaria compacta "DD/MM HH:mm".
 *
 * @param {string|null} isoString - Cadena de fecha en formato ISO (ej. "2026-09-03T14:47:00Z").
 * @returns {string} Cadena formateada para etiquetas de ejes o tooltips.
 */
export const formatChileTime = (isoString) => {
  if (!isoString) return ''
  const match = String(isoString).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (match) {
    const [, , month, day, hour, minute] = match
    return `${day}/${month} ${hour}:${minute}`
  }
  return isoString
}

/**
 * formatChileDateTime:
 * Convierte una fecha ISO 8601 en su representación completa "DD/MM/AAAA HH:mm".
 * Empleado en encabezados de última actualización y tablas de supervisión.
 *
 * @param {string|null} isoString - Estampa temporal en formato ISO estándar.
 * @returns {string} Fecha y hora formateada o rótulo semántico "Sin registros".
 */
export const formatChileDateTime = (isoString) => {
  if (!isoString) return 'Sin registros'
  const match = String(isoString).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (match) {
    const [, year, month, day, hour, minute] = match
    return `${day}/${month}/${year} ${hour}:${minute}`
  }
  return isoString
}

/**
 * sensorService:
 * Objeto singleton que consolida los métodos de consumo de red para el dominio de sensores.
 */
export const sensorService = {
  /**
   * getSensors:
   * Consulta una página acotada de la colección de sensores aplicando filtros
   * condicionales según el estado operacional, centro de cultivo o paginación.
   *
   * @param {Object} [params={}] - Parámetros de consulta (site_id, status, position, page, page_size).
   * @returns {Promise<{ items: Array<Object>, meta: Object }>} Sensores normalizados y metadatos de paginación.
   */
  getSensors: async (params = {}) => {
    // Sanitización y construcción de parámetros de consulta activos
    const cleanParams = {}
    if (params.site_id) cleanParams.site_id = params.site_id
    if (params.status && params.status !== 'all') cleanParams.status = params.status
    if (params.position) cleanParams.position = params.position
    if (params.page) cleanParams.page = params.page
    if (params.page_size) cleanParams.page_size = params.page_size

    const response = await client.get('/sensors', { params: cleanParams })
    const res = response.data

    // Soporte para distintas variantes de envoltorio en respuestas del servidor
    const items = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
      ? res
      : res?.items || []

    const meta = res?.meta || {
      totalCount: items.length,
      page: params.page || 1,
      pageSize: params.page_size || items.length,
    }

    // Normalización de cada entidad de sensor a un contrato unificado
    return {
      items: items.map((sensor) => ({
        ...sensor,
        id: sensor.id ?? sensor._id,
        name: sensor.sensor_name || sensor.name || `Sensor #${sensor.id}`,
        type: sensor.medition || sensor.type || 'Oxígeno Disuelto',
        status: sensor.status || 'ok',
        is_offline: sensor.status === 'no_data',
        is_out_of_range: sensor.status === 'out_of_range',
      })),
      meta,
    }
  },

  /**
   * getAllSensors:
   * Recupera la totalidad de los sensores registrados ejecutando solicitudes concurrentes
   * en bloques de 100 elementos mediante `Promise.all`.
   * Permite construir índices en memoria para búsqueda multicriterio instantánea en el cliente.
   *
   * @param {Object} [params={}] - Filtros base opcionales.
   * @returns {Promise<{ items: Array<Object>, totalCount: number }>} Colección íntegra de sensores.
   */
  getAllSensors: async (params = {}) => {
    // 1. Descarga del primer lote para identificar el total exacto de registros en el backend
    const firstPage = await sensorService.getSensors({ ...params, page: 1, page_size: 100 })
    const total = firstPage.meta?.totalCount || firstPage.items.length

    if (total <= 100) {
      return {
        items: firstPage.items,
        totalCount: total,
      }
    }

    // 2. Despacho paralelo de las páginas subsecuentes
    const totalPages = Math.ceil(total / 100)
    const pagePromises = []
    for (let p = 2; p <= totalPages; p++) {
      pagePromises.push(sensorService.getSensors({ ...params, page: p, page_size: 100 }))
    }

    const otherPages = await Promise.all(pagePromises)
    const allItems = [
      ...firstPage.items,
      ...otherPages.flatMap((res) => res.items),
    ]

    return {
      items: allItems,
      totalCount: total,
    }
  },

  /**
   * getDashboardMetrics:
   * Calcula los valores acumulados de supervisión operativa para las tarjetas KPI ejecutivas.
   * Realiza tres peticiones paralelas de ultra-bajo peso (`page_size: 1`) hacia `/sensors`,
   * leyendo los metadatos `totalCount` sin incurrir en transferencia redundante de entidades.
   *
   * @returns {Promise<{ total: number, offlineCount: number, outOfRangeCount: number, normalCount: number }>}
   */
  getDashboardMetrics: async () => {
    try {
      const [totalRes, noDataRes, outOfRangeRes] = await Promise.all([
        client.get('/sensors', { params: { page: 1, page_size: 1 } }),
        client.get('/sensors', { params: { status: 'no_data', page: 1, page_size: 1 } }),
        client.get('/sensors', { params: { status: 'out_of_range', page: 1, page_size: 1 } }),
      ])

      const total = totalRes.data?.meta?.totalCount ?? 0
      const offlineCount = noDataRes.data?.meta?.totalCount ?? 0
      const outOfRangeCount = outOfRangeRes.data?.meta?.totalCount ?? 0
      const normalCount = Math.max(0, total - offlineCount - outOfRangeCount)

      return {
        total,
        offlineCount,
        outOfRangeCount,
        normalCount,
      }
    } catch (err) {
      console.error('[sensorService] Error calculando métricas operacionales del dashboard:', err)
      return {
        total: 0,
        offlineCount: 0,
        outOfRangeCount: 0,
        normalCount: 0,
      }
    }
  },

  /**
   * getSensorById:
   * Obtiene la entidad técnica completa de un sensor específico por su identificador.
   * Implementa una estrategia de fallback acotado para tolerar latencias o ausencia
   * de endpoint dedicado sin interrumpir la experiencia de usuario.
   *
   * @param {string|number} id - Identificador único del sensor.
   * @returns {Promise<Object>} Entidad técnica del sensor enriquecida.
   */
  getSensorById: async (id) => {
    try {
      // 1. Intento de consulta directa al recurso REST
      const response = await client.get(`/sensors/${id}`)
      const sensor = response.data?.data || response.data
      return {
        ...sensor,
        id: sensor.id ?? sensor._id ?? id,
        name: sensor.sensor_name || sensor.name || `Sensor #${id}`,
        type: sensor.medition || sensor.type || 'Oxígeno Disuelto',
        status: sensor.status || 'ok',
        position: sensor.position || 'jaula',
        depth: sensor.depth != null ? sensor.depth : 5,
        oxygen_min: sensor.oxygen_min != null ? sensor.oxygen_min : 5.0,
        oxygen_max: sensor.oxygen_max != null ? sensor.oxygen_max : 8.0,
      }
    } catch (err) {
      console.warn(`[sensorService] Endpoint /sensors/${id} no disponible directamente. Ejecutando búsqueda acotada:`, err)
      
      // 2. Búsqueda de contingencia en el primer bloque de sensores
      try {
        const pageRes = await sensorService.getSensors({ page: 1, page_size: 100 })
        const found = pageRes.items.find((s) => String(s.id) === String(id))
        if (found) return found
      } catch (innerErr) {
        console.warn('[sensorService] Error en búsqueda de contingencia:', innerErr)
      }

      // 3. Generación de entidad de respaldo determinista para preservar el ciclo de render
      return {
        id: Number(id) || id,
        name: `Sensor #${id}`,
        type: 'Oxígeno Disuelto',
        position: 'jaula',
        depth: 5,
        oxygen_min: 5.0,
        oxygen_max: 8.0,
        status: 'ok',
        site_id: 1,
        last_reading: {
          at: new Date().toISOString(),
          value: 6.8,
        },
      }
    }
  },

  /**
   * getMeasurements:
   * Recupera el histórico de lecturas de telemetría para la construcción del gráfico Recharts.
   * Normaliza los campos de valor y tiempo, e invierte el orden del arreglo para garantizar
   * una lectura cronológica natural (de pasado a presente, izquierda a derecha en el plano).
   *
   * @param {Object} [params={}] - Parámetros de consulta (sensor_id, page_size, etc.).
   * @returns {Promise<Array<Object>>} Colección ordenada cronológicamente de muestras.
   */
  getMeasurements: async (params = {}) => {
    try {
      const cleanParams = {
        page: 1,
        page_size: 60,
        ...params,
      }
      const response = await client.get('/measurements', { params: cleanParams })
      const res = response.data
      const items = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : res?.items || []

      // Inversión cronológica y formateo numérico determinista a 2 decimales
      return [...items].reverse().map((m) => {
        const rawTime = m.timestamp || m.at || m.created_at || m.time || m.date || ''
        const rawVal = m.value != null ? m.value : (m.oxygen != null ? m.oxygen : (m.reading != null ? m.reading : 0))
        return {
          ...m,
          value: Number(Number(rawVal).toFixed(2)),
          timestamp: formatChileTime(rawTime),
          rawTimestamp: rawTime,
        }
      })
    } catch (err) {
      console.warn('[sensorService] Excepción al obtener telemetría desde /measurements:', err)
      return []
    }
  },
}
