import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building, ClipboardCheck, Radio, Search } from './Common/Icons'
import { getSiteArea, getSiteId, siteService } from '../services/siteService'
import NotFoundPage from './NotFoundPage'
import { isNotFoundError } from '../api/client'
import SiteMap from './SiteMap'
import SiteInfoDialog from './SiteInfoDialog'

export const SitesList = () => {
  const navigate = useNavigate()
  const [sites, setSites] = useState([])
  const [selectedSite, setSelectedSite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [search, setSearch] = useState('')
  const [areaFilter, setAreaFilter] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    const loadSitesAndSensors = async () => {
      setLoading(true)
      setError('')

      try {
        const siteList = await siteService.getSites()
        const sitesWithSensors = await Promise.all(
          siteList.map(async (site) => {
            const siteId = getSiteId(site)
            if (siteId == null) {
              throw new Error(`El centro "${site.name || 'sin nombre'}" no tiene un identificador.`)
            }

            const sensors = await siteService.getSensorsBySite(siteId)
            return { ...site, id: siteId, sensors }
          }),
        )

        if (active) setSites(sitesWithSensors)
      } catch (loadError) {
        console.error('Error al cargar los centros y sus sensores:', loadError)
        if (active) {
          if (isNotFoundError(loadError)) {
            setNotFound(true)
          } else {
            setError('No fue posible cargar todos los centros y sus sensores. Intenta nuevamente.')
          }
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSitesAndSensors()
    return () => {
      active = false
    }
  }, [reloadKey])

  const filteredSites = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const normalizedArea = areaFilter.trim().toLowerCase()

    return sites.filter((site) => {
      const matchesSearch =
        !normalizedSearch ||
        String(site.name || '').toLowerCase().includes(normalizedSearch) ||
        String(site.code || '').toLowerCase().includes(normalizedSearch) ||
        site.sensors.some((sensor) =>
          `${sensor.name || ''} ${sensor.code || ''} ${sensor.id || ''}`
            .toLowerCase()
            .includes(normalizedSearch),
        )
      const matchesArea =
        !normalizedArea || String(getSiteArea(site) || '').toLowerCase().includes(normalizedArea)
      return matchesSearch && matchesArea
    })
  }, [sites, search, areaFilter])

  const totalSensors = filteredSites.reduce((total, site) => total + site.sensors.length, 0)

  if (notFound) {
    return <NotFoundPage message="La API no encontró el endpoint de centros o sensores solicitado." />
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500 dark:text-slate-400" role="status">
        Cargando todos los centros y sensores...
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          Operación
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
          Centros y sensores
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Todos los sensores están agrupados por centro en esta página. Desplázate hacia abajo para recorrerlos.
        </p>
      </header>

      {error ? (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
          role="alert"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="mt-3 font-semibold underline underline-offset-2"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="relative block">
              <span className="sr-only">Buscar centro o sensor</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Buscar centro, sensor o código..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
            <label>
              <span className="sr-only">Filtrar por área</span>
              <input
                type="search"
                placeholder="Filtrar por área..."
                value={areaFilter}
                onChange={(event) => setAreaFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400" aria-live="polite">
            {filteredSites.length} {filteredSites.length === 1 ? 'centro' : 'centros'} · {totalSensors}{' '}
            {totalSensors === 1 ? 'sensor' : 'sensores'}
          </p>

          {filteredSites.length > 0 && (
            <SiteMap sites={filteredSites} title="Mapa de centros de cultivo" />
          )}

          {filteredSites.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
              <Building className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 font-medium text-slate-800 dark:text-slate-200">
                {sites.length === 0
                  ? 'Todavía no hay centros disponibles.'
                  : 'No hay centros ni sensores que coincidan con la búsqueda.'}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Prueba con otro nombre, código o área.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredSites.map((site, index) => (
                <article
                  key={getSiteId(site) ?? `${site.name}-${index}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <header className="flex flex-col gap-4 border-b border-slate-100 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                        <Building className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-white">
                          {site.name || 'Centro sin nombre'}
                        </h2>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                          Código: {site.code || 'No especificado'} · Área: {getSiteArea(site) || 'No especificada'}
                          {' · '}ID: {getSiteId(site) ?? 'No disponible'}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-3">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {site.sensors.length} {site.sensors.length === 1 ? 'sensor' : 'sensores'}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate('/interventions', {
                          state: {
                            openForm: true,
                            targetType: 'site',
                            siteId: String(getSiteId(site)),
                          },
                        })}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-700 bg-blue-600 px-3.5 py-2 text-sm font-bold text-white shadow-sm transition hover:border-blue-800 hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        Intervenir
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSite(site)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Detalle
                      </button>
                    </div>
                  </header>

                  {site.sensors.length === 0 ? (
                    <div className="flex items-center gap-2 px-5 py-6 text-sm text-slate-500 dark:text-slate-400">
                      <Radio className="h-4 w-4" />
                      Este centro no tiene sensores asociados.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px] text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                          <tr>
                            <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Sensor
                            </th>
                            <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Tipo
                            </th>
                            <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Estado
                            </th>
                            <th scope="col" className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {site.sensors.map((sensor, sensorIndex) => {
                            const statusLabel = {
                              ok: 'En línea',
                              no_data: 'Desconectado',
                              out_of_range: 'Fuera de rango',
                            }[sensor.status] || 'Desconocido'
                            const statusClass = {
                              ok: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
                              no_data: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
                              out_of_range: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
                            }[sensor.status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            const sensorId = sensor.id ?? sensor._id

                            return (
                              <tr key={sensorId ?? `${sensor.name}-${sensorIndex}`}>
                                <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                                  {sensor.name || sensor.code || 'Sensor sin nombre'}
                                </td>
                                <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                                  {sensor.type || 'Sensor'}
                                </td>
                                <td className="px-5 py-4">
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
                                    {statusLabel}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <div className="flex items-center justify-end gap-3">
                                  <button
                                    type="button"
                                    disabled={sensorId == null || getSiteId(site) == null}
                                    onClick={() => navigate('/interventions', {
                                      state: {
                                        openForm: true,
                                        targetType: 'sensor',
                                        siteId: String(getSiteId(site)),
                                        sensorId: String(sensorId),
                                      },
                                    })}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-700 bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
                                  >
                                    <ClipboardCheck className="h-3.5 w-3.5" />
                                    Intervenir
                                  </button>
                                  <button
                                    type="button"
                                    disabled={sensorId == null}
                                    onClick={() => navigate(`/sensors/${encodeURIComponent(sensorId)}`)}
                                    className="text-sm font-semibold text-blue-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400"
                                  >
                                    Ver mediciones
                                  </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
      {selectedSite && (
        <SiteInfoDialog
          site={selectedSite}
          onClose={() => setSelectedSite(null)}
        />
      )}
    </section>
  )
}
