import client from '../api/client'

const getItems = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.data)) return data.data
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

const normalizeIntervention = (intervention) => ({
  ...intervention,
  id: intervention.id ?? intervention.intervention_id ?? intervention._id,
  siteId: String(intervention.site_id ?? intervention.siteId ?? ''),
  sensorId: intervention.sensor_id ?? intervention.sensorId ?? null,
  senderName: intervention.opened_by ?? intervention.senderName ?? '',
  reason: intervention.reason ?? '',
  createdAt:
    intervention.opened_at ??
    intervention.created_at ??
    intervention.createdAt ??
    null,
  status: intervention.status ?? (intervention.outcome ? 'closed' : 'open'),
})

export const interventionService = {
  getInterventions: async (params = {}) => {
    const pageSize = 100
    const query = {}
    if (params.site_id != null && params.site_id !== '') query.site_id = params.site_id
    if (params.sensor_id != null && params.sensor_id !== '') query.sensor_id = params.sensor_id
    if (params.status && params.status !== 'all') query.status = params.status

    const interventions = []
    let page = 1
    let totalCount = Infinity

    while (interventions.length < totalCount) {
      const { data } = await client.get('/interventions', {
        params: { ...query, page, page_size: pageSize },
      })
      const items = getItems(data)
      interventions.push(...items.map(normalizeIntervention))
      totalCount = getTotalCount(data, Infinity)

      if (items.length < pageSize || !items.length) break
      page += 1
    }

    return interventions
  },

  createIntervention: async ({ siteId, sensorId, reason }) => {
    const site_id = Number(siteId)
    if (!Number.isInteger(site_id)) {
      throw new TypeError('El identificador del centro debe ser un número entero.')
    }
    if (typeof reason !== 'string' || !reason.trim()) {
      throw new TypeError('La descripción de la intervención es obligatoria.')
    }

    const payload = {
      site_id,
      sensor_id: sensorId == null || sensorId === '' ? null : Number(sensorId),
      reason: reason.trim(),
    }
    if (payload.sensor_id != null && !Number.isInteger(payload.sensor_id)) {
      throw new TypeError('El identificador del sensor debe ser un número entero.')
    }

    const { data } = await client.post('/interventions', payload)
    return data
  },
}
