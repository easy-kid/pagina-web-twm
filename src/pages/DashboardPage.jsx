import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Radio,
  ChevronLeft,
  ChevronRight,
  Search,
  ClipboardCheck,
} from '../components/Common/Icons'
import { sensorService, formatChileDateTime } from '../services/sensorService'
import { getSiteId, siteService } from '../services/siteService'
import NotFoundPage from '../components/NotFoundPage'
import { isNotFoundError } from '../api/client'

export default function DashboardPage() {
  const navigate = useNavigate()
  const cacheRef = useRef(new Map())

  // Métricas del sistema calculadas combinando rutas
  const [metrics, setMetrics] = useState({
    total: 0,
    offlineCount: 0,
    outOfRangeCount: 0,
    normalCount: 0,
    unknownCount: 0,
  })

  // Lista de sensores y filtro
  const [sensors, setSensors] = useState([])
  const [siteNames, setSiteNames] = useState({})
  const [sitesList, setSitesList] = useState([])
  const [siteNamesError, setSiteNamesError] = useState(false)
  const [loadingSensors, setLoadingSensors] = useState(true)
  const [sensorError, setSensorError] = useState('')
  const [metricsError, setMetricsError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'out_of_range' | 'no_data' | 'ok'
  const [siteFilter, setSiteFilter] = useState('all') // 'all' | siteId
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalSensorsCount, setTotalSensorsCount] = useState(0)
  const [pageSize] = useState(10)

  useEffect(() => {
    let active = true

    const loadSiteNames = async () => {
      try {
        const sites = await siteService.getSites()
        const validSites = sites.filter((site) => getSiteId(site) != null && site.name)
        const namesById = Object.fromEntries(
          validSites.map((site) => [String(getSiteId(site)), site.name]),
        )
        if (active) {
          setSiteNames(namesById)
          setSitesList(validSites)
        }
      } catch (error) {
        console.error('Error al cargar los nombres de los centros:', error)
        if (active) setSiteNamesError(true)
      }
    }

    loadSiteNames()
    return () => {
      active = false
    }
  }, [])

  // Cargar métricas ejecutivas
  const loadMetrics = useCallback(async () => {
    try {
      const data = await sensorService.getDashboardMetrics()
      setMetrics(data)
      setMetricsError('')
    } catch (err) {
      console.error('Error al cargar métricas:', err)
      if (isNotFoundError(err)) setNotFound(true)
      else setMetricsError('No fue posible actualizar las métricas de sensores.')
    }
  }, [])

  // Cargar lista de sensores con filtro de estado, centro, paginación y caché en memoria
  const loadSensors = useCallback(async () => {
    const cacheKey = `${statusFilter}_${siteFilter}_${page}_${pageSize}`

    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey)
      setSensors(cached.items)
      setTotalSensorsCount(cached.totalCount)
      setLoadingSensors(false)
    } else {
      setLoadingSensors(true)
    }

    try {
      setSensorError('')
      const params = {
        page,
        page_size: pageSize,
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      if (siteFilter !== 'all') {
        params.site_id = siteFilter
      }

      const { items, meta } = await sensorService.getSensors(params)
      cacheRef.current.set(cacheKey, {
        items,
        totalCount: meta.totalCount || 0,
      })
      setSensors(items)
      setTotalSensorsCount(meta.totalCount || 0)
    } catch (err) {
      console.error('Error al cargar sensores:', err)
      if (isNotFoundError(err)) setNotFound(true)
      else setSensorError('No fue posible cargar los sensores.')
    } finally {
      setLoadingSensors(false)
    }
  }, [page, pageSize, statusFilter, siteFilter])

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  useEffect(() => {
    loadSensors()
  }, [loadSensors])

  const totalPages = Math.max(1, Math.ceil(totalSensorsCount / pageSize))

  // Búsqueda inteligente: filtra por nombre de sensor, nombre de centro, posición, profundidad o estado
  const displayedSensors = sensors.filter((s) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase().trim()
    const sensorName = (s.name || '').toLowerCase()
    const siteName = (siteNames[String(s.site_id)] || '').toLowerCase()
    const position = (s.position || '').toLowerCase()
    const depthStr = s.depth != null ? `${s.depth}m ${s.depth}` : ''
    const typeStr = (s.type || '').toLowerCase()
    const sensorId = String(s.id ?? '')
    const siteId = String(s.site_id ?? '')

    const statusMatch =
      ((term.includes('operat') || term === 'ok' || term.includes('normal')) && s.status === 'ok') ||
      ((term.includes('descon') || term.includes('off') || term.includes('inact') || term.includes('sin dat')) && s.status === 'no_data') ||
      ((term.includes('rango') || term.includes('alert') || term.includes('anom')) && s.status === 'out_of_range')

    return (
      sensorName.includes(term) ||
      siteName.includes(term) ||
      position.includes(term) ||
      depthStr.includes(term) ||
      typeStr.includes(term) ||
      sensorId.includes(term) ||
      siteId === term ||
      statusMatch
    )
  })

  const handleCardClick = (targetStatus) => {
    setStatusFilter(targetStatus)
    setPage(1)
  }

  const retrySensors = () => {
    cacheRef.current.delete(`${statusFilter}_${siteFilter}_${page}_${pageSize}`)
    loadSensors()
  }

  if (notFound) {
    return <NotFoundPage message="La API no encontró uno de los endpoints de sensores solicitados." />
  }

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Panel de Control Operacional
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Supervisión en tiempo real de los sensores de oxígeno disuelto en centros de cultivo
          </p>
          {siteNamesError && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300" role="status">
              No se pudieron cargar los nombres de los centros; se muestran sus IDs.
            </p>
          )}
        </div>
      </div>

      {/* Tarjetas de Resumen */}
      {metricsError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300" role="alert">
          {metricsError}{' '}
          <button type="button" onClick={loadMetrics} className="font-semibold underline underline-offset-2">
            Reintentar
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {[
          {
            id: 'no_data',
            label: 'Desconectado',
            count: metrics.offlineCount,
            icon: WifiOff,
            subtext: 'Inactivos (>90 min)',
            activeClass: 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20',
            textColor: 'text-rose-600 dark:text-rose-400',
            iconBox: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
          },
          {
            id: 'out_of_range',
            label: 'Fuera de Rango',
            count: metrics.outOfRangeCount,
            icon: AlertTriangle,
            subtext: 'Oxígeno anómalo',
            activeClass: 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20',
            textColor: 'text-amber-600 dark:text-amber-400',
            iconBox: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
          },
          {
            id: 'ok',
            label: 'Operativos',
            count: metrics.normalCount,
            icon: CheckCircle2,
            subtext: 'Transmitiendo normal',
            activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20',
            textColor: 'text-emerald-600 dark:text-emerald-400',
            iconBox: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
          },
          {
            id: 'all',
            label: 'Total Sensores',
            count: metrics.total,
            icon: Radio,
            subtext: `${metrics.unknownCount} sin estado · Ver todos los sensores`,
            activeClass: 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20',
            textColor: 'text-slate-900 dark:text-white',
            iconBox: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
          },
        ].map((card) => {
          const isSelected = statusFilter === card.id
          const Icon = card.icon

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleCardClick(card.id)}
              className={`text-left p-5 rounded-2xl border transition-colors duration-150 cursor-pointer relative overflow-hidden group ${
                isSelected
                  ? card.activeClass
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isSelected ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}`}>
                    {card.label}
                  </p>
                  <h3 className={`text-3xl font-extrabold mt-1.5 ${isSelected ? 'text-white' : card.textColor}`}>
                    {card.count}
                  </h3>
                </div>
                <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-white/20 text-white' : card.iconBox}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className={`text-xs mt-3 flex items-center gap-1 font-medium ${isSelected ? 'text-white/90' : card.textColor}`}>
                {card.subtext}
              </p>
            </button>
          )
        })}
      </div>

      {/* Tabla Interactiva de Sensores */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-colors">
        {/* Cabecera de la Tabla y Filtros */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {statusFilter === 'all' && 'Listado General de Sensores'}
              {statusFilter === 'out_of_range' && 'Sensores Fuera de Rango (Alerta)'}
              {statusFilter === 'no_data' && 'Sensores Desconectados'}
              {statusFilter === 'ok' && 'Sensores Operativos'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Mostrando sensores según el filtro seleccionado arriba
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap">
            {/* Buscador inteligente: nombre de sensor, centro, posición, estado */}
            <div className="relative min-w-[220px] flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por sensor, centro, posición..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Selector de Centro */}
            <select
              value={siteFilter}
              onChange={(e) => {
                setSiteFilter(e.target.value)
                setPage(1)
              }}
              aria-label="Filtrar por centro"
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Todos los centros</option>
              {sitesList.map((site) => {
                const sId = String(getSiteId(site))
                return (
                  <option key={sId} value={sId}>
                    {site.name || `Centro #${sId}`}
                  </option>
                )
              })}
            </select>

            {/* Selector de Estado */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              aria-label="Filtrar por estado"
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Todos los estados</option>
              <option value="ok">Operativos</option>
              <option value="out_of_range">Fuera de Rango</option>
              <option value="no_data">Desconectados</option>
            </select>
          </div>
        </div>

        {/* Tabla */}
        {sensorError && (
          <div className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300" role="alert">
            {sensorError}{' '}
            <button type="button" onClick={retrySensors} className="font-semibold underline underline-offset-2">
              Reintentar
            </button>
          </div>
        )}
        {displayedSensors.length === 0 && !loadingSensors ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <p className="text-sm font-medium">
              {sensorError ? 'No se pudieron cargar los sensores.' : 'No se encontraron sensores para este criterio.'}
            </p>
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity duration-150 ${loadingSensors ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Sensor</th>
                  <th className="py-3 px-4">Centro</th>
                  <th className="py-3 px-4">Posición / Prof.</th>
                  <th className="py-3 px-4">Rango Óptimo</th>
                  <th className="py-3 px-4">Última Actualización</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayedSensors.map((sensor) => (
                  <tr key={sensor.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      <div>{sensor.name}</div>
                      <div className="text-[11px] font-normal text-slate-400 dark:text-slate-500">ID: #{sensor.id}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <button
                        type="button"
                        onClick={() => navigate(`/sites/${sensor.site_id}`)}
                        className="text-left font-medium hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
                      >
                        {siteNames[String(sensor.site_id)] || `Centro ${sensor.site_id}`}
                        <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-500">
                          ID: {sensor.site_id}
                        </span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <span className="capitalize">{sensor.position || 'jaula'}</span>
                      {sensor.depth != null && ` (${sensor.depth}m)`}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {sensor.oxygen_min != null && sensor.oxygen_max != null
                        ? `${sensor.oxygen_min} - ${sensor.oxygen_max} mg/L`
                        : 'No def.'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {sensor.last_reading?.at ? (
                        <div>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {formatChileDateTime(sensor.last_reading.at)}
                          </span>
                          {sensor.last_reading.value != null && (
                            <span className="block text-[11px] text-slate-400 dark:text-slate-500">
                              {Number(sensor.last_reading.value).toFixed(2)} mg/L
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic">Sin registros</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {sensor.status === 'out_of_range' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3 text-amber-500" /> Fuera de Rango
                        </span>
                      ) : sensor.status === 'no_data' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full">
                          <WifiOff className="w-3 h-3 text-rose-500" /> Desconectado
                        </span>
                      ) : sensor.status === 'ok' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Operativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3 text-slate-500" /> Desconocido
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={sensor.site_id == null || sensor.id == null}
                          onClick={() => navigate('/interventions', {
                            state: {
                              openForm: true,
                              targetType: 'sensor',
                              siteId: String(sensor.site_id),
                              sensorId: String(sensor.id),
                            },
                          })}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-700 bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:border-blue-800 hover:bg-blue-700 hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          <span>Intervenir</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/sensors/${sensor.id}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition cursor-pointer"
                        >
                          <span>Ver Gráfico</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Página <strong className="text-slate-800 dark:text-slate-200">{page}</strong> de{' '}
              <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong> ({totalSensorsCount} sensores)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer text-slate-700 dark:text-slate-300"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer text-slate-700 dark:text-slate-300"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}