import client from '../api/client'
import { sensorService } from './sensorService'

const getItems = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.data)) return data.data
  return []
}

export const siteService = {
  getSites: async () => {
    const response = await client.get('/sites')
    return getItems(response.data)
  },

  getSiteById: async (id) => {
    const response = await client.get(`/sites/${encodeURIComponent(id)}`)
    return response.data
  },

  getSensorsBySite: async (siteId) => {
    const pageSize = 10
    const sensors = []
    let page = 1
    let totalCount = Infinity

    while (sensors.length < totalCount) {
      const { items, meta } = await sensorService.getSensors({
        site_id: siteId,
        page,
        page_size: pageSize,
      })

      sensors.push(...items)
      totalCount = Number(meta.totalCount)

      if (items.length < pageSize || !items.length) break
      page += 1
    }

    return sensors
  },
}
