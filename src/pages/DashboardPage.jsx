import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  WifiOff,
  CheckCircle2,
  ArrowRight,
  Radio,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from '../components/Common/Icons'
import { sensorService, formatChileDateTime } from '../services/sensorService'

export default function DashboardPage() {
  const navigate = useNavigate()
  const cacheRef = useRef(new Map())

  // Métricas del sistema calculadas combinando rutas
  const [metrics, setMetrics] = useState({
    total: 0,
    offlineCount: 0,
    outOfRangeCount: 0,
    normalCount: 0,
  })

  // Lista de sensores y filtro
  const [sensors, setSensors] = useState([])
  const [loadingSensors, setLoadingSensors] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'out_of_range' | 'no_data' | 'ok'
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  // Cargar métricas ejecutivas
  const loadMetrics = useCallback(async () => {
    try {
      const data = await sensorService.getDashboardMetrics()
      setMetrics(data)
    } catch (err) {
      console.error('Error al cargar métricas:', err)
    }
  }, [])

  // Cargar totalidad de sensores según estado con caché en memoria para respuesta instantánea
  const loadSensors = useCallback(async () => {
    const cacheKey = statusFilter

    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey)
      setSensors(cached)
      setLoadingSensors(false)
    } else {
      setLoadingSensors(true)
    }

    try {
      const params = {}
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }

      const { items } = await sensorService.getAllSensors(params)
      cacheRef.current.set(cacheKey, items)
      setSensors(items)
    } catch (err) {
      console.error('Error al cargar sensores:', err)
    } finally {
      setLoadingSensors(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  useEffect(() => {
    loadSensors()
  }, [loadSensors])

  // Filtrado reactivo global multi-criterio (nombre, ID, centro, ubicación y estado)
  const filteredSensors = useMemo(() => {
    if (!searchTerm.trim()) return sensors
    const term = searchTerm.toLowerCase().trim()
    const words = term.split(/\s+/).filter(Boolean)

    return sensors.filter((s) => {
      const idStr = String(s.id)
      const nameStr = (s.name || '').toLowerCase()
      const siteStr = `centro #${s.site_id} centro ${s.site_id} site ${s.site_id} ${s.site_id}`.toLowerCase()
      const positionStr = (s.position || '').toLowerCase()
      const statusStr =
        s.status === 'out_of_range'
          ? 'fuera de rango alerta anomalo'
          : s.status === 'no_data'
          ? 'sin transmitir offline inactivo'
          : 'operativo normal ok'
      const combined = `${idStr} #${idStr} ${nameStr} ${siteStr} ${positionStr} ${statusStr}`

      return words.every((word) => combined.includes(word))
    })
  }, [sensors, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredSensors.length / pageSize))

  // Paginación sobre el conjunto filtrado
  const displayedSensors = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return filteredSensors.slice(startIndex, startIndex + pageSize)
  }, [filteredSensors, page, pageSize])

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setPage(1)
  }

  const handleClearSearch = () => {
    setSearchTerm('')
    setPage(1)
  }

  const handleCardClick = (targetStatus) => {
    setStatusFilter(targetStatus)
    setPage(1)
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
        </div>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {[
          {
            id: 'no_data',
            label: 'Sin Transmitir',
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
            subtext: 'Ver todos los sensores',
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
              {statusFilter === 'no_data' && 'Sensores Sin Transmitir (Offline)'}
              {statusFilter === 'ok' && 'Sensores Operativos'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Mostrando sensores según el filtro seleccionado arriba
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Buscador de sensor */}
            <div className="relative w-full sm:w-72">
              <label htmlFor="sensor-search-input" className="sr-only">
                Buscar sensores
              </label>
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <input
                id="sensor-search-input"
                type="text"
                placeholder="Buscar por sensor, ID o centro..."
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    handleClearSearch()
                  }
                }}
                className="w-full pl-9 pr-9 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition cursor-pointer"
                  title="Limpiar búsqueda (Esc)"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Selector de filtro directo */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="no_data">Sin Transmitir</option>
              <option value="out_of_range">Fuera de Rango</option>
              <option value="ok">Operativos</option>
              <option value="all">Todos los estados</option>
            </select>
          </div>
        </div>

        {/* Tabla */}
        {displayedSensors.length === 0 && !loadingSensors ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {searchTerm
                ? `No se encontraron sensores para "${searchTerm}"`
                : 'No se encontraron sensores para este criterio.'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm
                ? 'Intenta con otro término, ID de sensor, centro o limpia el campo de búsqueda.'
                : 'No hay sensores registrados bajo el filtro seleccionado.'}
            </p>
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpiar búsqueda</span>
              </button>
            )}
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
                        className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline font-medium cursor-pointer"
                      >
                        Centro #{sensor.site_id}
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
                          <WifiOff className="w-3 h-3 text-rose-500" /> Sin Transmitir
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Operativo
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end">
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
        {(totalPages > 1 || searchTerm) && filteredSensors.length > 0 && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {searchTerm ? (
                <>
                  Encontrados <strong className="text-slate-800 dark:text-slate-200">{filteredSensors.length}</strong>{' '}
                  {filteredSensors.length === 1 ? 'sensor' : 'sensores'} para{' '}
                  <span className="italic font-medium text-slate-700 dark:text-slate-300">"{searchTerm}"</span>
                  {totalPages > 1 && (
                    <span className="text-slate-400 ml-1">
                      (Página {page} de {totalPages})
                    </span>
                  )}
                </>
              ) : (
                <>
                  Página <strong className="text-slate-800 dark:text-slate-200">{page}</strong> de{' '}
                  <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong> ({sensors.length} sensores)
                </>
              )}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer text-slate-700 dark:text-slate-300"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-medium text-slate-700 dark:text-slate-300">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer text-slate-700 dark:text-slate-300"
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}