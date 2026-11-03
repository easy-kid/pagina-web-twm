import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building, ClipboardCheck, X } from './Common/Icons'
import { getSiteArea, getSiteId, getSiteLocation } from '../services/siteService'

const sensorStatuses = {
  ok: {
    label: 'En línea',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    priority: 2,
  },
  no_data: {
    label: 'Desconectado',
    className: 'bg-rose-100 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-900',
    priority: 0,
  },
  out_of_range: {
    label: 'Fuera de rango',
    className: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900',
    priority: 1,
  },
}

export default function SiteInfoDialog({ site, onClose }) {
  const dialogRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const sensors = (Array.isArray(site.sensors) ? site.sensors : [])
    .map((sensor, index) => ({ sensor, index }))
    .sort(
      (left, right) =>
        (sensorStatuses[left.sensor.status]?.priority ?? 3) -
        (sensorStatuses[right.sensor.status]?.priority ?? 3),
    )
  const operationalSensors = sensors.filter(({ sensor }) => sensor.status === 'ok').length
  const operationalPercentage = sensors.length
    ? Math.round((operationalSensors / sensors.length) * 100)
    : 0

  const startSensorIntervention = (sensorId) => {
    dialogRef.current?.close()
    navigate('/interventions', {
      state: {
        openForm: true,
        targetType: 'sensor',
        siteId: String(getSiteId(site)),
        sensorId: String(sensorId),
      },
    })
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-left text-slate-900 shadow-2xl backdrop:bg-slate-950/60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
      aria-labelledby="site-popup-title"
    >
      <div className="border-b border-slate-100 bg-gradient-to-br from-blue-50 via-white to-white p-5 dark:border-slate-800 dark:from-slate-800 dark:via-slate-900 dark:to-slate-900 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 shadow-sm dark:bg-blue-950/70 dark:text-blue-300">
              <Building className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                Centro de cultivo
              </p>
              <h2 id="site-popup-title" className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
                {site.name || 'Centro sin nombre'}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                ID: {getSiteId(site) ?? 'No disponible'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-white hover:text-slate-800 hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Cerrar información del centro"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Operatividad del centro
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {sensors.length
                  ? `${operationalSensors} de ${sensors.length} sensores en línea`
                  : 'Este centro no tiene sensores asociados'}
              </p>
            </div>
            <span className="shrink-0 text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
              {operationalPercentage}%
            </span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
            role="progressbar"
            aria-label="Porcentaje de operatividad del centro"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={operationalPercentage}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-[width] duration-500"
              style={{ width: `${operationalPercentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
            <dt className="text-sm text-slate-500 dark:text-slate-400">Código</dt>
            <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{site.code || 'No especificado'}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
            <dt className="text-sm text-slate-500 dark:text-slate-400">Área</dt>
            <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{getSiteArea(site) || 'No especificada'}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 sm:col-span-2">
            <dt className="text-sm text-slate-500 dark:text-slate-400">Ubicación</dt>
            <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{getSiteLocation(site)}</dd>
          </div>
          {site.description && (
            <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 sm:col-span-2">
              <dt className="text-sm text-slate-500 dark:text-slate-400">Descripción</dt>
              <dd className="mt-1 font-medium text-slate-800 dark:text-slate-100">{site.description}</dd>
            </div>
          )}
        </dl>

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold">Sensores asociados</h3>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {[
                ['no_data', sensors.filter(({ sensor }) => sensor.status === 'no_data').length],
                ['out_of_range', sensors.filter(({ sensor }) => sensor.status === 'out_of_range').length],
              ].filter(([, count]) => count > 0).map(([statusKey, count]) => (
                <span
                  key={statusKey}
                  className={`rounded-full px-2.5 py-1 ${sensorStatuses[statusKey].className}`}
                >
                  {count} {sensorStatuses[statusKey].label.toLowerCase()}
                </span>
              ))}
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {sensors.length} {sensors.length === 1 ? 'sensor' : 'sensores'}
              </span>
            </div>
          </div>
          {sensors.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              Este centro no tiene sensores asociados.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
              {sensors.map(({ sensor, index }) => {
                const sensorId = sensor.id ?? sensor._id
                const status = sensorStatuses[sensor.status] || {
                  label: 'Desconocido',
                  className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                }

                return (
                  <li
                    key={sensorId ?? `${sensor.name}-${index}`}
                    className={`flex flex-col gap-2 border-l-4 p-3 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                      sensor.status === 'no_data'
                        ? 'border-l-rose-500 bg-rose-50/70 dark:bg-rose-950/20'
                        : sensor.status === 'out_of_range'
                          ? 'border-l-amber-500 bg-amber-50/60 dark:bg-amber-950/15'
                          : 'border-l-transparent bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`truncate font-semibold ${sensor.status === 'no_data' ? 'text-rose-900 dark:text-rose-200' : ''}`}>
                        {sensor.name || sensor.code || 'Sensor sin nombre'}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {sensor.type || 'Sensor'}{sensor.code ? ` · ${sensor.code}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                        {status.label}
                      </span>
                      <button
                        type="button"
                        disabled={sensorId == null || getSiteId(site) == null}
                        onClick={() => startSensorIntervention(sensorId)}
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
