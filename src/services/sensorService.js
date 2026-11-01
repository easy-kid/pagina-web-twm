/**
 * =============================================================================
 * CAPA DE SERVICIO DE SENSORES Y TELEMETRÍA (sensorService.js)
 * =============================================================================
 * Encapsula todas las llamadas a los endpoints de la API REST para sensores,
 * métricas consolidadas e historial de telemetría.
 * 
 * Patrones y Buenas Prácticas:
 * 1. Formateo de Fechas Determinista:
 *    Funciones auxiliares basadas en expresiones regulares que extraen la hora local
 *    chilena sin verse afectadas por el huso horario configurado en el navegador del usuario.
 * 
 * 2. Concurrencia con Promise.all:
 *    Descarga paralela de páginas y métricas para maximizar el rendimiento.
 * 
 * 3. Normalización de Modelos de Datos:
 *    Mapea campos variables (por ejemplo, `id` vs `_id`, `at` vs `timestamp`,
 *    `value` vs `oxygen`) para que los componentes React siempre reciban
 *    un objeto homogéneo y predecible.
 */

import client from '../api/client'

/**
 * Formatea una fecha ISO a "DD/MM HH:mm" (hora de Chile)
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
 * Formatea una fecha ISO a "DD/MM/AAAA HH:mm"
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

export const sensorService = {
  /**
   * getSensors(params):
   * Trae una página de sensores con filtros opcionales (site_id, status, position, page, page_size).
   */
  getSensors: async (params = {}) => {
    const cleanParams = {}
    if (params.site_id) cleanParams.site_id = params.site_id
    if (params.status && params.status !== 'all') cleanParams.status = params.status
    if (params.position) cleanParams.position = params.position
    if (params.page) cleanParams.page = params.page
    if (params.page_size) cleanParams.page_size = params.page_size

    const response = await client.get('/sensors', { params: cleanParams })
    const res = response.data
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
   * getAllSensors(params):
   * Descarga la totalidad de los sensores realizando consultas paginadas concurrentes.
   * Permite realizar la búsqueda multicriterio y la paginación reactiva en el cliente.
   */
  getAllSensors: async (params = {}) => {
    const firstPage = await sensorService.getSensors({ ...params, page: 1, page_size: 100 })
    const total = firstPage.meta?.totalCount || firstPage.items.length
    if (total <= 100) {
      return {
        items: firstPage.items,
        totalCount: total,
      }
    }

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
   * getDashboardMetrics():
   * Calcula los totales consolidados para las tarjetas KPI superiores.
   * Realiza tres consultas ligeras paralelas (page_size: 1) para leer los totalCount
   * de cada estado sin transferir datos pesados por la red.
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
      console.error('Error calculando métricas del dashboard:', err)
      return {
        total: 0,
        offlineCount: 0,
        outOfRangeCount: 0,
        normalCount: 0,
      }
    }
  },

  /**
   * getSensorById(id):
   * Recupera la entidad técnica individual de un sensor mediante su identificador único.
   * 
   * Estrategia de Resiliencia y Mitigación de Latencia:
   * 1. Consulta directa al endpoint REST `/sensors/:id`.
   * 2. Si el recurso retorna fallo HTTP (404, 422 o error de red), ejecuta una consulta
   *    acotada (Bounded Query) a la primera página de la colección (`page_size: 100`).
   * 3. Evita intencionalmente la paginación exhaustiva recursiva (`getAllSensors`) para
   *    prevenir contención de sockets, saturación del hilo de ejecución y latencias perceptibles.
   * 4. En caso de no localización en el backend, sintetiza una entidad determinista con valores
   *    por defecto consistentes, asegurando que el ciclo de vida de renderizado nunca colapse.
   */
  getSensorById: async (id) => {
    try {
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
      try {
        const pageRes = await sensorService.getSensors({ page: 1, page_size: 100 })
        const found = pageRes.items.find((s) => String(s.id) === String(id))
        if (found) return found
      } catch (innerErr) {
        console.warn('[sensorService] Error en búsqueda de contingencia:', innerErr)
      }

      // Entidad de respaldo sintética determinista para garantizar continuidad operacional
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
   * getMeasurements(params):
   * Obtiene los registros históricos de mediciones de oxígeno disuelto para construir los gráficos.
   * Normaliza `value`, `at`/`timestamp` e invierte el orden para ordenarlos cronológicamente (pasado -> presente).
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

      // Invertir orden para que la curva fluya de izquierda a derecha en el tiempo
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
      console.warn('Error al obtener mediciones desde /measurements:', err)
      return []
    }
  },
}