/**
 * =============================================================================
 * GUARDIÁN DE RUTAS PROTEGIDAS (ProtectedRoute)
 * =============================================================================
 * Componente de orden superior que intercepta la navegación hacia rutas privadas.
 * 
 * Lógica:
 * - Consulta el estado de autenticación `isAuthenticated` en AuthContext.
 * - Si el usuario NO está autenticado:
 *   Redirige de inmediato a '/login' usando `<Navigate replace />`.
 *   El modificador `replace` evita que la ruta bloqueada quede en el historial atrás.
 * - Si el usuario SÍ está autenticado:
 *   Renderiza los componentes hijos provistos o el `<Outlet />` de React Router.
 */

import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()

  // Bloqueo de acceso no autorizado
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Renderizado del contenido protegido (hijos explícitos o rutas anidadas mediante Outlet)
  return children ? children : <Outlet />
}
