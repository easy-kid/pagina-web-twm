import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building, X } from './Common/Icons'

const sensorStatuses = {
  ok: {
    label: 'En línea',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
  no_data: {
    label: 'Sin datos',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  out_of_range: {
    label: 'Fuera de rango',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  },
}

const getSiteLocation = (site) => {
  if (typeof site.location === 'string') return site.location

  const coordinates = site.coordinates ?? site.location
  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    return `${coordinates[1]}, ${coordinates[0]}`
  }
  if (coordinates && typeof coordinates === 'object') {
    const latitude = coordinates.latitude ?? coordinates.lat
    const longitude = coordinates.longitude ?? coordinates.lng ?? coordinates.lon
    if (latitude != null && longitude != null) return `${latitude}, ${longitude}`
  }
  if (site.latitude != null && site.longitude != null) {
    return `${site.latitude}, ${site.longitude}`
  }

  return 'No especificada'
}

export default function SiteInfoDialog({ site, onClose }) {
  const dialogRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const sensors = Array.isArray(site.sensors) ? site.sensors : []

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-left text-slate-900 shadow-2xl backdrop:bg-slate-950/60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
      aria-labelledby="site-popup-title"
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-slate-800 sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
            <Building className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Centro de cultivo
            </p>
            <h2 id="site-popup-title" className="mt-1 text-xl font-bold">
              {site.name || 'Centro sin nombre'}
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="Cerrar información del centro"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500 dark:text-slate-400">Código</dt>
            <dd className="mt-1 font-medium">{site.code || 'No especificado'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500 dark:text-slate-400">Zona</dt>
            <dd className="mt-1 font-medium">{site.zone || 'No especificada'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-slate-500 dark:text-slate-400">Ubicación</dt>
            <dd className="mt-1 font-medium">{getSiteLocation(site)}</dd>
          </div>
          {site.description && (
            <div className="sm:col-span-2">
              <dt className="text-sm text-slate-500 dark:text-slate-400">Descripción</dt>
              <dd className="mt-1 font-medium">{site.description}</dd>
            </div>
          )}
        </dl>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold">Sensores asociados</h3>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {sensors.length} {sensors.length === 1 ? 'sensor' : 'sensores'}
            </span>
          </div>
          {sensors.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              Este centro no tiene sensores asociados.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
              {sensors.map((sensor, index) => {
                const sensorId = sensor.id ?? sensor._id
                const status = sensorStatuses[sensor.status] || {
                  label: 'Desconocido',
                  className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                }

                return (
                  <li
                    key={sensorId ?? `${sensor.name}-${index}`}
                    className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {sensor.name || sensor.code || 'Sensor sin nombre'}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {sensor.type || 'Sensor'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                        {status.label}
                      </span>
                      <button
                        type="button"
                        disabled={sensorId == null}
                        onClick={() => navigate(`/sensors/${encodeURIComponent(sensorId)}`)}
                        className="text-sm font-semibold text-blue-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400"
                      >
                        Mediciones
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </dialog>
  )
}
