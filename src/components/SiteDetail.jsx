import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Radio } from './Common/Icons'
import { siteService } from '../services/siteService'
import NotFoundPage from './NotFoundPage'
import { isNotFoundError } from '../api/client'
import SiteMap from './SiteMap'
import { getSiteArea, getSiteId, getSiteLocation } from '../services/siteService'

export const SiteDetail = () => {
  const { siteId } = useParams()
  const navigate = useNavigate()
  const [site, setSite] = useState(null)
  const [sensors, setSensors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    const fetchDetailData = async () => {
      setLoading(true)
      setError('')

      try {
        const [siteData, sensorsData] = await Promise.all([
          siteService.getSiteById(siteId),
          siteService.getSensorsBySite(siteId),
        ])
        if (active) {
          setSite(siteData)
          setSensors(sensorsData)
        }
      } catch (loadError) {
        console.error('Error al cargar el detalle del centro:', loadError)
        if (active) {
          if (isNotFoundError(loadError)) {
            setNotFound(true)
          } else {
            setError('No fue posible cargar el centro y sus sensores. Intenta nuevamente.')
          }
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchDetailData()
    return () => {
      active = false
    }
  }, [siteId, reloadKey])

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500 dark:text-slate-400" role="status">
        Cargando detalles del centro...
      </div>
    )
  }

  if (notFound) {
    return <NotFoundPage message="La API no encontró el centro o el endpoint solicitado." />
  }

  return (
    <section className="space-y-6">
      <button
        type="button"
        onClick={() => navigate('/sites')}
        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a centros
      </button>

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
      ) : !site ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          No se encontró el centro solicitado.
        </div>
      ) : (
        <>
          <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Centro de cultivo
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
              {site.name || 'Centro sin nombre'}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              ID: {getSiteId(site) ?? siteId}
            </p>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-sm text-slate-500 dark:text-slate-400">Código</dt>
                <dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">
                  {site.code || 'No especificado'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500 dark:text-slate-400">Área</dt>
                <dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">
                  {getSiteArea(site) || 'No especificada'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500 dark:text-slate-400">Ubicación</dt>
                <dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">
                  {getSiteLocation(site)}
                </dd>
              </div>
            </dl>
          </header>

          <SiteMap sites={[{ ...site, sensors }]} />

          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sensores asociados</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Estado y acceso al historial de mediciones de este centro.
              </p>
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {sensors.length} {sensors.length === 1 ? 'sensor' : 'sensores'}
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {sensors.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Radio className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-3 font-medium text-slate-800 dark:text-slate-200">
                  No hay sensores asociados a este centro.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left">
                  <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
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
                        Historial
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sensors.map((sensor, index) => {
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
                        <tr key={sensorId ?? `${sensor.name}-${index}`}>
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
                            <button
                              type="button"
                              disabled={sensorId == null}
                              onClick={() => navigate(`/sensors/${encodeURIComponent(sensorId)}`)}
                              className="text-sm font-semibold text-blue-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400"
                            >
                              Ver mediciones
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
