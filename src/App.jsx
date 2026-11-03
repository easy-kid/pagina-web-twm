import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './components/Layout/MainLayout'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const SensorDetailPage = lazy(() => import('./pages/SensorDetailPage'))
const SiteDetail = lazy(() =>
  import('./components/SiteDetail').then((module) => ({ default: module.SiteDetail })),
)
const SitesList = lazy(() =>
  import('./components/SitesList').then((module) => ({ default: module.SitesList })),
)
const InterventionsPage = lazy(() => import('./pages/InterventionsPage'))
const SensorsPage = lazy(() => import('./pages/SensorsPage'))
const MeasurementsPage = lazy(() => import('./pages/MeasurementsPage'))
const NotFoundPage = lazy(() => import('./components/NotFoundPage'))

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center text-sm text-slate-500" role="status">
              Cargando...
            </div>
          }
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/sensors/:id" element={<SensorDetailPage />} />
              <Route path="/sensors" element={<SensorsPage />} />
              <Route path="/measurements" element={<MeasurementsPage />} />
              <Route path="/sites" element={<SitesList />} />
              <Route path="/sites/:siteId" element={<SiteDetail />} />
              <Route path="/interventions" element={<InterventionsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
