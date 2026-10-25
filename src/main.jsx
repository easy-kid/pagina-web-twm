/**
 * =============================================================================
 * PUNTO DE ENTRADA Y BOOTSTRAP DE LA APLICACIÓN (main.jsx)
 * =============================================================================
 * Inicializa el árbol de componentes de React e inyecta la instancia raíz
 * en el contenedor del Document Object Model (DOM) del navegador.
 *
 * Principios y Conceptos de Arquitectura:
 * 1. Concurrent Mode y `createRoot`:
 *    Utiliza la API moderna de React 18+ (`react-dom/client`) que habilita
 *    capacidades concurrentes, transiciones no bloqueantes y renderizado por lotes
 *    automático (Automatic Batching).
 *
 * 2. Invariantes de Calidad con `StrictMode`:
 *    Envuelve el árbol con `<StrictMode />` para ejecutar verificaciones en tiempo
 *    de desarrollo: detección de efectos secundarios accidentales, advertencias
 *    sobre APIs deprecadas y doble invocación intencional de ciclos de vida
 *    para asegurar idempotencia funcional.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/**
 * Montaje Atómico de la Raíz del Árbol de Renderizado:
 * Localiza el nodo host `#root` en el documento HTML y monta el componente `App`.
 */
const container = document.getElementById('root')

if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} else {
  console.error('[main.jsx] Error crítico: Contenedor raíz #root no encontrado en el DOM.')
}
