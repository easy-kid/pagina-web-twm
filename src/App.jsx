import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardView from './views/DashboardView';
import SensorDetailView from './views/SensorDetailView';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirige automáticamente la raíz '/' hacia el dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Vista del Panel de Control Principal (Dashboard) */}
        <Route path="/dashboard" element={<DashboardView />} />
        
        {/* Vista del Detalle y Gráfico Histórico del Sensor */}
        <Route path="/sensors/:id" element={<SensorDetailView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;