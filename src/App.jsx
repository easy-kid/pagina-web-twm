import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './components/Layout/MainLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SensorDetailPage from './pages/SensorDetailPage'
import { SiteDetail } from './components/SiteDetail'
import { SitesList } from './components/SitesList'
import InterventionsPage from './pages/InterventionsPage'
import NotFoundPage from './components/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Ruta pública de Login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rutas protegidas dentro del Layout */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard de sensores y telemetría */}
            <Route path="/" element={<DashboardPage />} />

            {/* Gráfico histórico del sensor */}
            <Route path="/sensors/:id" element={<SensorDetailPage />} />

            {/* Centros de cultivo y sensores asociados */}
            <Route path="/sites" element={<SitesList />} />
            <Route path="/sites/:siteId" element={<SiteDetail />} />

            {/* Solicitudes locales de intervención */}
            <Route path="/interventions" element={<InterventionsPage />} />

            {/* Página para rutas que no existen */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
