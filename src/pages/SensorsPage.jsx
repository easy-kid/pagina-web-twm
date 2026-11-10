import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Radio, Search } from '../components/Common/Icons'
import NotFoundPage from '../components/NotFoundPage'
import { isNotFoundError } from '../api/client'
import { getSiteId, siteService } from '../services/siteService'
import { sensorService } from '../services/sensorService'

const pageSize = 20

const statusLabels = {
  ok: 'En línea',
  no_data: 'Desconectado',
  out_of_range: 'Fuera de rango',
  unknown: 'Desconocido',
}

const statusStyles = {
  ok: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  no_data: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  out_of_range: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  unknown: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

export default function SensorsPage() {
  const [sensors, setSensors] = useState([])
  const [sites, setSites] = useState([])
  const [status, setStatus] = useState('all')
  const [siteId, setSiteId] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasTotalCount, setHasTotalCount] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let active = true
    siteService.getSites()
      .then((items) => {
        if (active) setSites(items.filter((site) => getSiteId(site) != null))
      })
      .catch((loadError) => {
        console.error('Error al cargar centros para filtrar sensores:', loadError)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    const loadSensors = async () => {
      setLoading(true)
      setError('')
      try {
        const params = { page, page_size: pageSize }
        if (status !== 'all') params.status = status
        if (siteId !== 'all') params.site_id = siteId
        const result = await sensorService.getSensors(params)
        if (active) {
          setSensors(result.items)
          setTotalCount(result.meta.totalCount)
          setHasTotalCount(result.meta.hasTotalCount)
        }
      } catch (loadError) {
        console.error('Error al cargar sensores:', loadError)
        if (active) {
          if (isNotFoundError(loadError)) setNotFound(true)
          else setError('No fue posible cargar los sensores. Intenta nuevamente.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSensors()
    return () => {
      active = false
    }
  }, [page, siteId, status])

  const visibleSensors = sensors.filter((sensor) => {
    const term = search.trim().toLocaleLowerCase('es-CL')
    if (!term) return true
    const site = sites.find((item) => String(getSiteId(item)) === String(sensor.site_id))
    return [
      sensor.name,
      sensor.id,
      sensor.type,
      sensor.position,
      site?.name,
      site?.code,
      statusLabels[sensor.status],
    ].some((value) => String(value ?? '').toLocaleLowerCase('es-CL').includes(term))
  })
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const canGoNext = hasTotalCount
    ? page < totalPages
    : sensors.length === pageSize

  if (notFound) return <NotFoundPage message="La API no encontró el endpoint de sensores." />

  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Operación</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">Sensores</h1>
      </header>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_13rem_13rem]">
        <label className="relative block">
          <span className="sr-only">Buscar en esta página</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por sensor, centro o posición..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </label>
        <label>
          <span className="sr-only">Filtrar por estado</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">Todos los estados</option>
            <option value="ok">En línea</option>
            <option value="no_data">Desconectado</option>
            <option value="out_of_range">Fuera de rango</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Filtrar por centro</span>
          <select
            value={siteId}
            onChange={(event) => {
              setSiteId(event.target.value)
              setPage(1)
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">Todos los centros</option>
            {sites.map((site) => (
              <option key={getSiteId(site)} value={getSiteId(site)}>{site.name || `Centro ${getSiteId(site)}`}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert">{error}</p>}
      {loading ? (
        <p className="py-12 text-center text-slate-500" role="status">Cargando sensores...</p>
      ) : visibleSensors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <Radio className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">No hay sensores que coincidan con los filtros.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[700px] text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                {['Sensor', 'Centro', 'Tipo', 'Posición', 'Estado', ''].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleSensors.map((sensor, index) => {
                const site = sites.find((item) => String(getSiteId(item)) === String(sensor.site_id))
                return (
                  <tr key={sensor.id ?? index}>
                    <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">{sensor.name}</td>
                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{site?.name || `Centro ${sensor.site_id ?? '—'}`}</td>
                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{sensor.type}</td>
                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{sensor.position || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[sensor.status] || statusStyles.unknown}`}>
                        {statusLabels[sensor.status] || statusLabels.unknown}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400" to={`/sensors/${encodeURIComponent(sensor.id)}`}>
                        Detalle
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <nav className="flex items-center justify-between" aria-label="Paginación de sensores">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {hasTotalCount ? `${totalCount} sensores · ` : ''}Página {page}{hasTotalCount && totalPages > 1 ? ` de ${totalPages}` : ''}
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
