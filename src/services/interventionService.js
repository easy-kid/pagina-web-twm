/**
 * src/services/interventionService.js
 *
 * NOTA DE ARQUITECTURA / BACKEND:
 * La API oficial en https://ulamonitors-uat-back.grye.org/docs expone los siguientes
 * endpoints REST bajo OAuth2 Bearer:
 *
 * 1. GET /interventions
 *    - Query params: site_id (int), sensor_id (int), status ('open' | 'closed'), page (int), page_size (int)
 *    - Requiere scope: "read"
 *    - Retorna listado de intervenciones (más recientes primero; ?status=open para pendientes)
 *
 * 2. POST /interventions
 *    - Body: { site_id: int, sensor_id?: int | null, reason: string, outcome?: string, outcome_notes?: string }
 *    - Requiere scope: "read"
 *    - El autor ('opened_by') es extraído automáticamente del token JWT por el backend.
 *    - Si incluye 'outcome' nace cerrada automáticamente (requiere scope "field").
 *
 * 3. PATCH /interventions/{intervention_id}
 *    - Body: { outcome: "back_online" | "replaced" | "reconfigured" | "no_fault_found", outcome_notes?: string }
 *    - Requiere scope: "field"
 *    - Cierra la intervención registrando la resolución.
 *
 * 4. NOTA SOBRE DELETE:
 *    - La API NO expone endpoint DELETE para intervenciones (son registros inmutables de auditoría).
 */

// TODO (Backend Integration): Importar el cliente nativo para sustituir localStorage:
// import client from '../api/client'

const STORAGE_KEY = 'site-interventions-v1'

export const interventionService = {
  /**
   * TODO (Backend Integration): Reemplazar por llamada asíncrona a la API:
   *
   * getInterventions: async (params = {}) => {
   *   const query = {}
   *   if (params.site_id) query.site_id = Number(params.site_id)
   *   if (params.sensor_id) query.sensor_id = Number(params.sensor_id)
   *   if (params.status && params.status !== 'all') query.status = params.status
   *   if (params.page) query.page = params.page
   *   if (params.page_size) query.page_size = params.page_size
   *
   *   const response = await client.get('/interventions', { params: query })
   *   return Array.isArray(response.data) ? response.data : (response.data?.items || response.data?.data || [])
   * }
   */
  getInterventions: () => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const interventions = JSON.parse(stored)
    if (!Array.isArray(interventions)) {
      throw new Error('El registro local de intervenciones tiene un formato inválido.')
    }

    return interventions
  },

  /**
   * TODO (Backend Integration): Reemplazar por llamada POST:
   *
   * createIntervention: async ({ siteId, sensorId, reason, outcome, outcomeNotes }) => {
   *   const payload = {
   *     site_id: Number(siteId),
   *     sensor_id: sensorId ? Number(sensorId) : null,
   *     reason: reason.trim(),
   *   }
   *   if (outcome) payload.outcome = outcome
   *   if (outcomeNotes) payload.outcome_notes = outcomeNotes.trim()
   *
   *   const response = await client.post('/interventions', payload)
   *   return response.data
   * }
   */
  createIntervention: (intervention) => {
    const interventions = interventionService.getInterventions()
    const newIntervention = {
      ...intervention,
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      createdAt: new Date().toISOString(),
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify([newIntervention, ...interventions]))
    return newIntervention
  },

  /**
   * TODO (Backend Integration): La API no tiene PUT libre de edición general.
   * En su lugar, el backend utiliza PATCH /interventions/{id} para cerrar/resolver la intervención:
   *
   * closeIntervention: async (interventionId, { outcome, outcomeNotes }) => {
   *   const payload = {
   *     outcome, // Enum: 'back_online' | 'replaced' | 'reconfigured' | 'no_fault_found'
   *     outcome_notes: outcomeNotes ? outcomeNotes.trim() : null,
   *   }
   *   const response = await client.patch(`/interventions/${interventionId}`, payload)
   *   return response.data
   * }
   */
  updateIntervention: (id, updates) => {
    const interventions = interventionService.getInterventions()
    const index = interventions.findIndex((intervention) => intervention.id === id)
    if (index === -1) throw new Error('No se encontró la intervención que intentas editar.')

    const updatedIntervention = {
      ...interventions[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    interventions[index] = updatedIntervention
    localStorage.setItem(STORAGE_KEY, JSON.stringify(interventions))
    return updatedIntervention
  },

  /**
   * TODO (Backend Integration): En la API real NO existe DELETE /interventions.
   * Las intervenciones no se eliminan; el ciclo de vida oficial termina cerrándolas vía PATCH con un 'outcome'.
   */
  deleteIntervention: (id) => {
    const interventions = interventionService.getInterventions()
    const remainingInterventions = interventions.filter((intervention) => intervention.id !== id)
    if (remainingInterventions.length === interventions.length) {
      throw new Error('No se encontró la intervención que intentas eliminar.')
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingInterventions))
    return remainingInterventions
  },
}
