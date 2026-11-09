import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Building, ClipboardCheck, Radio, Search, X } from '../components/Common/Icons'
import { getSiteArea, getSiteId, siteService } from '../services/siteService'
import { interventionService } from '../services/interventionService'
import { isNotFoundError } from '../api/client'
import NotFoundPage from '../components/NotFoundPage'

const statusLabels = {
  ok: 'En línea',
  out_of_range: 'Fuera de rango',
  no_data: 'Desconectado',
  unknown: 'Desconocido',
}

const interventionStatusLabels = {
  open: 'Abierta',
  closed: 'Cerrada',
}

const statusPriority = {
  no_data: 0,
  out_of_range: 1,
  ok: 2,
  unknown: 3,
}

const statusColors = {
  ok: 'bg-emerald-500',
  out_of_range: 'bg-amber-500',
  no_data: 'bg-rose-500',
  unknown: 'bg-slate-400',
}

const statusBadgeColors = {
  ok: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  out_of_range: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  no_data: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  unknown: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

const statusBorderColors = {
  ok: 'border-emerald-400 dark:border-emerald-700',
  out_of_range: 'border-amber-400 dark:border-amber-700',
  no_data: 'border-rose-400 dark:border-rose-700',
  unknown: 'border-slate-400 dark:border-slate-600',
}

const formatDateTime = (value) => {
  const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  if (!match) return value ? String(value) : 'Fecha no disponible'
  const [, year, month, day, hour, minute] = match

  return `${day}/${month}/${year} ${hour}:${minute}`
}

const getChileWallTime = (value) => {
  const dateTime = String(value ?? '')
  const match = dateTime.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!match) return Number.NaN
  const [, year, month, day, hour, minute, second = '0'] = match

  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(dateTime)) {
    const timestamp = Date.parse(dateTime)
    if (!Number.isFinite(timestamp)) return Number.NaN
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(timestamp))
    const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]))
    return Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second),
    )
  }

  return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))
}

const getCurrentChileWallTime = () => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))

  return Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  )
}

const formatCurrentChileDateTime = () =>
  new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Santiago',
  }).format(new Date())

const getStatusLabel = (status) => statusLabels[status] || statusLabels.unknown

const enrichInterventions = (interventions, sites) => {
  const sitesById = new Map(sites.map((site) => [String(site.id), site]))

  return interventions.map((intervention) => {
    const site = sitesById.get(String(intervention.siteId))
    const sensor = site?.sensors.find(
      (item) => String(item.id ?? item._id) === String(intervention.sensorId),
    )

    return {
      ...intervention,
      siteName: intervention.siteName || site?.name || `Centro ${intervention.siteId}`,
      zone: intervention.zone || getSiteArea(site) || 'Sin zona',
      sensorName: intervention.sensorName || sensor?.name || '',
      sensorStatus: sensor?.status || 'unknown',
      description: intervention.reason ||
        [intervention.suggestedAction, intervention.message].filter(Boolean).join('\n\n'),
    }
  })
}

const getCenterStatus = (sensors = []) => {
  if (sensors.some((sensor) => sensor.status === 'no_data')) return 'no_data'
  if (sensors.some((sensor) => sensor.status === 'out_of_range')) return 'out_of_range'
  if (sensors.length && sensors.every((sensor) => sensor.status === 'ok')) return 'ok'
  return 'unknown'
}

export default function InterventionsPage() {
  const location = useLocation()
  const formDialogRef = useRef(null)
  const initialSelection = location.state || {}
  const [sites, setSites] = useState([])
  const [interventions, setInterventions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [targetType, setTargetType] = useState(
    initialSelection.targetType === 'sensor' ? 'sensor' : 'site',
  )
  const [siteId, setSiteId] = useState(String(initialSelection.siteId ?? ''))
  const [sensorId, setSensorId] = useState(String(initialSelection.sensorId ?? ''))
  const [description, setDescription] = useState('')
  const [savedNotice, setSavedNotice] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [zoneFilter, setZoneFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [fromDateTime, setFromDateTime] = useState('')
  const [toDateTime, setToDateTime] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [formOpen, setFormOpen] = useState(Boolean(initialSelection.targetType))

  useEffect(() => {
    setCurrentTime(getCurrentChileWallTime())
  }, [])

  useEffect(() => {
    const selection = location.state
    if (!selection?.openForm) return

    if (selection.targetType === 'site' || selection.targetType === 'sensor') {
      setTargetType(selection.targetType)
      setSiteId(String(selection.siteId ?? ''))
      setSensorId(String(selection.sensorId ?? ''))
      setFormOpen(true)
    }
  }, [location.key, location.state])

  useEffect(() => {
    if (!formOpen) return undefined

    const root = document.documentElement
    const previousOverflow = root.style.overflow
    const previousBodyPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - root.clientWidth
    const bodyPaddingRight = Number.parseFloat(window.getComputedStyle(document.body).paddingRight) || 0

    root.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${bodyPaddingRight + scrollbarWidth}px`
    }

    return () => {
      root.style.overflow = previousOverflow
      document.body.style.paddingRight = previousBodyPaddingRight
    }
  }, [formOpen])

  useEffect(() => {
    const dialog = formDialogRef.current
    if (!dialog) return

    if (formOpen && !dialog.open) dialog.showModal()
    if (!formOpen && dialog.open) dialog.close()
  }, [formOpen, loading])

  useEffect(() => {
    let active = true

    const loadData = async () => {
      try {
        const [siteList, savedInterventions] = await Promise.all([
          siteService.getSites(),
          interventionService.getInterventions(),
        ])
        const sitesWithSensors = await Promise.all(
          siteList.map(async (site) => {
            const id = getSiteId(site)
            const sensors = id == null ? [] : await siteService.getSensorsBySite(id)
            return { ...site, id, sensors }
          }),
        )

        if (active) {
          setSites(sitesWithSensors)
          setInterventions(enrichInterventions(savedInterventions, sitesWithSensors))
          setSiteId((current) => current || String(getSiteId(sitesWithSensors[0]) ?? ''))
        }
      } catch (error) {
        console.error('Error al cargar los datos de intervenciones:', error)
        if (active) {
          if (isNotFoundError(error)) setNotFound(true)
          else setLoadError('No fue posible cargar centros, sensores o intervenciones. Intenta nuevamente.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()
    return () => {
      active = false
    }
  }, [])

  const selectedSite = sites.find((site) => String(site.id) === siteId)
  const sensors = useMemo(() => selectedSite?.sensors ?? [], [selectedSite])
  const selectedSensor = sensors.find((sensor) => String(sensor.id ?? sensor._id) === sensorId)
  const targetStatus = targetType === 'sensor'
    ? selectedSensor?.status || 'unknown'
    : getCenterStatus(sensors)
  const selectedSiteStatus = getCenterStatus(sensors)
  const statusClassName = statusBadgeColors[targetStatus] || statusBadgeColors.unknown
  const siteStatusClassName = statusBadgeColors[selectedSiteStatus] || statusBadgeColors.unknown

  const nowText = formatCurrentChileDateTime()
  const siteAreas = useMemo(
    () => new Map(sites.map((site) => [String(site.id), getSiteArea(site) || 'Sin zona'])),
    [sites],
  )
  const zones = useMemo(
    () => {
      const availableZones = sites.map((site) => getSiteArea(site)).filter(Boolean)
      const hasUnassignedZone = interventions.some((intervention) =>
        !(intervention.zone || siteAreas.get(String(intervention.siteId))),
      )
      if (hasUnassignedZone) availableZones.push('Sin zona')
      return [...new Set(availableZones)].sort((a, b) => a.localeCompare(b, 'es'))
    },
    [interventions, siteAreas, sites],
  )
  const visibleInterventions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es-CL')
    const timeFilterDurations = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    }
    const fromTimestamp = fromDateTime ? getChileWallTime(fromDateTime) : null
    const toTimestamp = toDateTime ? getChileWallTime(toDateTime) + 60 * 1000 - 1 : null
    const validDateRange = fromTimestamp == null || toTimestamp == null || fromTimestamp <= toTimestamp
    const filtered = interventions.filter((intervention) => {
      const status = intervention.status || 'open'
      const zone = intervention.zone || siteAreas.get(String(intervention.siteId)) || 'Sin zona'
      const matchesStatus = statusFilter === 'all' || status === statusFilter
      const matchesZone = zoneFilter === 'all' || zone === zoneFilter
      const age = currentTime - getChileWallTime(intervention.createdAt)
      const matchesTime = timeFilter === 'all' ||
        (currentTime > 0 && Number.isFinite(age) && age >= 0 && age <= timeFilterDurations[timeFilter])
      const createdAt = getChileWallTime(intervention.createdAt)
      const matchesDateTime = validDateRange &&
        (fromTimestamp == null || (Number.isFinite(createdAt) && createdAt >= fromTimestamp)) &&
        (toTimestamp == null || (Number.isFinite(createdAt) && createdAt <= toTimestamp))
      const searchContent = [
        intervention.siteName,
        intervention.sensorName,
        intervention.senderName,
        intervention.senderRole,
        intervention.description,
        intervention.message,
        intervention.suggestedAction,
        zone,
      ].filter(Boolean).join(' ').toLocaleLowerCase('es-CL')
      const matchesSearch = !normalizedSearch || searchContent.includes(normalizedSearch)
      return matchesStatus && matchesZone && matchesTime && matchesDateTime && matchesSearch
    })

    return filtered.sort((left, right) => {
      const leftStatus = statusPriority[left.sensorStatus] ?? statusPriority.unknown
      const rightStatus = statusPriority[right.sensorStatus] ?? statusPriority.unknown
      return leftStatus - rightStatus ||
        getChileWallTime(right.createdAt) - getChileWallTime(left.createdAt)
    })
  }, [currentTime, fromDateTime, interventions, searchTerm, siteAreas, statusFilter, timeFilter, toDateTime, zoneFilter])

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setZoneFilter('all')
    setTimeFilter('all')
    setFromDateTime('')
    setToDateTime('')
  }

  const hasInvalidDateRange = fromDateTime && toDateTime &&
    getChileWallTime(fromDateTime) > getChileWallTime(toDateTime)

  const handleTargetTypeChange = (nextType) => {
    setTargetType(nextType)
    setSensorId('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaveError('')
    setSavedNotice('')

    if (!selectedSite || (targetType === 'sensor' && !selectedSensor)) {
      setSaveError('Selecciona el centro y el sensor que requieren la intervención.')
      return
    }

    setSaving(true)
    try {
      await interventionService.createIntervention({
        siteId: selectedSite.id,
        sensorId: targetType === 'sensor' ? selectedSensor.id ?? selectedSensor._id : null,
        reason: description.trim(),
      })
      setCurrentTime(getCurrentChileWallTime())
      setDescription('')
      setSaveError('')
      setSavedNotice('Intervención abierta.')
      setFormOpen(false)
      try {
        const latest = await interventionService.getInterventions()
        setInterventions(enrichInterventions(latest, sites))
      } catch (error) {
        console.error('Error al actualizar el listado de intervenciones:', error)
        setSavedNotice('La intervención se abrió, pero no se pudo actualizar el listado.')
      }
    } catch (error) {
      console.error('Error al abrir la intervención:', error)
      setSaveError('No se pudo abrir la intervención. Intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  if (notFound) {
    return <NotFoundPage message="La API no encontró el endpoint de centros o sensores solicitado." />
  }

  if (loading) {
    return <div className="py-16 text-center text-slate-500 dark:text-slate-400" role="status">Cargando centros, sensores e intervenciones...</div>
  }

  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Operación en terreno</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">Intervenciones</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Crea y administra solicitudes de intervención para centros y sensores.
        </p>
      </header>

      {loadError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300" role="alert">
          {loadError}
        </div>
      ) : (
        <div>
          {savedNotice && (
            <p className="mb-4 text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status">
              {savedNotice}
            </p>
          )}
          <dialog
            ref={formDialogRef}
            onClose={() => setFormOpen(false)}
            aria-labelledby="intervention-form-title"
            className="m-auto max-h-[92vh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto overscroll-contain [scrollbar-gutter:stable] rounded-2xl border border-slate-200 bg-white p-0 text-left text-slate-900 shadow-2xl backdrop:bg-slate-950/60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          >
          <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                  <ClipboardCheck className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-bold text-slate-900 dark:text-white">
                    <span id="intervention-form-title">
                    Nueva intervención
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">La fecha y hora se registran automáticamente.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Cerrar formulario"
                className="ml-2 shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">¿Qué se debe revisar?</legend>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'site', label: 'Centro completo', Icon: Building },
                  { value: 'sensor', label: 'Un sensor', Icon: Radio },
                ].map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={targetType === value}
                    onClick={() => handleTargetTypeChange(value)}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                      targetType === value
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />{label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className={`grid gap-4 ${targetType === 'sensor' ? 'sm:grid-cols-2' : ''}`}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Centro
                <div className="mt-1.5">
                  <select
                    required
                    value={siteId}
                    onChange={(event) => {
                      setSiteId(event.target.value)
                      setSensorId('')
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="">Selecciona un centro</option>
                    {sites.map((site, index) => (
                      <option key={site.id ?? index} value={String(site.id)}>{site.name || `Centro ${site.id}`}</option>
                    ))}
                  </select>
                  {selectedSite && (
                    <span className={`mt-2 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${siteStatusClassName}`}>
                      <span className={`h-2 w-2 rounded-full ${statusColors[selectedSiteStatus] || statusColors.unknown}`} />
                      Estado del centro: {getStatusLabel(selectedSiteStatus)}
                    </span>
                  )}
                </div>
              </label>
              {targetType === 'sensor' && (
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Sensor
                  <div className="mt-1.5">
                    <select
                      required
                      value={sensorId}
                      onChange={(event) => setSensorId(event.target.value)}
                      disabled={!sensors.length}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    >
                      <option value="">{sensors.length ? 'Selecciona un sensor' : 'Sin sensores asociados'}</option>
                      {sensors.map((sensor, index) => (
                        <option key={sensor.id ?? sensor._id ?? index} value={String(sensor.id ?? sensor._id)}>
                          {sensor.name || sensor.code || `Sensor ${sensor.id ?? sensor._id}`} · {getStatusLabel(sensor.status)}
                        </option>
                      ))}
                    </select>
                    {selectedSensor && (
                      <span className={`mt-2 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName}`}>
                        <span className={`h-2 w-2 rounded-full ${statusColors[targetStatus] || statusColors.unknown}`} />
                        {getStatusLabel(targetStatus)}
                      </span>
                    )}
                  </div>
                </label>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Fecha y hora</p>
                <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{nowText}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Estado detectado</p>
                <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {targetType === 'sensor' && !selectedSensor ? 'Selecciona un sensor' : getStatusLabel(targetStatus)}
                </p>
              </div>
            </div>

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Descripción para el técnico
              <textarea required value={description} onChange={(event) => setDescription(event.target.value)} rows={5} maxLength={3000} placeholder="Describe qué debe revisar, dónde acudir y cualquier detalle útil en un solo texto..." className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </label>

            {saveError && <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">{saveError}</p>}
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button type="submit" disabled={saving} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-slate-900">
                {saving ? 'Abriendo...' : 'Abrir intervención'}
              </button>
            </div>
          </form>
          </dialog>

          <section className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Solicitudes guardadas</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400" aria-live="polite">
                  {visibleInterventions.length === interventions.length
                    ? `${interventions.length} solicitudes en total`
                    : `Mostrando ${visibleInterventions.length} de ${interventions.length} solicitudes`}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDescription('')
                    setSaveError('')
                    setSavedNotice('')
                    setFormOpen(true)
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Nueva intervención
                </button>
              </div>
            </div>
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-[minmax(13rem,2fr)_repeat(5,minmax(9rem,1fr))_auto] dark:border-slate-800 dark:bg-slate-900">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 sm:col-span-2 xl:col-span-1">
                Buscar
                <span className="relative mt-1.5 block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Centro, sensor, zona o mensaje..."
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </span>
              </label>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Hora
                <select
                  value={timeFilter}
                  onChange={(event) => setTimeFilter(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="all">Cualquier fecha</option>
                  <option value="hour">Última hora</option>
                  <option value="day">Últimas 24 horas</option>
                  <option value="week">Últimos 7 días</option>
                  <option value="month">Últimos 30 días</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Desde (fecha y hora)
                <input
                  type="datetime-local"
                  value={fromDateTime}
                  max={toDateTime || undefined}
                  onChange={(event) => setFromDateTime(event.target.value)}
                  className="mt-1.5 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Hasta (fecha y hora)
                <input
                  type="datetime-local"
                  value={toDateTime}
                  min={fromDateTime || undefined}
                  onChange={(event) => setToDateTime(event.target.value)}
                  className="mt-1.5 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Estado
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="all">Todos los estados</option>
                  <option value="open">Abiertas</option>
                  <option value="closed">Cerradas</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Zona
                <select
                  value={zoneFilter}
                  onChange={(event) => setZoneFilter(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="all">Todas las zonas</option>
                  {zones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
                </select>
              </label>
              <div className="flex items-end sm:col-span-2 xl:col-span-1">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!searchTerm && statusFilter === 'all' && zoneFilter === 'all' && timeFilter === 'all' && !fromDateTime && !toDateTime}
                  className="w-full whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
            {hasInvalidDateRange && (
              <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">
                La fecha y hora «Desde» debe ser anterior o igual a «Hasta».
              </p>
            )}
            {visibleInterventions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                <ClipboardCheck className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {interventions.length ? 'No hay solicitudes que coincidan con estos filtros.' : 'Todavía no hay intervenciones.'}
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {visibleInterventions.map((intervention) => (
                  <li
                    key={intervention.id}
                    className={`rounded-2xl border-2 bg-white p-4 shadow-sm dark:bg-slate-900 ${
                      statusBorderColors[intervention.sensorStatus] || statusBorderColors.unknown
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{intervention.siteName}</p>
                        {intervention.sensorName && <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{intervention.sensorName}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          intervention.status === 'closed'
                            ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                        }`}>
                          {interventionStatusLabels[intervention.status] || 'Abierta'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(intervention.createdAt)}</p>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {intervention.zone || siteAreas.get(String(intervention.siteId)) || 'Sin zona'}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeColors[intervention.sensorStatus] || statusBadgeColors.unknown}`}>
                        {getStatusLabel(intervention.sensorStatus)}
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm font-medium text-slate-700 dark:text-slate-200">{intervention.description}</p>
                    {intervention.senderName && (
                      <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        Solicitó {intervention.senderName}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </section>
  )
}
