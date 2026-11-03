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
import SensorsPage from './pages/SensorsPage'
import MeasurementsPage from './pages/MeasurementsPage'
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
            <Route path="/sensors" element={<SensorsPage />} />

            {/* Consulta de mediciones */}
            <Route path="/measurements" element={<MeasurementsPage />} />

            {/* Centros de cultivo y sensores asociados */}
            <Route path="/sites" element={<SitesList />} />
            <Route path="/sites/:siteId" element={<SiteDetail />} />

            {/* Intervenciones */}
            <Route path="/interventions" element={<InterventionsPage />} />

            {/* Página para rutas que no existen */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
