/**
 * =============================================================================
 * GUARDIÁN DE RUTAS PRIVADAS Y CONTROL DE ACCESO (ProtectedRoute.jsx)
 * =============================================================================
 * Componente de orden superior (Higher-Order Component / Route Guard) que intercepta
 * los intentos de navegación hacia vistas restringidas en la jerarquía de rutas.
 * 
 * Principios y Conceptos de Arquitectura en React Router:
 * 1. Control de Navegación Basado en Predicados (`isAuthenticated`):
 *    Consume el estado de identidad desde `useAuth()`. Si el usuario carece de token
 *    o su sesión ha caducado, interrumpe el ciclo de renderizado de la ruta solicitada.
 * 
 * 2. Modificación Atómica del Historial (`<Navigate replace />`):
 *    La bandera `replace` sobrescribe la entrada actual en la pila del historial del
 *    navegador (HTML5 History API), impidiendo que el operador pueda volver a la ruta
 *    protegida mediante el botón "Atrás" del navegador una vez que la sesión fue revocada.
 * 
 * 3. Delegación de Renderizado (`children` vs `<Outlet />`):
 *    Ofrece flexibilidad arquitectónica al admitir tanto componentes hijos explícitos
 *    como la inyección de rutas anidadas mediante el marcador de posición `<Outlet />`.
 */

import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * ProtectedRoute:
 * Función componente que evalúa la presencia de credenciales válidas antes de permitir
 * el acceso al subárbol de componentes o rutas secundarias.
 *
 * @param {Object} props - Propiedades del componente guardián.
 * @param {React.ReactNode} [props.children] - Contenido hijo opcional para envoltorio directo.
 * @returns {JSX.Element} Vista protegida si está autenticado, o redirección hacia `/login`.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()

  // Bloqueo estricto: Si la sesión no es válida, redirige al formulario de acceso
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Si está autenticado, renderiza los hijos directos o delega en el enrutador hijo
  return children ? children : <Outlet />
}
