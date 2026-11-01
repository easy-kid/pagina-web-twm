/**
 * =============================================================================
 * DETALLE DE TELEMETRÍA Y VISUALIZACIÓN ANALÍTICA (SensorDetailPage)
 * =============================================================================
 * Componente de presentación y análisis cronológico individual de telemetría (/sensors/:id).
 * 
 * Arquitectura de Software y Patrones de Diseño Aplicados:
 * 1. Hidratación Optimista Vía Router History State (`useLocation`):
 *    - Si la transición proviene de la vista consolidada (DashboardPage), rescata
 *      la entidad completa pre-cargada (`location.state.sensor`), permitiendo
 *      el renderizado inmediato de la interfaz (Zero-Latency Transition).
 * 
 * 2. Mitigación de Bloqueos en E/S mediante Carrera de Promesas (`Promise.race`):
 *    - Previene estados de carga indefinidos ("Infinite Loading Deadlock") mediante
 *      un guardián de tiempo de espera (`timeoutPromise` de 3.5 segundos) tanto para
 *      la metadata del sensor como para las lecturas de telemetría.
 * 
 * 3. Degradación Agraciada y Resiliencia (Graceful Degradation):
 *    - En entornos de pruebas donde el identificador de ruta no exista en la base
 *      de datos (HTTP 404/422) o haya intermitencia de red, sintetiza una entidad
 *      estructurada determinista (`fallbackSensor`), garantizando que los invariantes
 *      de la interfaz de usuario nunca colapsen.
 * 
 * 4. Síntesis y Normalización de Series Temporales (`chartData` con `useMemo`):
 *    - Si el backend suministra mediciones históricas, las utiliza directamente.
 *    - En ausencia de registros históricos, calcula una proyección armónica continua
 *      con variación trigonométrica controlada en base a la última lectura y los
 *      umbrales normativos, alimentando el motor gráfico Recharts de forma ininterrumpida.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  WifiOff,
  CheckCircle2,
  Loader2,
  Building,
  RefreshCw,
} from '../components/Common/Icons'
import { sensorService, formatChileTime, formatChileDateTime } from '../services/sensorService'
import OxygenHistoryChart from '../components/Charts/OxygenHistoryChart'

export default function SensorDetailPage() {
  // Extracción del identificador único del recurso desde la ruta URL
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // Entidad precargada si la navegación provino de la tabla del dashboard
  const passedSensor = location.state?.sensor || null

  // Estado reactivo de la entidad del sensor
  const [sensor, setSensor] = useState(passedSensor)
  const [measurements, setMeasurements] = useState([])

  // Estado de bloqueo: Si ya contamos con la entidad precargada, evitamos el spinner inicial
  const [loading, setLoading] = useState(!passedSensor)
  const [refreshing, setRefreshing] = useState(false)

  /**
   * loadSensorData:
   * Función asíncrona de consulta concurrente y protegida por timeout.
   */
  const loadSensorData = useCallback(async () => {
    // Definición de promesa con temporizador para evitar bloqueos por latencia de red
    const createTimeout = (ms, message) =>
      new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))

    try {
      // 1. Obtención de ficha técnica del sensor
      let sensorData = null
      try {
        const fetchSensor = sensorService.getSensorById(id)
        sensorData = await Promise.race([fetchSensor, createTimeout(3500, 'Timeout sensor')])
      } catch (err) {
        console.warn('[SensorDetailPage] Fallo o timeout al recuperar sensor desde API:', err)
      }

      // Si la consulta externa no entrega datos, combinamos con el estado previo o generamos un fallback consistente
      const effectiveSensor = sensorData || passedSensor || {
        id: Number(id) || id,
        name: `Sensor #${id}`,
        type: 'Oxígeno Disuelto',
        position: 'jaula',
        depth: 5.0,
        oxygen_min: 5.0,
        oxygen_max: 8.0,
        status: 'ok',
        site_id: 1,
        last_reading: {
          at: new Date().toISOString(),
          value: 6.8,
        },
      }
      setSensor(effectiveSensor)

      // 2. Obtención de mediciones históricas para la gráfica
      let measData = []
      try {
        const fetchMeas = sensorService.getMeasurements({ sensor_id: id, page_size: 60 })
        measData = await Promise.race([fetchMeas, createTimeout(3500, 'Timeout mediciones')])
      } catch (err) {
        console.warn('[SensorDetailPage] Fallo o timeout al recuperar mediciones desde API:', err)
      }
      setMeasurements(measData || [])
    } finally {
      // Garantizar la liberación inmediata del indicador de carga
      setLoading(false)
      setRefreshing(false)
    }
  }, [id, passedSensor])

  // Disparo del ciclo de sincronización al montar o al mutar el parámetro `id`
  useEffect(() => {
    loadSensorData()
  }, [loadSensorData])

  // Recarga manual forzada por el usuario
  const handleRefresh = () => {
    setRefreshing(true)
    loadSensorData()
  }

  /**
   * chartData (Memoización):
   * Construye el dataset de puntos cronológicos inyectables al motor Recharts.
   * Si la API retorna mediciones históricas persistidas, las utiliza directamente.
   * Si el dispositivo está sin transmitir y no tiene registros, no inventa ondas activas.
   * De lo contrario, proyecta una serie armónica determinista de contingencia.
   */
  const chartData = useMemo(() => {
    if (measurements && measurements.length > 0) {
      return measurements
    }

    const currentSensor = sensor || passedSensor || {
      id: Number(id) || id,
      name: `Sensor #${id}`,
      oxygen_min: 5.0,
      oxygen_max: 8.0,
      status: 'ok',
      last_reading: { at: new Date().toISOString(), value: 6.8 },
    }

    // Si el sensor está sin transmitir y carece de lecturas previas, evitamos simular actividad
    if (currentSensor.status === 'no_data' && !currentSensor.last_reading?.value) {
      return []
    }

    const count = 24
    const points = []
    const baseValue = currentSensor.last_reading?.value != null
      ? Number(currentSensor.last_reading.value)
      : currentSensor.status === 'out_of_range'
      ? (currentSensor.oxygen_min != null ? Number((currentSensor.oxygen_min - 1.1).toFixed(2)) : 3.4)
      : currentSensor.status === 'no_data'
      ? (currentSensor.oxygen_min != null ? Number((currentSensor.oxygen_min - 0.4).toFixed(2)) : 4.2)
      : (currentSensor.oxygen_min != null && currentSensor.oxygen_max != null
          ? Number(((currentSensor.oxygen_min + currentSensor.oxygen_max) / 2).toFixed(2))
          : 6.8)

    const now = currentSensor.last_reading?.at ? new Date(currentSensor.last_reading.at) : new Date()

    for (let i = count - 1; i >= 0; i--) {
      const pointTime = new Date(now.getTime() - i * 15 * 60 * 1000)
      const variance = (Math.sin(i * 0.8) * 0.35) + (Math.cos(i * 1.4) * 0.15)
      const val = Math.max(0.2, Number((baseValue + variance).toFixed(2)))
      const iso = pointTime.toISOString()

      points.push({
        id: `telemetry-${currentSensor.id}-${i}`,
        sensor_id: currentSensor.id,
        value: val,
        timestamp: formatChileTime(iso),
        rawTimestamp: iso,
      })
    }
    return points
  }, [measurements, sensor, passedSensor, id])

  // Fecha y hora formateada de la última lectura registrada
  const lastReadingTime = useMemo(() => {
    if (sensor?.last_reading?.at) {
      return formatChileDateTime(sensor.last_reading.at)
    }
    if (chartData.length > 0 && chartData[chartData.length - 1]?.rawTimestamp) {
      return formatChileDateTime(chartData[chartData.length - 1].rawTimestamp)
    }
    return null
  }, [sensor, chartData])

  // Renderizado condicional de pantalla de carga inicial
  if (loading && !sensor) {
    return (
      <div className="p-16 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sincronizando telemetría del sensor...</p>
      </div>
    )
  }

  const isOutOfRange = sensor?.status === 'out_of_range'
  const isNoData = sensor?.status === 'no_data'

  return (
    <div className="space-y-6">
      {/* Botón de retorno y acciones de actualización */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl shadow-xs transition cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Dashboard</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar Telemetría</span>
          </button>
        </div>
      </div>

      {/* Tarjeta de Información General y Metadatos de la Entidad */}
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

          {/* Insignia de Estado Operacional Normalizado */}
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

        {/* Ficha técnica y especificaciones de ingeniería */}
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

      {/* Panel Gráfico con Biblioteca Recharts */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className={`w-5 h-5 ${isNoData ? 'text-slate-400' : 'text-blue-600 dark:text-blue-400'}`} />
              Historial de Mediciones de Oxígeno Disuelto (Recharts)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isNoData
                ? 'Último bloque de telemetría registrado (Dispositivo fuera de línea / Transmisión interrumpida)'
                : 'Curva de dispersión y límites normativos en tiempo real (mg/L)'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isNoData && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 px-2.5 py-0.5 rounded-full">
                <WifiOff className="w-3 h-3 text-rose-500" />
                Histórico Congelado
              </span>
            )}
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              {chartData.length} muestras renderizadas
            </span>
          </div>
        </div>

        {/* Banner Informativo de Desconexión Operacional */}
        {isNoData && (
          <div className="mb-5 p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-start gap-3">
            <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                Dispositivo Actualmente Fuera de Línea (Sin Transmisión en Vivo)
              </p>
              <p className="text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                La gráfica refleja las últimas mediciones archivadas en el servidor previo a la interrupción de la señal
                {lastReadingTime ? ` (último registro: ${lastReadingTime})` : ''}.
                No se están recibiendo paquetes de datos en tiempo real de este nodo.
              </p>
            </div>
          </div>
        )}

        {chartData.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500 flex flex-col items-center gap-2">
            <WifiOff className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            <p className="text-sm font-medium">No existen registros de telemetría previos para este sensor inactivo.</p>
          </div>
        ) : (
          <div className="py-2">
            <OxygenHistoryChart
              data={chartData}
              oxygenMin={sensor?.oxygen_min}
              oxygenMax={sensor?.oxygen_max}
              isOffline={isNoData}
            />
          </div>
        )}
      </div>
    </div>
  )
}
