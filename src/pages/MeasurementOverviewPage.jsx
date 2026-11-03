import { useEffect, useMemo, useState } from 'react'
import { LineChart } from '../components/Common/Icons'
import NotFoundPage from '../components/NotFoundPage'
import { isNotFoundError } from '../api/client'
import { getSiteId, siteService } from '../services/siteService'
import { sensorService } from '../services/sensorService'

const colors = ['#2563eb', '#059669', '#d97706', '#db2777', '#7c3aed', '#0891b2']
const timeKeys = ['bucket', 'timestamp', 'measured_at', 'time', 'datetime', 'date', 'period']
const valueKeys = ['avg_oxygen', 'average_oxygen', 'oxygen_avg', 'average', 'avg', 'mean', 'value', 'oxygen']

const getScalarFields = (value) =>
  Object.fromEntries(
    Object.entries(value).filter(([, field]) =>
      field == null || ['string', 'number', 'boolean'].includes(typeof field),
    ),
  )

const flattenOverview = (value, inherited = {}, output = []) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (item && typeof item === 'object') {
        const fields = getScalarFields(item)
        const nestedArrays = Object.values(item).filter(Array.isArray)
        if (nestedArrays.length) {
          const label = fields.sensor_name || fields.name ||
            (fields.sensor_id != null ? `Sensor ${fields.sensor_id}` : `Serie ${index + 1}`)
          nestedArrays.forEach((nested) =>
            flattenOverview(nested, { ...inherited, ...fields, seriesName: label }, output),
          )
        } else {
          output.push({ ...inherited, ...fields })
        }
      }
    })
    return output
  }

  if (value && typeof value === 'object') {
    const fields = getScalarFields(value)
    const arrays = Object.values(value).filter(Array.isArray)
    if (arrays.length) {
      arrays.forEach((items) => flattenOverview(items, { ...inherited, ...fields }, output))
    }
  }

  return output
}

const getPointValue = (row) => {
  const key = valueKeys.find((candidate) => row[candidate] != null && Number.isFinite(Number(row[candidate])))
  if (key) return Number(row[key])

  const excluded = new Set([
    'id',
    'site_id',
    'sensor_id',
    'depth',
    'count',
    'min',
    'max',
    'min_oxygen',
    'max_oxygen',
  ])
  const numericField = Object.entries(row).find(([key, value]) =>
    !excluded.has(key) &&
    key !== 'seriesName' &&
    value != null &&
    Number.isFinite(Number(value)),
  )
  return numericField ? Number(numericField[1]) : Number.NaN
}

const getPointLabel = (row, index) => {
  const key = timeKeys.find((candidate) => row[candidate] != null)
  if (!key) return String(index + 1)
  const value = String(row[key])
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/)
  if (match) {
    const [, year, month, day, hour, minute] = match
    return hour ? `${day}/${month}/${year} ${hour}:${minute}` : `${day}/${month}/${year}`
  }
  return value
}

const getSeriesName = (row) =>
  row.seriesName ||
  row.sensor_name ||
  (row.sensor_id != null ? `Sensor ${row.sensor_id}` : null) ||
  (row.depth != null ? `Profundidad ${row.depth} m` : 'Oxígeno disuelto')

export default function MeasurementOverviewPage() {
  const [sites, setSites] = useState([])
  const [siteId, setSiteId] = useState('')
  const [bucket, setBucket] = useState('hour')
  const [days, setDays] = useState('7')
  const [loading, setLoading] = useState(true)
  const [loadingSites, setLoadingSites] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [overview, setOverview] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedSeries, setSelectedSeries] = useState(null)

  useEffect(() => {
    let active = true
    siteService.getSites()
      .then((items) => {
        if (active) setSites(items.filter((site) => getSiteId(site) != null))
      })
      .catch((loadError) => {
        console.error('Error al cargar centros para el resumen:', loadError)
      })
      .finally(() => {
        if (active) setLoadingSites(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const loadOverview = async () => {
      setLoading(true)
      setError('')
      try {
        const params = { medition: 'oxygen', bucket, days: Number(days) }
        if (siteId) params.site_id = siteId
        const data = await sensorService.getMeasurementOverview(params)
        if (active) setOverview(data)
      } catch (loadError) {
        console.error('Error al cargar el resumen de mediciones:', loadError)
        if (active) {
          if (isNotFoundError(loadError)) setNotFound(true)
          else setError('No fue posible cargar el resumen de mediciones. Intenta nuevamente.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadOverview()
    return () => {
      active = false
    }
  }, [bucket, days, reloadKey, siteId])

  useEffect(() => {
    setSelectedSeries(null)
  }, [bucket, days, siteId])

  const rows = useMemo(() => flattenOverview(overview), [overview])
  const chartSeries = useMemo(() => {
    const groups = new Map()
    rows.forEach((row, index) => {
      const value = getPointValue(row)
      if (!Number.isFinite(value)) return
      const name = getSeriesName(row)
      if (!groups.has(name)) groups.set(name, [])
      groups.get(name).push({
        label: getPointLabel(row, index),
        value,
        raw: row,
      })
    })
    return [...groups.entries()].map(([name, points]) => ({ name, points }))
  }, [rows])

  const visibleSeries = selectedSeries
    ? chartSeries.filter((series) => series.name === selectedSeries)
    : chartSeries
  const allValues = visibleSeries.flatMap((series) => series.points.map((point) => point.value))
  const minValue = allValues.length ? Math.min(...allValues) : 0
  const maxValue = allValues.length ? Math.max(...allValues) : 1
  const valueRange = maxValue - minValue || Math.max(Math.abs(minValue) * 0.1, 1)
  const axisMin = maxValue === minValue ? minValue - valueRange / 2 : minValue
  const axisMax = maxValue === minValue ? maxValue + valueRange / 2 : maxValue
  const chartWidth = 860
  const chartHeight = 320
  const chartTop = 42
  const chartBottom = 258
  const chartLeft = 86
  const chartRight = 836
  const valueTicks = Array.from({ length: 5 }, (_, index) =>
    axisMax - (valueRange * index) / 4,
  )
  const chartPoints = visibleSeries.map((series) => ({
    ...series,
    color: colors[chartSeries.indexOf(series) % colors.length],
    coordinates: series.points.map((point, index) => ({
      ...point,
      x: series.points.length === 1
        ? (chartLeft + chartRight) / 2
        : chartLeft + ((chartRight - chartLeft) * index) / (series.points.length - 1),
      y: chartBottom - ((point.value - axisMin) / valueRange) * (chartBottom - chartTop),
    })),
  }))
  const referencePoints = chartPoints[0]?.coordinates || []
  const dateTickIndexes = [...new Set(
    Array.from({ length: Math.min(5, referencePoints.length) }, (_, index) =>
      referencePoints.length < 2
        ? 0
        : Math.round((index * (referencePoints.length - 1)) / (Math.min(5, referencePoints.length) - 1)),
    ),
  )]

  if (notFound) return <NotFoundPage message="La API no encontró la ruta de resumen de mediciones." />

  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Telemetría</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">Resumen de mediciones</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Datos agregados por sensor y bloque horario, usando la hora chilena del API.
        </p>
      </header>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Centro
          <select value={siteId} onChange={(event) => setSiteId(event.target.value)} disabled={loadingSites} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            <option value="">Todos los centros</option>
            {sites.map((site) => (
              <option key={getSiteId(site)} value={getSiteId(site)}>{site.name || `Centro ${getSiteId(site)}`}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Agrupación
          <select value={bucket} onChange={(event) => setBucket(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            <option value="hour">Por hora</option>
            <option value="day">Por día</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Período
          <select value={days} onChange={(event) => setDays(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            {[1, 3, 7, 14, 30].map((value) => (
              <option key={value} value={value}>{value} {value === 1 ? 'día' : 'días'}</option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert">
          {error}{' '}
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="font-semibold underline">Reintentar</button>
        </div>
      )}

      {loading ? (
        <p className="py-12 text-center text-slate-500" role="status">Cargando resumen...</p>
      ) : chartPoints.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <LineChart className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">No hay datos agregados para los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
            {chartSeries.map((series, index) => (
              <button
                key={series.name}
                type="button"
                aria-pressed={selectedSeries === series.name}
                onClick={() => setSelectedSeries((current) => current === series.name ? null : series.name)}
                className={`inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  selectedSeries === series.name
                    ? 'bg-slate-100 font-semibold text-slate-900 dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'
                }`}
                title={selectedSeries === series.name ? 'Mostrar todas las líneas' : `Mostrar solo ${series.name}`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                {series.name}
              </button>
            ))}
            <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">
              {selectedSeries ? 'Vista individual · haz clic otra vez para ver todas' : 'Haz clic en una serie para verla individualmente'}
            </span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Resumen de mediciones por sensor, con escala de oxígeno y fechas" className="h-80 min-w-[680px] w-full">
              {valueTicks.map((value, index) => {
                const y = chartTop + index * ((chartBottom - chartTop) / 4)
                return (
                  <g key={index}>
                    <line x1={chartLeft} x2={chartRight} y1={y} y2={y} stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeDasharray="4 5" />
                    <text x={chartLeft - 12} y={y + 4} textAnchor="end" fill="currentColor" className="text-slate-500 dark:text-slate-400" fontSize="11">
                      {value.toFixed(1)}
                    </text>
                  </g>
                )
              })}
              <text x="12" y={(chartTop + chartBottom) / 2} transform={`rotate(-90 12 ${(chartTop + chartBottom) / 2})`} textAnchor="middle" fill="currentColor" className="text-slate-500 dark:text-slate-400" fontSize="11">
                Oxígeno (mg/L)
              </text>
              {dateTickIndexes.map((pointIndex) => {
                const point = referencePoints[pointIndex]
                return (
                  <text key={`${point.label}-${pointIndex}`} x={point.x} y={chartBottom + 28} textAnchor="middle" fill="currentColor" className="text-slate-500 dark:text-slate-400" fontSize="10">
                    {point.label}
                  </text>
                )
              })}
              {chartPoints.map((series) => (
                <g key={series.name}>
                  <polyline
                    points={series.coordinates.map((point) => `${point.x},${point.y}`).join(' ')}
                    fill="none"
                    stroke={series.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {series.coordinates.map((point, index) => (
                    <g key={`${point.label}-${index}`}>
                      <circle cx={point.x} cy={point.y} r="4" fill={series.color}>
                      <title>{`${series.name} · ${point.label}: ${point.value} mg/L`}</title>
                      </circle>
                      {chartPoints.length === 1 && (
                        <text x={point.x} y={point.y - 10} textAnchor="middle" fill="currentColor" className="text-slate-700 dark:text-slate-200" fontSize="11" fontWeight="600">
                          {point.value.toFixed(2)}
                        </text>
                      )}
                    </g>
                  ))}
                </g>
              ))}
            </svg>
          </div>
          <p className="text-right text-xs text-slate-500 dark:text-slate-400">
            Escala vertical: mg/L · Eje horizontal: fecha y hora local del API
          </p>
        </div>
      )}
    </section>
  )
}
