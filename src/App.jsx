/**
 * =============================================================================
 * ORQUESTADOR PRINCIPAL DE ENRUTAMIENTO Y CONTEXTOS GLOBALES (App.jsx)
 * =============================================================================
 * Componente raíz que define la jerarquía de proveedores de estado global
 * (Providers) y el árbol de navegación declarativo mediante React Router v7 / v6.
 *
 * Arquitectura de Capas y Proveedores:
 * 1. `ThemeProvider`:
 *    Capa superior encargada de sincronizar la preferencia de interfaz
 *    (Modo Claro / Modo Oscuro) con el DOM raíz y la persistencia en `localStorage`.
 *
 * 2. `BrowserRouter`:
 *    Proveedor de enrutamiento basado en la API HTML5 History (`pushState`, `replaceState`),
 *    facilitando navegación de tipo SPA (Single Page Application) sin recarga completa de página.
 *
 * 3. `AuthProvider`:
 *    Contexto global de identidad que expone el token JWT, métodos de autenticación
 *    (`login`, `logout`) y el estado reactivo `isAuthenticated` a todo el subárbol.
 *
 * 4. Frontera de Seguridad (`ProtectedRoute`):
 *    Componente de orden superior que intercepta las peticiones de navegación privada,
 *    impidiendo el acceso a `/` o `/sensors/:id` a usuarios no autenticados.
 *
 * 5. Shell Estructural (`MainLayout`):
 *    Plantilla persistente que contiene la barra lateral (`aside`), navegación reactiva,
 *    selector de tema y el `<Outlet />` donde se montan las páginas autenticadas.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './components/Layout/MainLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SensorDetailPage from './pages/SensorDetailPage'

/**
 * App:
 * Función componente principal que compone la arquitectura declarativa de la aplicación.
 *
 * @returns {JSX.Element} Árbol de contextos y enrutador configurado.
 */
export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* 
              =================================================================
              RUTA PÚBLICA DE CONTROL DE ACCESO
              =================================================================
              Captura credenciales de usuario y despacha petición OAuth2.
            */}
            <Route path="/login" element={<LoginPage />} />

            {/* 
              =================================================================
              RUTAS PRIVADAS Y PROTEGIDAS (Requieren Token de Sesión Válido)
              =================================================================
              Encapsuladas bajo el guardián ProtectedRoute y contenidas en MainLayout.
            */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {/* Dashboard de monitoreo operativo y supervisión de sensores */}
              <Route path="/" element={<DashboardPage />} />

              {/* Vista detallada con telemetría cronológica y gráfico Recharts */}
              <Route path="/sensors/:id" element={<SensorDetailPage />} />
            </Route>

            {/* 
              =================================================================
              REDIRECCIÓN Y FALLBACK DE RUTAS INDEFINIDAS (Wildcard Catch-All)
              =================================================================
              Cualquier segmento no reconocido es redirigido al dashboard raíz.
            */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
