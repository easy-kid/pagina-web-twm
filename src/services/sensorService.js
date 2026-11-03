import client from '../api/client'

const getItems = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.items)) return data.items
  return []
}

const getTotalCount = (data, fallback) => {
  const totalCount = data?.meta?.totalCount ??
    data?.meta?.total_count ??
    data?.meta?.total ??
    data?.totalCount ??
    data?.total_count ??
    data?.total
  const parsedCount = Number(totalCount)
  return totalCount == null || !Number.isFinite(parsedCount) ? fallback : parsedCount
}

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
    if (params.site_id != null && params.site_id !== '') cleanParams.site_id = params.site_id
    if (params.status && params.status !== 'all') cleanParams.status = params.status
    if (params.position) cleanParams.position = params.position
    if (params.page != null) cleanParams.page = params.page
    if (params.page_size != null) cleanParams.page_size = params.page_size

    const response = await client.get('/sensors', { params: cleanParams })
    const res = response.data
    const items = getItems(res)

    const responseMeta = res?.meta || {}
    const hasTotalCount =
      res?.meta?.totalCount != null ||
      res?.meta?.total_count != null ||
      res?.meta?.total != null ||
      res?.totalCount != null ||
      res?.total_count != null ||
      res?.total != null
    const meta = {
      ...responseMeta,
      totalCount: getTotalCount(res, items.length),
      hasTotalCount,
      page: responseMeta.page ?? params.page ?? 1,
      pageSize: responseMeta.pageSize ?? responseMeta.page_size ?? params.page_size ?? items.length,
    }

    return {
      items: items.map((sensor) => ({
        ...sensor,
        id: sensor.id ?? sensor._id,
        name: sensor.sensor_name || sensor.name || `Sensor #${sensor.id ?? sensor._id}`,
        type: sensor.medition || sensor.type || 'Oxígeno Disuelto',
        status: sensor.status || 'unknown',
        is_offline: sensor.status === 'no_data',
        is_out_of_range: sensor.status === 'out_of_range',
      })),
      meta,
    }
  },

  // Trae la totalidad de sensores según filtros para búsqueda y paginación global en cliente
  getAllSensors: async (params = {}) => {
    const firstPage = await sensorService.getSensors({ ...params, page: 1, page_size: 100 })
    const total = getTotalCount(firstPage, firstPage.items.length)
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
    // 1. Total sensores
    // 2. Sensores sin transmitir (status=no_data)
    // 3. Sensores fuera de rango (status=out_of_range)
    const [totalRes, noDataRes, outOfRangeRes, onlineRes] = await Promise.all([
      client.get('/sensors', { params: { page: 1, page_size: 1 } }),
      client.get('/sensors', { params: { status: 'no_data', page: 1, page_size: 1 } }),
      client.get('/sensors', { params: { status: 'out_of_range', page: 1, page_size: 1 } }),
      client.get('/sensors', { params: { status: 'ok', page: 1, page_size: 1 } }),
    ])

    const total = getTotalCount(totalRes.data, 0)
    const offlineCount = getTotalCount(noDataRes.data, 0)
    const outOfRangeCount = getTotalCount(outOfRangeRes.data, 0)
    const normalCount = getTotalCount(onlineRes.data, 0)
    const unknownCount = Math.max(0, total - offlineCount - outOfRangeCount - normalCount)

    return {
      total,
      offlineCount,
      outOfRangeCount,
      normalCount,
      unknownCount,
    }
  },

  // Trae la información de un sensor específico por su ID
  getSensorById: async (id) => {
    const response = await client.get(`/sensors/${encodeURIComponent(id)}`)
    const sensor = response.data
    return {
      ...sensor,
      id: sensor.id ?? sensor._id,
      name: sensor.sensor_name || sensor.name || `Sensor #${sensor.id}`,
      type: sensor.medition || sensor.type || 'Oxígeno Disuelto',
      status: sensor.status || 'unknown',
    }
  },

  // Trae el historial de mediciones para armar el gráfico
  getMeasurements: async (params = {}) => {
    const cleanParams = {
      page: 1,
      page_size: 60,
      ...params,
    }
    const response = await client.get('/measurements', { params: cleanParams })
    const items = getItems(response.data)

    // El backend las entrega más recientes primero; las invertimos para el gráfico cronológico
    return [...items].reverse().map((m) => ({
      ...m,
      value: Number(m.oxygen ?? m.value),
      timestamp: formatChileTime(m.timestamp ?? m.measured_at),
      rawTimestamp: m.timestamp ?? m.measured_at,
    }))
  },

  getMeasurementsPage: async (params = {}) => {
    const cleanParams = {
      page: 1,
      page_size: 20,
      ...params,
    }
    const response = await client.get('/measurements', { params: cleanParams })
    const data = response.data
    const items = getItems(data)
    const responseMeta = data?.meta || {}
    const hasTotalCount =
      data?.meta?.totalCount != null ||
      data?.meta?.total_count != null ||
      data?.meta?.total != null ||
      data?.totalCount != null ||
      data?.total_count != null ||
      data?.total != null

    return {
      items: [...items].map((measurement) => ({
        ...measurement,
        id: measurement.id ?? measurement._id,
        value: Number(measurement.oxygen ?? measurement.value),
        timestamp: measurement.timestamp ?? measurement.measured_at ?? '',
      })),
      meta: {
        ...responseMeta,
        totalCount: getTotalCount(data, items.length),
        hasTotalCount,
        page: responseMeta.page ?? cleanParams.page,
        pageSize: responseMeta.pageSize ?? responseMeta.page_size ?? cleanParams.page_size,
      },
    }
  },

  getMeasurementOverview: async (params = {}) => {
    const cleanParams = {}
    for (const key of ['site_id', 'medition', 'bucket', 'days', 'depths']) {
      if (params[key] != null && params[key] !== '') cleanParams[key] = params[key]
    }

    const response = await client.get('/measurements/overview', { params: cleanParams })
    return response.data
  },
}