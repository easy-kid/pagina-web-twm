import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  AlertTriangle,
  WifiOff,
  CheckCircle2,
  Building,
  RefreshCw,
} from '../components/Common/Icons'
import { sensorService } from '../services/sensorService'

export default function SensorDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [sensor, setSensor] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadSensorData = useCallback(async () => {
    try {
      const sensorData = await sensorService.getSensorById(id)
      setSensor(sensorData)
    } catch (error) {
      console.error('Error al cargar detalle del sensor:', error)
    } finally {
      setRefreshing(false)
    }
  }, [id])

  useEffect(() => {
    loadSensorData()
  }, [loadSensorData])

  const handleRefresh = () => {
    setRefreshing(true)
    loadSensorData()
  }

  const isOutOfRange = sensor?.status === 'out_of_range'
  const isNoData = sensor?.status === 'no_data'

  return (
    <div className="space-y-6">
      {/* Botón de retorno y acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl shadow-xs transition cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar Datos</span>
          </button>
        </div>
      </div>

      {/* Tarjeta de Información General del Sensor */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Sensor #{sensor?.id}</span>
              {sensor?.site_id && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md">
                  <Building className="w-3 h-3 text-slate-400" />
                  Centro de Cultivo #{sensor.site_id}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{sensor?.name}</h1>
          </div>

          {/* Badge de Estado Operacional */}
          <div className="flex items-center gap-2">
            {isOutOfRange ? (
              <div className="px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Estado: Fuera de Rango</span>
              </div>
            ) : isNoData ? (
              <div className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-rose-500" />
                <span>Estado: Sin Transmitir (Inactivo)</span>
              </div>
            ) : (
              <div className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Estado: Operativo (Normal)</span>
              </div>
            )}
          </div>
        </div>

        {/* Ficha técnica del sensor */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <span className="text-slate-400 dark:text-slate-500 uppercase font-semibold text-[10px] tracking-wider block">Ubicación / Posición</span>
            <span className="text-slate-800 dark:text-white font-semibold capitalize text-sm mt-0.5 block">{sensor?.position || 'Jaula'}</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <span className="text-slate-400 dark:text-slate-500 uppercase font-semibold text-[10px] tracking-wider block">Profundidad</span>
            <span className="text-slate-800 dark:text-white font-semibold text-sm mt-0.5 block">{sensor?.depth != null ? `${sensor.depth} metros` : 'No def.'}</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <span className="text-slate-400 dark:text-slate-500 uppercase font-semibold text-[10px] tracking-wider block">Oxígeno Mínimo</span>
            <span className="text-slate-800 dark:text-white font-semibold text-sm mt-0.5 block">{sensor?.oxygen_min != null ? `${sensor.oxygen_min} mg/L` : 'N/A'}</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <span className="text-slate-400 dark:text-slate-500 uppercase font-semibold text-[10px] tracking-wider block">Oxígeno Máximo</span>
            <span className="text-slate-800 dark:text-white font-semibold text-sm mt-0.5 block">{sensor?.oxygen_max != null ? `${sensor.oxygen_max} mg/L` : 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}