import client from '../api/client'

// Función auxiliar para formatear la hora de Chile sin desfases de zona horaria del navegador
export const formatChileTime = (isoString) => {
  if (!isoString) return ''
  const match = String(isoString).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (match) {
    const [, , month, day, hour, minute] = match
    return `${day}/${month} ${hour}:${minute}`
  }
  return isoString
}

// Función auxiliar para formatear fecha y hora completa (DD/MM/AAAA HH:mm)
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
  // Trae los sensores con filtros opcionales (site_id, status: 'ok' | 'out_of_range' | 'no_data', page, page_size)
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

  // Trae la totalidad de sensores según filtros para búsqueda y paginación global en cliente
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

  // Obtiene los conteos del dashboard combinando rutas como pide el enunciado
  getDashboardMetrics: async () => {
    try {
      // 1. Total sensores
      // 2. Sensores sin transmitir (status=no_data)
      // 3. Sensores fuera de rango (status=out_of_range)
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

  // Trae la información de un sensor específico por su ID
  getSensorById: async (id) => {
    try {
      const response = await client.get(`/sensors/${id}`)
      const sensor = response.data
      return {
        ...sensor,
        id: sensor.id ?? sensor._id,
        name: sensor.sensor_name || sensor.name || `Sensor #${sensor.id}`,
        type: sensor.medition || sensor.type || 'Oxígeno Disuelto',
        status: sensor.status || 'ok',
      }
    } catch (err) {
      console.warn(`No se pudo obtener /sensors/${id} directamente, buscando en colección general:`, err)
      const all = await sensorService.getAllSensors()
      const found = all.items.find((s) => String(s.id) === String(id))
      if (found) return found
      throw err
    }
  },

  // Trae el historial de mediciones para armar el gráfico
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

      // El backend las entrega más recientes primero; las invertimos para el gráfico cronológico
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