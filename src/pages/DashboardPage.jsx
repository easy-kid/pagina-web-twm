/**
 * VISTA PRINCIPAL DE SUPERVISIÓN OPERATIVA (DashboardPage.jsx)
 * VISTA PRINCIPAL DE SUPERVISIÓN OPERATIVA (DashboardPage.jsx)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  WifiOff,
  Radio,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  X,
  Activity,
} from '../components/Common/Icons'
import { sensorService, formatChileDateTime } from '../services/sensorService'

/**
 * DashboardPage:
 * Función componente principal que orquesta la supervisión operativa,
 * el filtrado multicriterio, la paginación y las métricas KPI.
 *
 * @returns {JSX.Element} Panel de control interactivo.
 */
export default function DashboardPage() {
  const navigate = useNavigate()

  /**
   * Almacén asociativo en memoria persistente durante el ciclo de vida del componente:
   * Evita llamadas redundantes a la API al cambiar entre filtros.
   */
  const cacheRef = useRef(new Map())

  // Métricas consolidadas del sistema (tarjetas KPI superiores)
  const [metrics, setMetrics] = useState({
    total: 0,
    offlineCount: 0,
    outOfRangeCount: 0,
    normalCount: 0,
  })

  // Lista de sensores y estados de control
  const [sensors, setSensors] = useState([])
  const [loadingSensors, setLoadingSensors] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'out_of_range' | 'no_data' | 'ok'
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  /**
   * loadMetrics:
   * Función asíncrona que recupera las métricas consolidadas de la red invocando
   * `sensorService.getDashboardMetrics()`.
   */
  const loadMetrics = useCallback(async () => {
    try {
      const data = await sensorService.getDashboardMetrics()
      setMetrics(data)
    } catch (err) {
      console.error('[DashboardPage] Error al sincronizar métricas operacionales:', err)
    }
  }, [])

  /**
   * loadSensors:
   * Recupera la colección completa de sensores para el filtro actual implementando
   * una estrategia Cache-First. Si los datos ya existen en `cacheRef`, se hidratan de inmediato;
   * en paralelo o de fondo, se refresca la información desde la API.
   *
   * @param {boolean} [isBackgroundRefresh=false] - Indica si la carga ocurre en segundo plano sin activar spinners.
   */
  const loadSensors = useCallback(async (isBackgroundRefresh = false) => {
    const cacheKey = statusFilter

    // 1. Lectura inmediata desde la caché en memoria si está disponible
    if (cacheRef.current.has(cacheKey) && !isBackgroundRefresh) {
      const cached = cacheRef.current.get(cacheKey)
      setSensors(cached)
      setLoadingSensors(false)
      return
    }

    if (!isBackgroundRefresh) {
      setLoadingSensors(true)
    }

    try {
      const params = {}
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }

      // Descarga exhaustiva paralela de todas las páginas para filtrado local
      const result = await sensorService.getAllSensors(params)
      const items = result.items || []

      // 2. Actualización de caché y del estado de React
      cacheRef.current.set(cacheKey, items)
      setSensors(items)
    } catch (err) {
      console.error(`[DashboardPage] Error al obtener sensores para el filtro "${statusFilter}":`, err)
      // Si falla la red pero hay datos en caché previa, los mantenemos
      if (!cacheRef.current.has(cacheKey)) {
        setSensors([])
      }
    } finally {
      setLoadingSensors(false)
    }
  }, [statusFilter])

  /**
   * Sincronización inicial y sondeo periódico (Polling):
   * Ejecuta la carga inicial y establece un temporizador de intervalo a 30 segundos
   * para mantener las métricas y la tabla actualizadas sin interacción manual.
   */
  useEffect(() => {
    loadMetrics()
    loadSensors()

    // Intervalo de actualización periódica en segundo plano (30 segundos)
    const interval = setInterval(() => {
      loadMetrics()
      loadSensors(true)
    }, 30000)

    return () => clearInterval(interval)
  }, [loadMetrics, loadSensors])

  /**
   * Sincronización al cambiar el filtro de estado:
   * Resetea el índice de página a la primera posición y dispara la carga de la colección filtrada.
   */
  useEffect(() => {
    setPage(1)
    loadSensors()
  }, [statusFilter, loadSensors])

  /**
   * handleClearSearch:
   * Limpia el término de búsqueda activo y regresa el paginado al inicio.
   */
  const handleClearSearch = () => {
    setSearchTerm('')
    setPage(1)
  }

  /**
   * filteredSensors (Memoización de Filtrado y Priorización de Severidad):
   * 1. Filtra reactivamente por término de búsqueda (nombre, ID, centro, posición, estado).
   * 2. Aplica ordenamiento estándar por criticidad operacional:
   *    - 1º Severidad Alta: Sin Transmitir (`no_data`, dispositivos desconectados).
   *    - 2º Severidad Media: Fuera de Rango (`out_of_range`, oxígeno anómalo).
   *    - 3º Estado Nominal: Operativos (`ok`, funcionamiento normal).
   *    - Desempate secundario: Identificador numérico ascendente (`id`).
   */
  const filteredSensors = useMemo(() => {
    let result = sensors

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      result = result.filter((sensor) => {
        const nameMatch = (sensor.name || '').toLowerCase().includes(term)
        const idMatch = String(sensor.id || '').includes(term)
        const siteMatch = String(sensor.site_id || '').includes(term)
        const positionMatch = (sensor.position || '').toLowerCase().includes(term)
        const statusLabel =
          sensor.status === 'out_of_range'
            ? 'fuera de rango anomalo'
            : sensor.status === 'no_data'
              ? 'sin transmitir inactivo offline'
              : 'operativo normal ok'
        const statusMatch = statusLabel.includes(term)

        return nameMatch || idMatch || siteMatch || positionMatch || statusMatch
      })
    }

    // Ordenamiento estándar por severidad operativa: Sin Transmitir -> Fuera de Rango -> Operativos
    return [...result].sort((a, b) => {
      const weightA = a.status === 'no_data' ? 1 : a.status === 'out_of_range' ? 2 : 3
      const weightB = b.status === 'no_data' ? 1 : b.status === 'out_of_range' ? 2 : 3

      if (weightA !== weightB) {
        return weightA - weightB
      }
      return (Number(a.id) || 0) - (Number(b.id) || 0)
    })
  }, [sensors, searchTerm])

  /**
   * totalPages (Memoización):
   * Calcula el número total de páginas según la cantidad de elementos filtrados.
   */
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredSensors.length / pageSize))
  }, [filteredSensors.length, pageSize])

  /**
   * displayedSensors (Memoización de Segmentación):
   * Aplica un corte determinista (`slice`) para presentar únicamente los 10 registros
   * correspondientes a la página activa en el viewport.
   */
  const displayedSensors = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return filteredSensors.slice(startIndex, startIndex + pageSize)
  }, [filteredSensors, page, pageSize])

  /**
   * handleRowClick:
   * Transición de navegación hacia `/sensors/:id`. Transfiere la entidad completa
   * del sensor a través de `history.state` para evitar una recarga en blanco.
   *
   * @param {Object} sensor - Entidad seleccionada.
   */
  const handleRowClick = (sensor) => {
    navigate(`/sensors/${sensor.id}`, { state: { sensor } })
  }

  return (
    <div className="space-y-6">
      {/* CABECERA Y TÍTULO DE LA PÁGINA */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Panel de Control Operacional
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Supervisión en tiempo real de los sensores de oxígeno disuelto en centros de cultivo
        </p>
      </div>

      {/* TARJETAS DE MÉTRICAS OPERACIONALES (Indicadores de Estado Informativos) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI: Sin Transmitir */}
        <div
          className={`p-5 rounded-2xl border transition-all relative overflow-hidden ${statusFilter === 'no_data'
              ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 shadow-sm ring-2 ring-rose-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs'
            }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Sin Transmitir
              </p>
              <h3 className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                {metrics.offlineCount}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Inactivos (&gt;90 min)
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <WifiOff className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* KPI: Fuera de Rango */}
        <div
          className={`p-5 rounded-2xl border transition-all relative overflow-hidden ${statusFilter === 'out_of_range'
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 shadow-sm ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs'
            }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Fuera de Rango
              </p>
              <h3 className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                {metrics.outOfRangeCount}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Oxígeno anómalo
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* KPI: Operativos */}
        <div
          className={`p-5 rounded-2xl border transition-all relative overflow-hidden ${statusFilter === 'ok'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 shadow-sm ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs'
            }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Operativos
              </p>
              <h3 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {metrics.normalCount}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Transmitiendo normal
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* KPI: Total Sensores */}
        <div
          className={`p-5 rounded-2xl border transition-all relative overflow-hidden ${statusFilter === 'all'
              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 shadow-sm ring-2 ring-blue-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs'
            }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Sensores
              </p>
              <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">
                {metrics.total}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Registrados en sistema
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <Radio className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE TABLA DE SENSORES CON BUSCADOR Y FILTROS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-colors">
        {/* Barra de herramientas: Búsqueda y Selector de Filtro */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Listado General de Sensores
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ordenados por criticidad: Sin Transmitir → Fuera de Rango → Operativos
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Input de Búsqueda Reactiva Multicriterio */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Buscar por sensor, ID o centro..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
                className="w-full sm:w-64 pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown de Estado Interactivo */}
            <div className="relative inline-block">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none py-2 pl-3 pr-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors"
              >
                <option value="all">Todos los estados</option>
                <option value="no_data">Sin Transmitir</option>
                <option value="out_of_range">Fuera de Rango</option>
                <option value="ok">Operativos</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 dark:text-slate-500">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Contenido de la Tabla */}
        {displayedSensors.length === 0 && !loadingSensors ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500">
            <Radio className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-medium">No se encontraron sensores con los criterios seleccionados</p>
            <p className="text-xs mt-1">
              {searchTerm
                ? 'Pruebe utilizando un término de búsqueda diferente o limpiando el filtro.'
                : 'No existen registros disponibles para este estado.'}
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
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        Centro #{sensor.site_id}
                      </span>
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
                      <button
                        type="button"
                        onClick={() => handleRowClick(sensor)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition cursor-pointer"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Ver Gráfico</span>
                      </button>
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
