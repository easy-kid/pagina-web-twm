import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  AlertTriangle,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  Building,
  RefreshCw,
} from '../components/Common/Icons'
import { sensorService } from '../services/sensorService'
import { siteService } from '../services/siteService'
import NotFoundPage from '../components/NotFoundPage'
import { isNotFoundError } from '../api/client'

export default function SensorDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [sensor, setSensor] = useState(null)
  const [site, setSite] = useState(null)
  const [siteNameError, setSiteNameError] = useState(false)
  const [measurements, setMeasurements] = useState([])
  const [measurementError, setMeasurementError] = useState('')
  const [refreshing, setRefreshing] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notFound, setNotFound] = useState(false)

  const loadSensorData = useCallback(async () => {
    setRefreshing(true)
    setLoadError('')
    try {
      const sensorData = await sensorService.getSensorById(id)
      setSensor(sensorData)
      setMeasurements([])
      setMeasurementError('')
      try {
        const history = await sensorService.getMeasurements({ sensor_id: id, page_size: 60 })
        setMeasurements(history)
      } catch (error) {
        console.error('Error al cargar las mediciones del sensor:', error)
        setMeasurementError('No fue posible cargar el historial de mediciones.')
      }
      setSite(null)
      setSiteNameError(false)
      if (sensorData.site_id != null) {
        try {
          const siteData = await siteService.getSiteById(sensorData.site_id)
          setSite(siteData)
        } catch (error) {
          console.error('Error al cargar el nombre del centro del sensor:', error)
          setSiteNameError(true)
        }
      }
    } catch (error) {
      console.error('Error al cargar detalle del sensor:', error)
      if (isNotFoundError(error)) setNotFound(true)
      else setLoadError('No fue posible cargar los datos del sensor. Intenta nuevamente.')
    } finally {
      setRefreshing(false)
    }
  }, [id])

  useEffect(() => {
    loadSensorData()
  }, [loadSensorData])

  const isOutOfRange = sensor?.status === 'out_of_range'
  const isNoData = sensor?.status === 'no_data'
  const chartMeasurements = measurements.filter((measurement) => Number.isFinite(measurement.value))
  const values = chartMeasurements.map((measurement) => measurement.value)
  const minimum = values.length
    ? Math.min(
        ...values,
        sensor?.oxygen_min != null && Number.isFinite(Number(sensor.oxygen_min))
          ? Number(sensor.oxygen_min)
          : values[0],
      )
    : 0
  const maximum = values.length
    ? Math.max(
        ...values,
        sensor?.oxygen_max != null && Number.isFinite(Number(sensor.oxygen_max))
          ? Number(sensor.oxygen_max)
          : values[0],
      )
    : 1
  const valueRange = maximum - minimum || 1
  const chartPoints = chartMeasurements.map((measurement, index) => {
    const x = chartMeasurements.length === 1 ? 360 : 32 + (656 * index) / (chartMeasurements.length - 1)
    const y = 204 - ((measurement.value - minimum) / valueRange) * 168
    return { ...measurement, x, y }
  })

  if (notFound) {
    return <NotFoundPage message="La API no encontró el sensor o el endpoint solicitado." />
  }

  if (!sensor && refreshing) {
    return <div className="py-16 text-center text-slate-500 dark:text-slate-400" role="status">Cargando datos del sensor...</div>
  }

  if (!sensor && loadError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300" role="alert">
        <p>{loadError}</p>
        <button type="button" onClick={loadSensorData} className="mt-3 font-semibold underline underline-offset-2">
          Reintentar
        </button>
      </div>
    )
  }

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
            onClick={loadSensorData}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar Datos</span>
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300" role="status">
          {loadError} Se muestran los últimos datos disponibles.
        </div>
      )}

      {/* Tarjeta de Información General del Sensor */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Sensor #{sensor?.id}</span>
              {sensor?.site_id && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md">
                  <Building className="w-3 h-3 text-slate-400" />
                  {site?.name || `Centro ${sensor.site_id}`}
                  <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">
                    (ID: {sensor.site_id}{siteNameError ? ' · nombre no disponible' : ''})
                  </span>
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
                <span>Estado: Desconectado</span>
              </div>
            ) : sensor.status === 'ok' ? (
              <div className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Estado: Operativo (Normal)</span>
              </div>
            ) : (
              <div className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-slate-500" />
                <span>Estado: Desconocido</span>
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

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Historial de mediciones</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Oxígeno disuelto registrado por el sensor (mg/L).
          </p>
        </div>
        {measurementError ? (
          <p className="mt-5 text-sm text-rose-700 dark:text-rose-300" role="alert">
            {measurementError}
          </p>
        ) : chartPoints.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
            No hay mediciones disponibles para este sensor.
          </p>
        ) : (
          <>
            <div className="mt-5 overflow-hidden">
              <svg
                viewBox="0 0 720 240"
                role="img"
                aria-label={`Gráfico de ${chartPoints.length} mediciones de oxígeno disuelto`}
                className="h-56 w-full"
                preserveAspectRatio="none"
              >
                {[36, 78, 120, 162, 204].map((y) => (
                  <line key={y} x1="32" x2="688" y1={y} y2={y} stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeDasharray="4 5" />
                ))}
                <polyline
                  points={chartPoints.map(({ x, y }) => `${x},${y}`).join(' ')}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {chartPoints.map((point, index) => (
                  <circle key={`${point.rawTimestamp}-${index}`} cx={point.x} cy={point.y} r="3.5" fill="#2563eb">
                    <title>{`${point.timestamp}: ${point.value} mg/L`}</title>
                  </circle>
                ))}
              </svg>
            </div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{chartPoints[0].timestamp}</span>
              <span>{chartPoints[chartPoints.length - 1].timestamp}</span>
            </div>
          </>
        )}
      </section>
    </div>
  )
}