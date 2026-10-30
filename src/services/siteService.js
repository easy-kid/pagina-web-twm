import client from '../api/client'
import { sensorService } from './sensorService'

const getItems = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.data)) return data.data
  return []
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
