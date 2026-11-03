/**
 * GUARDIÁN DE RUTAS PRIVADAS Y CONTROL DE ACCESO (ProtectedRoute.jsx)
 * GUARDIÁN DE RUTAS PRIVADAS Y CONTROL DE ACCESO (ProtectedRoute.jsx)
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
