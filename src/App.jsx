/**
 * App.jsx: Orquestador principal de enrutamiento y contextos globales.
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
            {/* Ruta pública de control de acceso */}
            <Route path="/login" element={<LoginPage />} />

            {/* Rutas privadas y protegidas */}
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

            {/* Redirección por defecto */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
