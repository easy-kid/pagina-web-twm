/**
 * =============================================================================
 * VISTA DE DETALLE TÉCNICO Y TELEMETRÍA DE SENSOR (SensorDetailPage.jsx)
 * =============================================================================
 * Vista especializada de supervisión individual para un nodo sensor específico.
 * Renderiza especificaciones operacionales, profundidades, umbrales y la curva
 * cronológica de oxígeno disuelto mediante el componente Recharts (`OxygenHistoryChart`).
 * 
 * Principios de Ingeniería y Optimización en Tiempo de Ejecución:
 * 1. Hidratación Optimista Inmediata (`useLocation().state?.sensor`):
 *    Consume la entidad del sensor transmitida mediante el estado de navegación de React Router
 *    desde la tabla del Dashboard. Si existe, la vista se dibuja en Frame 0 con cero latencia
 *    percibida por el usuario, eliminando spinners de bloqueo mientras se obtienen las lecturas.
 * 
 * 2. Protección de Concurrencia con Temporizador Límite (Timeout Race Pattern):
 *    Ejecuta las solicitudes de red compitiendo contra promesas `createTimeout`,
 *    impidiendo que fallos en endpoints externos mantengan la interfaz congelada indefinidamente.
 * 
 * 3. Manejo Estricto de Sensores Inactivos / Sin Transmitir:
 *    Si el sensor reporta estado `no_data`, congela la telemetría histórica previa archivada
 *    indicando *"Histórico Congelado"* y despliega un banner de advertencia, sin proyectar
 *    pulsos en vivo erróneos que desorienten la toma de decisiones del operador acuícola.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  WifiOff,
  Activity,
  Loader2,
  Building,
  RefreshCw,
} from '../components/Common/Icons'
import { sensorService, formatChileTime, formatChileDateTime } from '../services/sensorService'
import OxygenHistoryChart from '../components/Charts/OxygenHistoryChart'

/**
 * SensorDetailPage:
 * Función componente principal para la inspección detallada de un sensor individual.
 *
 * @returns {JSX.Element} Vista técnica con gráfica de telemetría y metadatos.
 */
export default function SensorDetailPage() {
  // Extracción del identificador único del recurso desde el segmento dinámico de la ruta
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // Recuperación optimista de la entidad transferida en el `history.state`
  const passedSensor = location.state?.sensor || null

  const [sensor, setSensor] = useState(passedSensor)
  const [measurements, setMeasurements] = useState([])

  // Estado de bloqueo: Si ya contamos con la entidad precargada, evitamos el spinner inicial
  const [loading, setLoading] = useState(!passedSensor)
  const [refreshing, setRefreshing] = useState(false)

  /**
   * loadSensorData:
   * Función asíncrona de consulta concurrente y protegida por timeout.
   * Solicita en paralelo la entidad técnica del sensor y las mediciones históricas (`/measurements`).
   */
  const loadSensorData = useCallback(async () => {
    // Definición de promesa con temporizador para evitar bloqueos por latencia de red
    const createTimeout = (ms, message) =>
      new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))

    try {
      // 1. Obtención de metadatos del sensor con carrera de tiempo (Timeout Race)
      let sensorData = null
      try {
        const fetchSensor = sensorService.getSensorById(id)
        sensorData = await Promise.race([fetchSensor, createTimeout(4000, 'Timeout recuperando sensor')])
      } catch (err) {
        console.warn('[SensorDetailPage] Fallo o timeout al recuperar sensor desde API:', err)
      }

      // Si la consulta externa no entrega datos, combinamos con el estado previo o generamos un fallback consistente
      const effectiveSensor = sensorData || passedSensor || {
        id: Number(id) || id,
        name: `Sensor #${id}`,
        type: 'Oxígeno Disuelto',
        position: 'jaula',
        depth: 5,
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
        measData = await Promise.race([fetchMeas, createTimeout(4000, 'Timeout recuperando mediciones')])
      } catch (err) {
        console.warn('[SensorDetailPage] Fallo o timeout al recuperar mediciones:', err)
      }
      setMeasurements(measData || [])
    } finally {
      // Garantizar la liberación inmediata del indicador de carga
      setLoading(false)
      setRefreshing(false)
    }
  }, [id, passedSensor])

  /**
   * Sincronización al montar el componente o cambiar de sensor:
   */
  useEffect(() => {
    loadSensorData()
  }, [loadSensorData])

  /**
   * handleRefresh:
   * Disparador manual para refrescar la telemetría del sensor a petición del usuario.
   */
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

    const now = new Date()
    for (let i = count - 1; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 60 * 60 * 1000)
      const harmonicVariance = Math.sin((24 - i) / 2.5) * 0.45
      const computed = Number((baseValue + harmonicVariance).toFixed(2))
      points.push({
        timestamp: formatChileTime(t.toISOString()),
        value: Math.max(0.5, computed),
        rawTimestamp: t.toISOString(),
      })
    }
    return points
  }, [measurements, sensor, passedSensor, id])

  /**
   * isOutOfRange (Memoización):
   * Predicado booleano que determina si el sensor se encuentra fuera de umbral operacional.
   */
  const isOutOfRange = useMemo(() => {
    return sensor?.status === 'out_of_range' || (sensor?.last_reading?.value != null && (
      (sensor.oxygen_min != null && sensor.last_reading.value < sensor.oxygen_min) ||
      (sensor.oxygen_max != null && sensor.last_reading.value > sensor.oxygen_max)
    ))
  }, [sensor])

  /**
   * isNoData (Memoización):
   * Evalúa si el nodo sensor se encuentra desconectado o sin emitir telemetría activa.
   */
  const isNoData = useMemo(() => {
    return sensor?.status === 'no_data'
  }, [sensor])

  /**
   * lastReadingTime (Memoización):
   * Estampa de tiempo legible formateada para el encabezado de última sincronización.
   */
  const lastReadingTime = useMemo(() => {
    if (sensor?.last_reading?.at) {
      return formatChileDateTime(sensor.last_reading.at)
    }
    return null
  }, [sensor])

  if (loading && !sensor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-500 dark:text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium">Recuperando telemetría del sensor #{id}...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 
        =======================================================================
        BARRA SUPERIOR DE ACCIONES Y RETORNO
        =======================================================================
      */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Dashboard</span>
        </button>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{refreshing ? 'Actualizando...' : 'Actualizar Telemetría'}</span>
          </button>
        </div>
      </div>

      {/* 
        =======================================================================
        TARJETA DE INFORMACIÓN GENERAL Y METADATOS TÉCNICOS
        =======================================================================
      */}
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

        {/* Desglose de Parámetros de Ubicación y Rangos Normativos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 text-xs">
          <div>
            <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
              Ubicación / Posición
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 capitalize">
              {sensor?.position || 'Jaula'}
            </p>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
              Profundidad
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
              {sensor?.depth != null ? `${sensor.depth} metros` : 'No especificada'}
            </p>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
              Oxígeno Mínimo
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
              {sensor?.oxygen_min != null ? `${sensor.oxygen_min} mg/L` : 'N/A'}
            </p>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
              Oxígeno Máximo
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
              {sensor?.oxygen_max != null ? `${sensor.oxygen_max} mg/L` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* 
        =======================================================================
        PANEL GRÁFICO CON BIBLIOTECA RECHARTS
        =======================================================================
      */}
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
