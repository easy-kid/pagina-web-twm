const STORAGE_KEY = 'site-interventions-v1'

export const interventionService = {
  getInterventions: () => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const interventions = JSON.parse(stored)
    if (!Array.isArray(interventions)) {
      throw new Error('El registro local de intervenciones tiene un formato inválido.')
    }

    return interventions
  },

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
