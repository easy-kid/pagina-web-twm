import client from '../api/client'
import { sensorService } from './sensorService'

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

export const getSiteId = (site) => site?.id ?? site?._id

export const getSiteArea = (site) => site?.area ?? site?.zone

const isCoordinate = (value) =>
  value != null && !(typeof value === 'string' && value.trim() === '') && Number.isFinite(Number(value))

export const getSiteLocation = (site) => {
  const location = site?.location
  if (typeof location === 'string' && location.trim()) return location

  const latitude = site?.latitude ?? site?.lat ?? location?.latitude ?? location?.lat
  const longitude =
    site?.longitude ?? site?.lng ?? site?.lon ?? location?.longitude ?? location?.lng ?? location?.lon

  if (
    isCoordinate(latitude) &&
    isCoordinate(longitude)
  ) {
    return `Latitud: ${latitude} · Longitud: ${longitude}`
  }

  const coordinates =
    site?.coordinates ??
    (Array.isArray(site?.geometry) ? site.geometry : site?.geometry?.coordinates) ??
    (Array.isArray(location) ? location : location?.coordinates)
  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    const [coordinateLongitude, coordinateLatitude] = coordinates
    if (isCoordinate(coordinateLatitude) && isCoordinate(coordinateLongitude)) {
      return `Latitud: ${coordinateLatitude} · Longitud: ${coordinateLongitude}`
    }
  }

  return getSiteArea(site) || 'No especificada'
}

export const siteService = {
  getSitesPage: async (params = {}) => {
    const query = {
      page: params.page ?? 1,
      page_size: params.page_size ?? 20,
    }
    if (params.q?.trim()) query.q = params.q.trim()
    if (params.area?.trim()) query.area = params.area.trim()

    const { data } = await client.get('/sites', { params: query })
    const items = getItems(data)
    const responseMeta = data?.meta || {}
    const reportedTotalCount =
      data?.meta?.totalCount ??
      data?.meta?.total_count ??
      data?.meta?.total ??
      data?.totalCount ??
      data?.total_count ??
      data?.total
    const totalCount = getTotalCount(data, items.length)

    return {
      items,
      meta: {
        ...responseMeta,
        totalCount,
        hasTotalCount: reportedTotalCount != null && Number.isFinite(Number(reportedTotalCount)),
        page: responseMeta.page ?? query.page,
        pageSize: responseMeta.pageSize ?? responseMeta.page_size ?? query.page_size,
      },
    }
  },

  getSites: async () => {
    const pageSize = 100
    const sites = []
    let page = 1
    let totalCount = Infinity

    while (sites.length < totalCount) {
      const { items, meta } = await siteService.getSitesPage({ page, page_size: pageSize })
      sites.push(...items)
      totalCount = meta.totalCount

      if (items.length < pageSize || !items.length || (meta.hasTotalCount && sites.length >= totalCount)) break
      page += 1
    }

    return sites
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
      totalCount = Number.isFinite(Number(meta.totalCount)) ? Number(meta.totalCount) : Infinity

      if (items.length < pageSize || !items.length) break
      page += 1
    }

    return sensors
  },
}
