import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
import { sensorService, formatChileDateTime } from '../services/sensorService'
import { siteService } from '../services/siteService'
import NotFoundPage from '../components/NotFoundPage'
import { isNotFoundError } from '../api/client'
import OxygenHistoryChart from '../components/Charts/OxygenHistoryChart'

function Activity({ className = '', size = 20, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function CalendarIcon({ className = '', size = 16, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

// Convierte 'YYYY-MM-DD' o timestamp ISO a 'DD/MM/YYYY' (formato Chile)
function isoToChileDate(isoStr) {
  if (!isoStr) return ''
  const clean = isoStr.slice(0, 10)
  const parts = clean.split('-')
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return isoStr
}

// Convierte 'DD/MM/YYYY' a 'YYYY-MM-DD' (ISO)
function chileDateToIso(chileStr) {
  if (!chileStr) return ''
  const parts = chileStr.trim().split('/')
  if (parts.length === 3 && parts[2]?.length === 4 && parts[0] && parts[1]) {
    const day = parts[0].padStart(2, '0')
    const month = parts[1].padStart(2, '0')
    const year = parts[2]
    return `${year}-${month}-${day}`
  }
  if (chileStr.includes('-') && chileStr.split('-')[0].length === 4) {
    return chileStr.slice(0, 10)
  }
  return ''
}

function ChileDateInput({ value, onChange, minDate, maxDate, ariaLabel }) {
  const dayRef = useRef(null)
  const monthRef = useRef(null)
  const yearRef = useRef(null)
  const pickerRef = useRef(null)

  const parts = (value || '').split('/')
  const day = parts[0] || ''
  const month = parts[1] || ''
  const year = parts[2] || ''

  const buildDate = (d, m, y) => {
    if (!d && !m && !y) return ''
    return `${d}/${m}/${y}`
  }

  const handleDayChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 2)
    onChange(buildDate(digits, month, year))
    if (digits.length === 2 && monthRef.current) {
      monthRef.current.focus()
      monthRef.current.select()
    }
  }

  const handleMonthChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 2)
    onChange(buildDate(day, digits, year))
    if (digits.length === 2 && yearRef.current) {
      yearRef.current.focus()
      yearRef.current.select()
    }
  }

  const handleYearChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4)
    onChange(buildDate(day, month, digits))
  }

  const handleDayKeyDown = (e) => {
    if (e.key === 'ArrowRight' && e.target.selectionStart === day.length && monthRef.current) {
      monthRef.current.focus()
    }
  }

  const handleMonthKeyDown = (e) => {
    if (e.key === 'Backspace' && !month && dayRef.current) {
      dayRef.current.focus()
    } else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0 && dayRef.current) {
      dayRef.current.focus()
    } else if (e.key === 'ArrowRight' && e.target.selectionStart === month.length && yearRef.current) {
      yearRef.current.focus()
    }
  }

  const handleYearKeyDown = (e) => {
    if (e.key === 'Backspace' && !year && monthRef.current) {
      monthRef.current.focus()
    } else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0 && monthRef.current) {
      monthRef.current.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').trim()
    let rawD
    let rawM
    let rawY
    if (pasted.includes('-')) {
      const p = pasted.split('-')
      if (p[0].length === 4) {
        rawY = p[0]
        rawM = p[1] || ''
        rawD = p[2] || ''
      } else {
        rawD = p[0]
        rawM = p[1] || ''
        rawY = p[2] || ''
      }
    } else if (pasted.includes('/')) {
      const p = pasted.split('/')
      rawD = p[0] || ''
      rawM = p[1] || ''
      rawY = p[2] || ''
    } else {
      const dig = pasted.replace(/\D/g, '')
      rawD = dig.slice(0, 2)
      rawM = dig.slice(2, 4)
      rawY = dig.slice(4, 8)
    }
    const d = (rawD || '').replace(/\D/g, '').slice(0, 2)
    const m = (rawM || '').replace(/\D/g, '').slice(0, 2)
    const y = (rawY || '').replace(/\D/g, '').slice(0, 4)
    onChange(buildDate(d, m, y))
    if (yearRef.current) {
      yearRef.current.focus()
    }
  }

  const handlePickerChange = (e) => {
    const isoVal = e.target.value
    if (isoVal) {
      onChange(isoToChileDate(isoVal))
    }
  }

  const isoVal = chileDateToIso(value)
  const minIso = chileDateToIso(minDate)
  const maxIso = chileDateToIso(maxDate)

  return (
    <div
      className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-0.5 text-xs text-slate-800 dark:text-white font-mono shadow-xs focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500"
      aria-label={ariaLabel}
    >
      <input
        ref={dayRef}
        type="text"
        inputMode="numeric"
        placeholder="DD"
        maxLength={2}
        value={day}
        onChange={handleDayChange}
        onKeyDown={handleDayKeyDown}
        onPaste={handlePaste}
        aria-label="Día"
        className="w-6 text-center bg-transparent focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 text-xs font-mono text-slate-800 dark:text-white"
      />
      <span className="text-slate-400 dark:text-slate-600 select-none text-[11px] font-mono px-0.5">/</span>
      <input
        ref={monthRef}
        type="text"
        inputMode="numeric"
        placeholder="MM"
        maxLength={2}
        value={month}
        onChange={handleMonthChange}
        onKeyDown={handleMonthKeyDown}
        onPaste={handlePaste}
        aria-label="Mes"
        className="w-6 text-center bg-transparent focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 text-xs font-mono text-slate-800 dark:text-white"
      />
      <span className="text-slate-400 dark:text-slate-600 select-none text-[11px] font-mono px-0.5">/</span>
      <input
        ref={yearRef}
        type="text"
        inputMode="numeric"
        placeholder="AAAA"
        maxLength={4}
        value={year}
        onChange={handleYearChange}
        onKeyDown={handleYearKeyDown}
        onPaste={handlePaste}
        aria-label="Año"
        className="w-10 text-center bg-transparent focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 text-xs font-mono text-slate-800 dark:text-white"
      />
      <div className="relative ml-1 flex items-center pl-1 border-l border-slate-200 dark:border-slate-700/80">
        <div className="pointer-events-none text-slate-400 dark:text-slate-500">
          <CalendarIcon className="w-3.5 h-3.5" />
        </div>
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          value={isoVal || ''}
          min={minIso || undefined}
          max={maxIso || undefined}
          onChange={handlePickerChange}
          onClick={(e) => {
            if (typeof e.target.showPicker === 'function') {
              try {
                e.target.showPicker()
              } catch {
                // Navegadores que restrinjan invocación programática directa
              }
            }
          }}
          aria-label={ariaLabel ? `${ariaLabel} (Selector de calendario)` : 'Selector de calendario'}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>
    </div>
  )
}

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
  const [exactDate, setExactDate] = useState('')
  const [exactEndDate, setExactEndDate] = useState('')
  const [loadingMeasurements, setLoadingMeasurements] = useState(false)
  const [refreshing, setRefreshing] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notFound, setNotFound] = useState(false)

  const fetchMeasurements = useCallback(async (currentSensor, rangeId, customFrom, customTo) => {
    if (!id) return
    setLoadingMeasurements(true)
    setMeasurementError('')
    try {
      let fromStr
      let toStr

      if (rangeId === 'custom') {
        const fromIso = chileDateToIso(customFrom)
        let toIso = chileDateToIso(customTo) || fromIso
        if (!fromIso) return
        if (toIso < fromIso) {
          toIso = fromIso
        }
        fromStr = `${fromIso}T00:00:00`
        toStr = `${toIso}T23:59:59`
      } else {
        const daysMap = { '24h': 1, '7d': 7, '30d': 30 }
        const days = daysMap[rangeId] || 1

        // Si el sensor está sin datos o inactivo, anclamos a su última lectura registrada
        const anchorDate = (currentSensor?.status === 'no_data' || !currentSensor?.transmitting) && currentSensor?.last_reading?.at
          ? new Date(currentSensor.last_reading.at)
          : new Date()

        const fromDate = new Date(anchorDate.getTime() - days * 24 * 60 * 60 * 1000)
        fromStr = fromDate.toISOString().slice(0, 19)
        toStr = anchorDate.toISOString().slice(0, 19)
      }

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
      setMeasurementError('No fue posible cargar el historial de mediciones para la fecha o rango seleccionado.')
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
      if (timeRange === 'custom') {
        const defaultDateIso = sensorData?.last_reading?.at
          ? sensorData.last_reading.at.slice(0, 10)
          : new Date().toISOString().slice(0, 10)
        const defaultChileDate = isoToChileDate(defaultDateIso)
        const activeFrom = exactDate || defaultChileDate
        if (!exactDate) setExactDate(defaultChileDate)
        fetchMeasurements(sensorData, 'custom', activeFrom, exactEndDate)
      } else {
        fetchMeasurements(sensorData, timeRange)
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
  }, [id, timeRange, exactDate, exactEndDate, fetchMeasurements])

  const handleRangeChange = (rangeId) => {
    setTimeRange(rangeId)
    if (rangeId !== 'custom') {
      fetchMeasurements(sensor, rangeId)
    } else {
      const defaultDateIso = sensor?.last_reading?.at
        ? sensor.last_reading.at.slice(0, 10)
        : new Date().toISOString().slice(0, 10)
      const defaultChileDate = isoToChileDate(defaultDateIso)
      const activeFrom = exactDate || defaultChileDate
      if (!exactDate) {
        setExactDate(defaultChileDate)
      }
      fetchMeasurements(sensor, 'custom', activeFrom, exactEndDate)
    }
  }

  const handleApplyExactDate = (e) => {
    e.preventDefault()
    if (!exactDate) return
    const fromIso = chileDateToIso(exactDate)
    if (!fromIso) {
      setMeasurementError('Por favor ingresa una fecha válida en formato dd/mm/aaaa.')
      return
    }
    fetchMeasurements(sensor, 'custom', exactDate, exactEndDate)
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

      {loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300" role="status">
          {loadError} Se muestran los últimos datos disponibles.
        </div>
      )}

      {/* Tarjeta de Información General del Sensor */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            {sensor?.site_id && (
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md">
                  <Building className="w-3 h-3 text-slate-400" />
                  {site?.name || `Centro ${sensor.site_id}`}
                  {siteNameError && (
                    <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">
                      (nombre no disponible)
                    </span>
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

          <div className="flex flex-col items-stretch gap-2 shrink-0 w-full sm:w-[464px]">
            {/* Selector de Rango Temporal y Fecha Exacta */}
            <div className="w-full flex items-center justify-between gap-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700/80 shadow-xs">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.id}
                  type="button"
                  onClick={() => handleRangeChange(range.id)}
                  disabled={loadingMeasurements}
                  className={`flex-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition duration-150 cursor-pointer disabled:opacity-50 text-center whitespace-nowrap ${
                    timeRange === range.id
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {range.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleRangeChange('custom')}
                disabled={loadingMeasurements}
                className={`flex-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition duration-150 cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  timeRange === 'custom'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Fecha Exacta</span>
              </button>
            </div>

            {/* Formulario compacto inline para Fecha Exacta */}
            {timeRange === 'custom' && (
              <form
                onSubmit={handleApplyExactDate}
                className="w-full self-stretch flex items-center justify-between gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs"
              >
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pl-1.5">Desde:</span>
                  <ChileDateInput
                    id="exact-from-date"
                    value={exactDate}
                    onChange={setExactDate}
                    ariaLabel="Fecha exacta desde"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Hasta:</span>
                  <ChileDateInput
                    id="exact-to-date"
                    value={exactEndDate}
                    minDate={exactDate}
                    onChange={setExactEndDate}
                    ariaLabel="Fecha exacta hasta (opcional)"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!chileDateToIso(exactDate) || loadingMeasurements}
                  className="px-3.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-50 shadow-xs whitespace-nowrap"
                >
                  Consultar
                </button>
              </form>
            )}
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