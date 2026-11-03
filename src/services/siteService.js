/**
 * SERVICIO DE CENTROS DE CULTIVO (siteService.js)
 * Capa de integración para la consulta y resolución de centros de cultivo.
 */

import client from '../api/client'

const getItems = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.data)) return data.data
  return []
}

export const siteService = {
  /**
   * Obtiene la colección completa de centros de cultivo registrados.
   * @returns {Promise<Array<Object>>} Listado de centros.
   */
  getSites: async () => {
    try {
      const response = await client.get('/sites')
      return getItems(response.data)
    } catch (err) {
      console.warn('[siteService] No fue posible obtener la lista de centros:', err)
      return []
    }
  },

  /**
   * Obtiene la entidad técnica de un centro de cultivo específico.
   * @param {string|number} id - Identificador del centro.
   * @returns {Promise<Object>} Datos del centro.
   */
  getSiteById: async (id) => {
    const response = await client.get(`/sites/${encodeURIComponent(id)}`)
    return response.data
  },
}
