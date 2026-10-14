import { useState, useEffect } from 'react';
import { sensorService } from '../services/sensorService';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, WifiOff, CheckCircle2, ArrowRight, Building, Radio } from 'lucide-react';

export default function DashboardView() {
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const data = await sensorService.getSensors();
      setSensors(Array.isArray(data) ? data : data.items || []);
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cálculos de sensores (Rol 3: agregación en cliente)
  const outOfRangeSensors = sensors.filter(s => s.is_out_of_range || s.status === 'out_of_range');
  const offlineSensors = sensors.filter(s => s.is_offline || s.status === 'offline' || s.without_transmission);
  const normalSensors = sensors.length - outOfRangeSensors.length - offlineSensors.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        Cargando panel de control...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Activity className="text-blue-500 w-8 h-8" /> Panel de Monitoreo - ULA Monitors
            </h1>
            <p className="text-slate-400 text-sm mt-1">Resumen del estado operacional de los sensores de oxígeno disuelto</p>
          </div>



          {/* crear directorio sites con contenido para que el boton funcione*/}
          <button
            onClick={() => navigate('/sites')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium transition flex items-center gap-2 cursor-pointer"
          >
            <Building className="w-4 h-4 text-blue-400" /> Ir a Centros
          </button>
        </div>





        {/* Tarjetas de Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-400">Fuera de Rango</p>
                <h3 className="text-4xl font-extrabold text-amber-400 mt-2">{outOfRangeSensors.length}</h3>
              </div>
              <div className="p-3 bg-amber-950/50 border border-amber-800 rounded-lg text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">Sensores con niveles anómalos de oxígeno.</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-400">Sin Transmitir (Offline)</p>
                <h3 className="text-4xl font-extrabold text-red-400 mt-2">{offlineSensors.length}</h3>
              </div>
              <div className="p-3 bg-red-950/50 border border-red-800 rounded-lg text-red-400">
                <WifiOff className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">Sensores desconectados o inactivos.</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-400">Operativos (Normal)</p>
                <h3 className="text-4xl font-extrabold text-emerald-400 mt-2">{normalSensors < 0 ? 0 : normalSensors}</h3>
              </div>
              <div className="p-3 bg-emerald-950/50 border border-emerald-800 rounded-lg text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">Sensores trabajando correctamente.</p>
          </div>
        </div>

        {/* Tabla de Estado de Sensores */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Radio className="text-blue-500 w-5 h-5" /> Estado General de Sensores
          </h2>

          {sensors.length === 0 ? (
            <p className="text-slate-400 text-sm py-4">No se encontraron sensores registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="py-3 px-4">Sensor</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {sensors.slice(0, 10).map((sensor) => (
                    <tr key={sensor.id || sensor._id} className="border-b border-slate-700/50 hover:bg-slate-750">
                      <td className="py-3 px-4 font-medium text-white">{sensor.name || `Sensor #${sensor.id}`}</td>
                      <td className="py-3 px-4 text-slate-300">{sensor.type || 'Oxígeno Disuelto'}</td>
                      <td className="py-3 px-4">
                        {sensor.is_out_of_range ? (
                          <span className="text-xs bg-amber-950/50 text-amber-300 border border-amber-800 px-2.5 py-1 rounded-md">Fuera de Rango</span>
                        ) : sensor.is_offline ? (
                          <span className="text-xs bg-red-950/50 text-red-300 border border-red-800 px-2.5 py-1 rounded-md">Sin Transmitir</span>
                        ) : (
                          <span className="text-xs bg-emerald-950/50 text-emerald-300 border border-emerald-800 px-2.5 py-1 rounded-md">Normal</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => navigate(`/sensors/${sensor.id || sensor._id}`)}
                          className="text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 cursor-pointer"
                        >
                          Ver Gráfico <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}c
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}