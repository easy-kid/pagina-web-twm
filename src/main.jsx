/**
 * PUNTO DE ENTRADA Y BOOTSTRAP DE LA APLICACIÓN (main.jsx)
 * PUNTO DE ENTRADA Y BOOTSTRAP DE LA APLICACIÓN (main.jsx)
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
