import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LineChart } from '../components/Common/Icons'
import NotFoundPage from '../components/NotFoundPage'
import { isNotFoundError } from '../api/client'
import { getSiteId, siteService } from '../services/siteService'
import { formatChileDateTime, sensorService } from '../services/sensorService'

const pageSize = 25

const getTotal = (data, fallback) => {
  const total = data?.meta?.totalCount ??
    data?.meta?.total_count ??
    data?.meta?.total ??
    data?.totalCount ??
    data?.total_count ??
    data?.total
  const parsed = Number(total)
  return total == null || !Number.isFinite(parsed) ? fallback : parsed
}

const getDateParts = (value) => {
  if (!value) return { date: '—', time: '' }
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  if (!match) return { date: formatChileDateTime(value), time: '' }
  const [, year, month, day, hour, minute] = match
  return { date: `${day}/${month}/${year}`, time: `${hour}:${minute}` }
}

export default function MeasurementsPage() {
  const [sites, setSites] = useState([])
  const [siteId, setSiteId] = useState('')
  const [sensors, setSensors] = useState([])
  const [sensorId, setSensorId] = useState('')
  const [loadingSites, setLoadingSites] = useState(true)
  const [loadingSensors, setLoadingSensors] = useState(false)
  const [selectionError, setSelectionError] = useState('')
  const [fromInput, setFromInput] = useState('')
  const [toInput, setToInput] = useState('')
  const [filters, setFilters] = useState(null)
  const [page, setPage] = useState(1)
  const [measurements, setMeasurements] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [hasTotalCount, setHasTotalCount] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let active = true
    siteService.getSites()
      .then((items) => {
        if (active) setSites(items.filter((site) => getSiteId(site) != null))
      })
      .catch((loadError) => {
        console.error('Error al cargar centros para filtrar mediciones:', loadError)
        if (active) setSelectionError('No fue posible cargar los centros. Intenta nuevamente.')
      })
      .finally(() => {
        if (active) setLoadingSites(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!siteId) {
      setSensors([])
      setSensorId('')
      setLoadingSensors(false)
      return undefined
    }

    let active = true
    setLoadingSensors(true)
    setSelectionError('')
    siteService.getSensorsBySite(siteId)
      .then((items) => {
        if (active) setSensors(items)
      })
      .catch((loadError) => {
        console.error('Error al cargar sensores del centro:', loadError)
        if (active) setSelectionError('No fue posible cargar los sensores de este centro.')
      })
      .finally(() => {
        if (active) setLoadingSensors(false)
      })

    return () => {
      active = false
    }
  }, [siteId])

  useEffect(() => {
    if (!filters) return undefined

    let active = true

    const loadMeasurements = async () => {
      setLoading(true)
      setError('')
      try {
        const { items, meta } = await sensorService.getMeasurementsPage({
          ...filters,
          page,
          page_size: pageSize,
        })
        if (active) {
          setMeasurements(items)
          setTotalCount(getTotal(meta, items.length))
          setHasTotalCount(meta.hasTotalCount)
        }
      } catch (loadError) {
        console.error('Error al cargar mediciones:', loadError)
        if (active) {
          if (isNotFoundError(loadError)) setNotFound(true)
          else setError('No fue posible cargar las mediciones. Intenta nuevamente.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadMeasurements()
    return () => {
      active = false
    }
  }, [filters, page])

  const applyFilters = (event) => {
    event.preventDefault()
    const nextFilters = {}
    if (sensorId) nextFilters.sensor_id = sensorId
    if (siteId) nextFilters.site_id = siteId
    if (fromInput.trim()) nextFilters.from = fromInput.trim()
    if (toInput.trim()) nextFilters.to = toInput.trim()

    if (!nextFilters.sensor_id && !nextFilters.site_id) {
      setError('Selecciona un centro o un sensor para consultar sus mediciones.')
      return
    }

    setError('')
    setPage(1)
    setFilters(nextFilters)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const canGoNext = hasTotalCount
    ? page < totalPages
    : measurements.length === pageSize
  const numericValues = measurements
    .map((measurement) => measurement.value)
    .filter(Number.isFinite)
  const averageValue = numericValues.length
    ? numericValues.reduce((total, value) => total + value, 0) / numericValues.length
    : null
  const minimumValue = numericValues.length ? Math.min(...numericValues) : null
  const maximumValue = numericValues.length ? Math.max(...numericValues) : null

  if (notFound) return <NotFoundPage message="La API no encontró el endpoint de mediciones." />

  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Telemetría</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">Mediciones</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Revisa las mediciones devueltas por el API. Las fechas se muestran tal como las entrega el backend en hora chilena.
        </p>
      </header>

      <form onSubmit={applyFilters} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-5 dark:border-slate-800 dark:bg-slate-900">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Zona / centro
          <select
            value={siteId}
            onChange={(event) => {
              setSiteId(event.target.value)
              setSensorId('')
            }}
            disabled={loadingSites}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="">{loadingSites ? 'Cargando centros...' : 'Selecciona un centro'}</option>
            {sites.map((site) => (
              <option key={getSiteId(site)} value={getSiteId(site)}>{site.name || `Centro ${getSiteId(site)}`}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Sensor exacto
          <select
            value={sensorId}
            onChange={(event) => setSensorId(event.target.value)}
            disabled={!siteId || loadingSensors}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="">
              {!siteId ? 'Elige primero un centro' : loadingSensors ? 'Cargando sensores...' : 'Todos los sensores del centro'}
            </option>
            {sensors.map((sensor) => (
              <option key={sensor.id ?? sensor._id} value={sensor.id ?? sensor._id}>
                {sensor.name || `Sensor #${sensor.id ?? sensor._id}`}
                {sensor.depth != null ? ` · ${sensor.depth} m` : ''}
                {` · ID ${sensor.id ?? sensor._id}`}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Desde (hora chilena)
          <input type="datetime-local" value={fromInput} onChange={(event) => setFromInput(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </label>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Hasta (hora chilena)
          <input type="datetime-local" value={toInput} onChange={(event) => setToInput(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </label>
        <button type="submit" className="self-end rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
          Filtrar mediciones
        </button>
      </form>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Selecciona una zona para ver todos sus sensores o elige un sensor exacto. También puedes filtrar por fechas.
      </p>

      {selectionError && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300" role="alert">{selectionError}</p>}
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert">{error}</p>}

      {loading ? (
        <p className="py-12 text-center text-slate-500" role="status">Cargando mediciones...</p>
      ) : measurements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <LineChart className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {filters ? 'No hay mediciones para los filtros seleccionados.' : 'Aplica un filtro para ver las mediciones del centro o sensor.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Registros en esta página', value: measurements.length, unit: '' },
              { label: 'Promedio de oxígeno', value: averageValue, unit: 'mg/L' },
              { label: 'Mínimo registrado', value: minimumValue, unit: 'mg/L' },
              { label: 'Máximo registrado', value: maximumValue, unit: 'mg/L' },
            ].map((stat) => (
              <article key={stat.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
                  {stat.value == null ? '—' : typeof stat.value === 'number' && stat.unit ? stat.value.toFixed(2) : stat.value}
                  {stat.unit && <span className="ml-1 text-xs font-medium text-slate-500 dark:text-slate-400">{stat.unit}</span>}
                </p>
              </article>
            ))}
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[700px] text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                {['Fecha y hora', 'Sensor', 'Centro', 'Profundidad', 'Oxígeno', ''].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {measurements.map((measurement, index) => (
                <tr key={measurement.id ?? `${measurement.timestamp}-${index}`}>
                  <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">
                    <span className="block font-medium">{getDateParts(measurement.timestamp).date}</span>
                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                      {getDateParts(measurement.timestamp).time || 'Hora no disponible'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">{measurement.sensor_name || measurement.sensor_id || '—'}</td>
                  <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">{measurement.site_name || measurement.site_id || '—'}</td>
                  <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">{measurement.depth ?? '—'}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                    {Number.isFinite(measurement.value) ? `${measurement.value.toFixed(2)} mg/L` : '—'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {measurement.sensor_id != null && (
                      <Link className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400" to={`/sensors/${encodeURIComponent(measurement.sensor_id)}`}>
                        Sensor
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}

      <nav className="flex items-center justify-between" aria-label="Paginación de mediciones">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {hasTotalCount ? `${totalCount} mediciones · ` : ''}Página {page}{hasTotalCount && totalPages > 1 ? ` de ${totalPages}` : ''}
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1 || loading} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700">
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          <button type="button" onClick={() => setPage((value) => value + 1)} disabled={!canGoNext || loading} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700">
            Siguiente <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </nav>
    </section>
  )
}
