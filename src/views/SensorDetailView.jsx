import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sensorService } from '../services/sensorService';
import { ArrowLeft, LineChart as ChartIcon, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function SensorDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sensor, setSensor] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSensorData();
  }, [id]);

  const loadSensorData = async () => {
    setLoading(true);
    try {
      const sensorData = await sensorService.getSensorById(id);
      const measData = await sensorService.getMeasurements({ sensor_id: id });
      setSensor(sensorData);
      setMeasurements(Array.isArray(measData) ? measData : measData.items || []);
    } catch (error) {
      console.error('Error al cargar detalle del sensor:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">Cargando gráfico...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8 shadow-xl">
          <span className="text-xs font-semibold px-3 py-1 bg-blue-900/50 text-blue-300 rounded-md border border-blue-700">
            Sensor ID: {id}
          </span>
          <h1 className="text-3xl font-bold text-white mt-3">{sensor?.name || `Sensor de Oxígeno`}</h1>
          <p className="text-slate-400 text-sm mt-1">Estado actual: <span className="text-white font-medium">{sensor?.status || 'Activo'}</span></p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <ChartIcon className="text-blue-500 w-5 h-5" /> Histórico de Mediciones
          </h2>

          {measurements.length === 0 ? (
            <div className="text-center py-16 text-slate-400 flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8 text-slate-500" />
              No hay registros de mediciones históricas para este sensor.
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={measurements}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="timestamp" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#fff', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}