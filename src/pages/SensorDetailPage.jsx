import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  AlertTriangle,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  Building,
  RefreshCw,
  Activity,
  Calendar as CalendarIcon,
} from '../components/Common/Icons'
import { sensorService, formatChileDateTime } from '../services/sensorService'
import { siteService } from '../services/siteService'
import NotFoundPage from '../components/NotFoundPage'
import { isNotFoundError } from '../api/client'
import OxygenHistoryChart from '../components/Charts/OxygenHistoryChart'

const TIME_RANGES = [
  { id: '24h', label: '24 Horas', days: 1 },
  { id: '7d', label: '7 Días', days: 7 },
  { id: '30d', label: '30 Días (Mes)', days: 30 },
]

function downsampleData(items, maxPoints = 400) {
  if (!items || items.length <= maxPoints) return items
  const step = items.length / maxPoints
  const sampled = []
  for (let i = 0; i < maxPoints; i++) {
    const index = Math.min(Math.floor(i * step), items.length - 1)
    sampled.push(items[index])
  }
  if (sampled[sampled.length - 1] !== items[items.length - 1]) {
    sampled[sampled.length - 1] = items[items.length - 1]
  }
  return sampled
}

export default function SensorDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [sensor, setSensor] = useState(null)
  const [site, setSite] = useState(null)
  const [siteNameError, setSiteNameError] = useState(false)
  const [measurements, setMeasurements] = useState([])
  const [measurementError, setMeasurementError] = useState('')
  const [timeRange, setTimeRange] = useState('24h')
  const [loadingMeasurements, setLoadingMeasurements] = useState(false)
  const [refreshing, setRefreshing] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notFound, setNotFound] = useState(false)

  const fetchMeasurements = useCallback(async (currentSensor, rangeId) => {
    if (!id) return
    setLoadingMeasurements(true)
    setMeasurementError('')
    try {
      const daysMap = { '24h': 1, '7d': 7, '30d': 30 }
      const days = daysMap[rangeId] || 1

      // Si el sensor está sin datos o inactivo, anclamos a su última lectura registrada
      const anchorDate = (currentSensor?.status === 'no_data' || !currentSensor?.transmitting) && currentSensor?.last_reading?.at
        ? new Date(currentSensor.last_reading.at)
        : new Date()

      const fromDate = new Date(anchorDate.getTime() - days * 24 * 60 * 60 * 1000)
      const fromStr = fromDate.toISOString().slice(0, 19)
      const toStr = anchorDate.toISOString().slice(0, 19)

      let history = await sensorService.getMeasurements({
        sensor_id: id,
        from: fromStr,
        to: toStr,
        page_size: 1000,
      })

      // Fallback de seguridad: si al abrir en 24h no vienen datos en la ventana (ej. por desfase de simulación),
      // cargamos las últimas mediciones disponibles para que el gráfico siempre muestre telemetría real
      if (history.length === 0 && rangeId === '24h') {
        const fallbackHistory = await sensorService.getMeasurements({
          sensor_id: id,
          page_size: 60,
        })
        if (fallbackHistory.length > 0) {
          history = fallbackHistory
        }
      }

      setMeasurements(downsampleData(history, 400))
    } catch (error) {
      console.error('Error al cargar las mediciones del sensor:', error)
      setMeasurementError('No fue posible cargar el historial de mediciones para el rango seleccionado.')
    } finally {
      setLoadingMeasurements(false)
    }
  }, [id])

  const loadSensorData = useCallback(async () => {
    setRefreshing(true)
    setLoadError('')
    try {
      const sensorData = await sensorService.getSensorById(id)
      setSensor(sensorData)
      setMeasurements([])
      setMeasurementError('')

      // Cargar mediciones según el rango activo
      fetchMeasurements(sensorData, timeRange)

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
  }, [id, timeRange, fetchMeasurements])

  const handleRangeChange = (rangeId) => {
    setTimeRange(rangeId)
    fetchMeasurements(sensor, rangeId)
  }

  useEffect(() => {
    loadSensorData()
  }, [loadSensorData])

  const isOutOfRange = sensor?.status === 'out_of_range'
  const isNoData = sensor?.status === 'no_data'

  const lastReadingTime = useMemo(() => {
    const at = sensor?.last_reading?.at || measurements[measurements.length - 1]?.rawTimestamp
    if (at) {
      return formatChileDateTime(at)
    }
    return null
  }, [sensor, measurements])

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

      {/* Tarjeta de Información General del Sensor */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            {sensor?.site_id && (
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md">
                  <Building className="w-3 h-3 text-slate-400" />
                  {site?.name ? (
                    site.name
                  ) : siteNameError ? (
                    `Centro ${sensor.site_id} (nombre no disponible)`
                  ) : (
                    <span className="inline-block h-3.5 w-24 bg-slate-200 dark:bg-slate-700/80 rounded animate-pulse align-middle" />
                  )}
                </span>
              </div>
            )}
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{sensor?.name}</h1>
          </div>

          {/* Badge o Alerta de Estado Operacional */}
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            {isOutOfRange ? (
              <div className="px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Estado: Fuera de Rango</span>
              </div>
            ) : isNoData ? (
              <>
                <div className="px-3.5 py-2 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200 shadow-xs">
                  <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    <strong className="font-semibold">Dispositivo Desconectado:</strong>{' '}
                    <span className="text-amber-800/90 dark:text-amber-300/90">
                      Telemetría archivada (sin transmisión en vivo)
                    </span>
                  </span>
                </div>
                {lastReadingTime && (
                  <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5 shadow-xs">
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Último registro:</span>
                    <span className="font-semibold text-slate-900 dark:text-white font-mono">{lastReadingTime}</span>
                  </div>
                )}
              </>
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
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className={`w-5 h-5 ${isNoData ? 'text-slate-400' : 'text-blue-600 dark:text-blue-400'}`} />
              Historial de mediciones
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Evolución temporal de oxígeno disuelto y rangos operacionales (mg/L).
            </p>
          </div>

          {/* Selector de Rango Temporal */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700/80 shadow-xs shrink-0 self-start">
            {TIME_RANGES.map((range) => (
              <button
                key={range.id}
                type="button"
                onClick={() => handleRangeChange(range.id)}
                disabled={loadingMeasurements}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition duration-150 cursor-pointer disabled:opacity-50 text-center whitespace-nowrap ${
                  timeRange === range.id
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {loadingMeasurements ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-400 dark:text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="text-xs font-medium">Cargando telemetría del período...</p>
          </div>
        ) : measurementError ? (
          <p className="mt-5 text-sm text-rose-700 dark:text-rose-300" role="alert">
            {measurementError}
          </p>
        ) : measurements.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500 flex flex-col items-center gap-2">
            <WifiOff className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            <p className="text-sm font-medium">
              {isNoData
                ? 'No existen registros de telemetría archivados para este período.'
                : 'No hay mediciones disponibles para este sensor en el rango seleccionado.'}
            </p>
          </div>
        ) : (
          <div className="py-2">
            <OxygenHistoryChart
              data={measurements}
              oxygenMin={sensor?.oxygen_min}
              oxygenMax={sensor?.oxygen_max}
              isOffline={isNoData}
            />
          </div>
        )}
      </section>
    </div>
  )
}
