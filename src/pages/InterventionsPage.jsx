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

const suggestionsByStatus = {
  no_data: 'Se debe revisar la alimentación eléctrica, la conexión y la transmisión de datos del sensor.',
  out_of_range: 'Se debe verificar la lectura en terreno, inspeccionar el sensor y calibrarlo si corresponde.',
  ok: 'Se solicita realizar una inspección preventiva y confirmar que el sensor y sus conexiones estén en buen estado.',
  unknown: 'Se debe inspeccionar el sensor y confirmar su estado y comunicación con el sistema.',
}

const formatDateTime = (value) =>
  new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

const getStatusLabel = (status) => statusLabels[status] || statusLabels.unknown

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
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [targetType, setTargetType] = useState(
    initialSelection.targetType === 'sensor' ? 'sensor' : 'site',
  )
  const [siteId, setSiteId] = useState(String(initialSelection.siteId ?? ''))
  const [sensorId, setSensorId] = useState(String(initialSelection.sensorId ?? ''))
  const [senderName, setSenderName] = useState('')
  const [senderRole, setSenderRole] = useState('')
  const [suggestedAction, setSuggestedAction] = useState('')
  const [message, setMessage] = useState('')
  const [savedNotice, setSavedNotice] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [zoneFilter, setZoneFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [formOpen, setFormOpen] = useState(Boolean(initialSelection.targetType))

  useEffect(() => {
    setCurrentTime(Date.now())
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
    const dialog = formDialogRef.current
    if (!dialog) return

    if (formOpen && !dialog.open) dialog.showModal()
    if (!formOpen && dialog.open) dialog.close()
  }, [formOpen, loading])

  useEffect(() => {
    let active = true

    const loadData = async () => {
      try {
        // TODO (Backend Integration): Al conectar el backend real, interventionService.getInterventions()
        // debe ser invocado asíncronamente contra GET /interventions
        const [siteList, savedInterventions] = await Promise.all([
          siteService.getSites(),
          Promise.resolve(interventionService.getInterventions()),
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
          setInterventions(savedInterventions)
          setSiteId((current) => current || String(getSiteId(sitesWithSensors[0]) ?? ''))
        }
      } catch (error) {
        console.error('Error al cargar los datos de intervenciones:', error)
        if (active) {
          if (isNotFoundError(error)) setNotFound(true)
          else setLoadError('No fue posible cargar centros, sensores o intervenciones guardadas. Intenta nuevamente.')
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

  const statusSuggestion = useMemo(() => {
    if (targetType === 'site') {
      const problemStatuses = ['no_data', 'out_of_range']
        .filter((status) => sensors.some((sensor) => sensor.status === status))
      const statuses = problemStatuses.length ? problemStatuses : [targetStatus]
      return [...new Set(statuses.map((status) => suggestionsByStatus[status]))].join('\n')
    }
    return suggestionsByStatus[targetStatus]
  }, [sensors, targetStatus, targetType])

  useEffect(() => {
    if (!editingId) setSuggestedAction(statusSuggestion)
  }, [editingId, statusSuggestion])

  const targetLabel = targetType === 'sensor'
    ? selectedSensor?.name || `Sensor ${sensorId}`
    : selectedSite?.name || 'Centro de cultivo'
  const nowText = formatDateTime(new Date().toISOString())
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
    const filtered = interventions.filter((intervention) => {
      const status = statusLabels[intervention.sensorStatus] ? intervention.sensorStatus : 'unknown'
      const zone = intervention.zone || siteAreas.get(String(intervention.siteId)) || 'Sin zona'
      const matchesStatus = statusFilter === 'all' || status === statusFilter
      const matchesZone = zoneFilter === 'all' || zone === zoneFilter
      const age = currentTime - new Date(intervention.createdAt).getTime()
      const matchesTime = timeFilter === 'all' ||
        (currentTime > 0 && Number.isFinite(age) && age >= 0 && age <= timeFilterDurations[timeFilter])
      const searchContent = [
        intervention.siteName,
        intervention.sensorName,
        intervention.senderName,
        intervention.senderRole,
        intervention.message,
        intervention.suggestedAction,
        zone,
      ].filter(Boolean).join(' ').toLocaleLowerCase('es-CL')
      const matchesSearch = !normalizedSearch || searchContent.includes(normalizedSearch)
      return matchesStatus && matchesZone && matchesTime && matchesSearch
    })

    return filtered.sort((left, right) => {
      const leftStatus = statusPriority[left.sensorStatus] ?? statusPriority.unknown
      const rightStatus = statusPriority[right.sensorStatus] ?? statusPriority.unknown
      return leftStatus - rightStatus ||
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    })
  }, [currentTime, interventions, searchTerm, siteAreas, statusFilter, timeFilter, zoneFilter])

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setZoneFilter('all')
    setTimeFilter('all')
  }

  const handleTargetTypeChange = (nextType) => {
    setTargetType(nextType)
    setSensorId('')
  }

  const startEditing = (intervention) => {
    if (!window.confirm(`¿Quieres editar la intervención para ${intervention.siteName}?`)) return

    setFormOpen(true)
    setEditingId(intervention.id)
    setTargetType(intervention.targetType)
    setSiteId(intervention.siteId)
    setSensorId(intervention.sensorId || '')
    setSenderName(intervention.senderName)
    setSenderRole(intervention.senderRole)
    setSuggestedAction(intervention.suggestedAction)
    setMessage(intervention.message)
    setSaveError('')
    setSavedNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEditing = () => {
    setFormOpen(false)
    setEditingId(null)
    setSenderName('')
    setSenderRole('')
    setMessage('')
    setSaveError('')
    setSavedNotice('')
    setTargetType('site')
    setSensorId('')
  }

  // TODO (Backend Integration): La API FastAPI en https://ulamonitors-uat-back.grye.org/docs
  // no expone DELETE /interventions. Este flujo debe reemplazarse por la acción de "Cerrar / Resolver"
  // mediante PATCH /interventions/{id} con outcome ('back_online'|'replaced'|'reconfigured'|'no_fault_found').
  const handleDelete = (intervention) => {
    if (!window.confirm(`¿Estás seguro de eliminar la intervención para ${intervention.siteName}? Esta acción no se puede deshacer.`)) return

    try {
      setInterventions(interventionService.deleteIntervention(intervention.id))
      if (editingId === intervention.id) cancelEditing()
    } catch (error) {
      console.error('Error al eliminar la intervención local:', error)
      setSaveError('No se pudo eliminar la intervención. Intenta nuevamente.')
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setSaveError('')
    setSavedNotice('')

    if (!selectedSite || (targetType === 'sensor' && !selectedSensor)) {
      setSaveError('Selecciona el centro y el sensor que requieren la intervención.')
      return
    }

    try {
      // TODO (Backend Integration): Para POST /interventions el esquema requerido es:
      // {
      //   site_id: Number(selectedSite.id),
      //   sensor_id: targetType === 'sensor' ? Number(selectedSensor.id ?? selectedSensor._id) : null,
      //   reason: `${suggestedAction ? suggestedAction + ' - ' : ''}${message}`.trim()
      // }
      // Nota: 'senderName' y 'senderRole' no se envían; el backend asigna 'opened_by' desde el token JWT.
      const interventionData = {
        senderName: senderName.trim(),
        senderRole: senderRole.trim(),
        targetType,
        siteId: String(selectedSite.id),
        siteName: selectedSite.name || `Centro ${selectedSite.id}`,
        zone: getSiteArea(selectedSite) || 'Sin zona',
        sensorId: targetType === 'sensor' ? String(selectedSensor.id ?? selectedSensor._id) : null,
        sensorName: targetType === 'sensor' ? targetLabel : null,
        sensorStatus: targetStatus,
        suggestedAction: suggestedAction.trim(),
        message: message.trim(),
        status: 'pending',
      }

      if (editingId) {
        if (!window.confirm('¿Confirmas guardar los cambios de esta intervención?')) return
        const updated = interventionService.updateIntervention(editingId, interventionData)
        setInterventions((current) =>
          current.map((intervention) => intervention.id === editingId ? updated : intervention),
        )
        setCurrentTime(Date.now())
        setEditingId(null)
        setSenderName('')
        setSenderRole('')
        setSuggestedAction('')
        setMessage('')
        setSavedNotice('Cambios de la intervención guardados.')
        setFormOpen(false)
        return
      }

      const saved = interventionService.createIntervention(interventionData)
      setInterventions((current) => [saved, ...current])
      setCurrentTime(Date.now())
      setMessage('')
      setSavedNotice('Intervención guardada.')
      setFormOpen(false)
    } catch (error) {
      console.error('Error al guardar la intervención local:', error)
      setSaveError('No se pudo guardar la intervención. Revisa el espacio disponible e inténtalo nuevamente.')
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
          <dialog
            ref={formDialogRef}
            onClose={() => setFormOpen(false)}
            aria-labelledby="intervention-form-title"
            className="m-auto max-h-[92vh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-left text-slate-900 shadow-2xl backdrop:bg-slate-950/60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          >
          <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                <ClipboardCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">
                  <span id="intervention-form-title">
                  {editingId ? 'Editar intervención' : 'Nueva intervención'}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">La fecha y hora se registran automáticamente.</p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Cerrar formulario"
                className="ml-auto rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Nombre de quien solicita
                <input required value={senderName} onChange={(event) => setSenderName(event.target.value)} maxLength={100} autoComplete="name" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Cargo
                <input required value={senderRole} onChange={(event) => setSenderRole(event.target.value)} maxLength={100} placeholder="Ej.: Operador de monitoreo" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </label>
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
              Revisión sugerida según el estado
              <textarea required value={suggestedAction} onChange={(event) => setSuggestedAction(event.target.value)} rows={3} maxLength={1000} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">Se completa automáticamente según el estado y puedes editarla.</span>
            </label>

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Indicaciones adicionales para el técnico
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} maxLength={2000} placeholder="Describe qué debe revisar, dónde acudir o cualquier detalle útil..." className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </label>

            {saveError && <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">{saveError}</p>}
            {savedNotice && <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status">{savedNotice}</p>}
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancelar edición
                </button>
              )}
              <button type="submit" className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900">
                {editingId ? 'Guardar cambios' : 'Guardar intervención'}
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
                  {visibleInterventions.length} de {interventions.length} solicitudes
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setSenderName('')
                    setSenderRole('')
                    setMessage('')
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
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-[minmax(13rem,2fr)_repeat(3,minmax(9rem,1fr))_auto] dark:border-slate-800 dark:bg-slate-900">
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
                Estado
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="all">Todos los estados</option>
                  <option value="no_data">Desconectado</option>
                  <option value="out_of_range">Fuera de rango</option>
                  <option value="ok">En línea</option>
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
                  disabled={!searchTerm && statusFilter === 'all' && zoneFilter === 'all' && timeFilter === 'all'}
                  className="w-full whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
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
                        <button
                          type="button"
                          onClick={() => startEditing(intervention)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(intervention)}
                          className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40"
                        >
                          Eliminar
                        </button>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">Pendiente</span>
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
                    <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">{intervention.suggestedAction}</p>
                    {intervention.message && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{intervention.message}</p>}
                    <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      Solicitó {intervention.senderName} · {intervention.senderRole}
                    </p>
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
