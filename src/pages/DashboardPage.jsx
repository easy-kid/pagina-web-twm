import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  Radio,
  ChevronLeft,
  ChevronRight,
  Search,
  ClipboardCheck,
  LineChart,
  RefreshCw,
} from '../components/Common/Icons'
import { sensorService, formatChileDateTime } from '../services/sensorService'
import { getSiteId, siteService } from '../services/siteService'

// Prioridad de severidad para ordenamiento en tabla: De grave a óptimo
// 0: no_data (desconectado)
// 1: out_of_range (fuera de rango)
// 2: ok (operativo / óptimo)
// 3: unknown (desconocido)
const statusPriority = {
  no_data: 0,
  out_of_range: 1,
  ok: 2,
  unknown: 3,
}

export default function DashboardPage() {
  const navigate = useNavigate()

  // 1. Estados de métricas del dashboard (combinadas en frontend)
  const [metrics, setMetrics] = useState({
    total: 0,
    offlineCount: 0,
    outOfRangeCount: 0,
    normalCount: 0,
    unknownCount: 0,
  })
  const [metricsError, setMetricsError] = useState('')

  // 2. Estados de centros de cultivo (para nombres y selector de filtro)
  const [siteNames, setSiteNames] = useState({})
  const [sitesList, setSitesList] = useState([])

  // 3. Estados de la tabla de sensores
  const [sensors, setSensors] = useState([])
  const [loadingSensors, setLoadingSensors] = useState(true)
  const [sensorError, setSensorError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // 4. Estados de filtros y paginación
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'out_of_range' | 'no_data' | 'ok'
  const [siteFilter, setSiteFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Carga inicial de centros de cultivo
  useEffect(() => {
    let active = true

    const loadSites = async () => {
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
        console.error('Error al cargar centros:', error)
      }
    }

    loadSites()
    return () => {
      active = false
    }
  }, [])

  // Carga de métricas ejecutivas (resumen construido combinando peticiones)
  const loadMetrics = useCallback(async () => {
    try {
      const data = await sensorService.getDashboardMetrics()
      setMetrics(data)
      setMetricsError('')
    } catch (err) {
      console.error('Error al cargar métricas:', err)
      setMetricsError('No fue posible cargar las métricas de sensores.')
    }
  }, [])

  // Carga de sensores según los filtros activos (trae el conjunto para ordenamiento global por gravedad)
  const loadSensors = useCallback(async () => {
    setLoadingSensors(true)
    setSensorError('')

    try {
      const params = {
        page: 1,
        page_size: 100,
      }
      if (statusFilter !== 'all') params.status = statusFilter
      if (siteFilter !== 'all') params.site_id = siteFilter

      const { items } = await sensorService.getSensors(params)
      setSensors(items)
    } catch (err) {
      console.error('Error al cargar sensores:', err)
      setSensorError('No fue posible cargar los sensores. Por favor intente nuevamente.')
    } finally {
      setLoadingSensors(false)
    }
  }, [statusFilter, siteFilter])

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  useEffect(() => {
    loadSensors()
  }, [loadSensors])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([loadMetrics(), loadSensors()])
    } finally {
      setRefreshing(false)
    }
  }

  // Filtrado y ordenamiento de sensores: siempre de más grave a óptimo
  const sortedAndFilteredSensors = useMemo(() => {
    return sensors
      .filter((s) => {
        if (!searchTerm.trim()) return true
        const term = searchTerm.toLowerCase().trim()
        const sensorName = (s.name || '').toLowerCase()
        const siteName = (siteNames[String(s.site_id)] || '').toLowerCase()

        return sensorName.includes(term) || siteName.includes(term)
      })
      .sort((a, b) => {
        const priorityA = statusPriority[a.status] ?? 3
        const priorityB = statusPriority[b.status] ?? 3
        if (priorityA !== priorityB) {
          return priorityA - priorityB
        }
        return (Number(a.id) || 0) - (Number(b.id) || 0)
      })
  }, [sensors, searchTerm, siteNames])

  const totalPages = Math.max(1, Math.ceil(sortedAndFilteredSensors.length / pageSize))

  // Paginación sobre el conjunto ordenado por gravedad
  const displayedSensors = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return sortedAndFilteredSensors.slice(startIndex, startIndex + pageSize)
  }, [sortedAndFilteredSensors, page, pageSize])

  return (
    <div className="space-y-7">
      {/* Encabezado Principal */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Panel de Control
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Monitoreo en tiempo real de telemetría de oxígeno y estado operativo de sensores.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loadingSensors}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar Datos</span>
          </button>
        </div>
      </header>

      {/* Tarjetas de Métricas KPI */}
      {metricsError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300" role="alert">
          {metricsError}{' '}
          <button type="button" onClick={loadMetrics} className="font-semibold underline underline-offset-2">
            Reintentar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            id: 'no_data',
            label: 'Desconectado',
            count: metrics.offlineCount,
            icon: WifiOff,
            subtext: 'Inactivos (>90 min)',
            textColor: 'text-rose-600 dark:text-rose-400',
            iconBox: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
          },
          {
            id: 'out_of_range',
            label: 'Fuera de Rango',
            count: metrics.outOfRangeCount,
            icon: AlertTriangle,
            subtext: 'Oxígeno anómalo',
            textColor: 'text-amber-600 dark:text-amber-400',
            iconBox: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
          },
          {
            id: 'ok',
            label: 'Operativos',
            count: metrics.normalCount,
            icon: CheckCircle2,
            subtext: 'Transmitiendo normal',
            textColor: 'text-emerald-600 dark:text-emerald-400',
            iconBox: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
          },
          {
            id: 'all',
            label: 'Total Sensores',
            count: metrics.total,
            icon: Radio,
            subtext: metrics.unknownCount > 0 ? `${metrics.unknownCount} sin estado registrado` : 'Total general en el sistema',
            textColor: 'text-blue-600 dark:text-blue-400',
            iconBox: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
          },
        ].map((card) => {
          const Icon = card.icon

          return (
            <div
              key={card.id}
              className="p-5 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-xs transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {card.label}
                  </p>
                  <h3 className={`text-3xl font-extrabold mt-1.5 ${card.textColor}`}>
                    {card.count}
                  </h3>
                </div>
                <div className={`p-2.5 rounded-xl ${card.iconBox}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className={`text-xs mt-3 font-medium ${card.textColor}`}>
                {card.subtext}
              </p>
            </div>
          )
        })}
      </div>

      {/* Tabla Interactiva de Sensores */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-colors">
        {/* Cabecera y Controles de Filtro */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {statusFilter === 'all' && 'Listado General de Sensores'}
              {statusFilter === 'out_of_range' && 'Sensores Fuera de Rango (Alerta)'}
              {statusFilter === 'no_data' && 'Sensores Desconectados'}
              {statusFilter === 'ok' && 'Sensores Operativos'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Filtre por estado, centro de cultivo o busque por nombre
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap">
            {/* Buscador */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Buscar sensor o centro..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('')
                    setPage(1)
                  }}
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

            {/* Selector de Estado (ordenado de grave a óptimo) */}
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
              <option value="no_data">Desconectados</option>
              <option value="out_of_range">Fuera de Rango</option>
              <option value="ok">Operativos</option>
            </select>
          </div>
        </div>

        {/* Mensaje de error al cargar sensores */}
        {sensorError && (
          <div className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300" role="alert">
            {sensorError}{' '}
            <button type="button" onClick={loadSensors} className="font-semibold underline underline-offset-2">
              Reintentar
            </button>
          </div>
        )}

        {/* Cuerpo de la Tabla */}
        {displayedSensors.length === 0 && !loadingSensors ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <p className="text-sm font-medium">
              {sensorError ? 'No fue posible mostrar los sensores.' : 'No se encontraron sensores para este criterio.'}
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
                  <th className="py-3 px-4 text-right">
                    <div className="flex justify-end">
                      <span className="w-28 text-left">Acciones</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayedSensors.map((sensor) => (
                  <tr key={sensor.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {sensor.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <button
                        type="button"
                        onClick={() => navigate(`/sites/${sensor.site_id}`)}
                        className="text-left font-medium hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
                      >
                        {siteNames[String(sensor.site_id)] || (
                          sitesList.length === 0 ? (
                            <span className="inline-block h-3 w-20 bg-slate-200 dark:bg-slate-700/80 rounded animate-pulse align-middle" />
                          ) : (
                            `Centro ${sensor.site_id}`
                          )
                        )}
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
                      <div className="flex flex-col items-end gap-1.5">
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
                          className="inline-flex items-center justify-center gap-1.5 w-28 px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 border border-blue-600 hover:border-blue-700 rounded-lg shadow-xs transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>Intervenir</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/sensors/${sensor.id}`)}
                          className="inline-flex items-center justify-center gap-1.5 w-28 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200/60 dark:border-blue-800/50 rounded-lg transition cursor-pointer"
                        >
                          <LineChart className="w-3.5 h-3.5 shrink-0" />
                          <span>Ver Gráfico</span>
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
              <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong> ({sortedAndFilteredSensors.length} sensores)
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
