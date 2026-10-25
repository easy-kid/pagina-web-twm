/**
 * =============================================================================
 * ADAPTADOR DE COMPATIBILIDAD DE SERVICIOS (api.js)
 * =============================================================================
 * Actúa como punto de acceso unificado y fachada (Facade Pattern) para los módulos
 * alojados dentro del directorio `services/`, reexportando la instancia configurada
 * del cliente HTTP central (`../api/client.js`).
 */

import client from '../api/client'

export default client
