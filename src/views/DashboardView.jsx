import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  WifiOff,
  CheckCircle2,
  ArrowRight,
  Radio,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Building,
  Filter,
  RotateCcw,
} from 'lucide-react'
import { sensorService } from '../services/sensorService'

export default function DashboardView() {
  const navigate = useNavigate()
  const cacheRef = useRef(new Map())

  // Métricas del sistema calculadas combinando rutas
  const [metrics, setMetrics] = useState({
    total: 0,
    offlineCount: 0,
    outOfRangeCount: 0,
    normalCount: 0,
  })
  const [loadingMetrics, setLoadingMetrics] = useState(true)

  // Lista de centros de cultivo para mapeo por nombre
  const [sites, setSites] = useState([])

  // Lista de sensores y filtros por atributos
  const [sensors, setSensors] = useState([])
  const [loadingSensors, setLoadingSensors] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'out_of_range' | 'no_data' | 'ok'
  const [selectedSite, setSelectedSite] = useState('all') // 'all' | siteId
  const [positionFilter, setPositionFilter] = useState('all') // 'all' | 'jaula' | 'ponton'
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
    } finally {
      setLoadingMetrics(false)
    }
  }, [])

  // Cargar centros de cultivo para permitir búsqueda y filtrado por nombre de centro
  const loadSites = useCallback(async () => {
    try {
      const siteList = await sensorService.getSites()
      setSites(siteList)
    } catch (err) {
      console.error('Error al cargar centros:', err)
    }
  }, [])

  // Cargar totalidad de sensores con caché en memoria para respuesta instantánea
  const loadSensors = useCallback(async () => {
    const cacheKey = 'all_sensors'

    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey)
      setSensors(cached)
      setLoadingSensors(false)
      return
    }

    try {
      const { items } = await sensorService.getAllSensors()
      cacheRef.current.set(cacheKey, items)
      setSensors(items)
    } catch (err) {
      console.error('Error al cargar sensores:', err)
    } finally {
      setLoadingSensors(false)
    }
  }, [])

  useEffect(() => {
    loadMetrics()
    loadSites()
    loadSensors()
  }, [loadMetrics, loadSites, loadSensors])

  // Mapeo dinámico de centros de cultivo (ID -> Nombre legible)
  const sitesMap = useMemo(() => {
    const map = {}
    sites.forEach((site) => {
      map[site.id] = site.name
    })
    // Respaldar con los centros identificados en los sensores si la API /sites está vacía
    sensors.forEach((s) => {
      if (s.site_id && !map[s.site_id]) {
        map[s.site_id] = `Centro #${s.site_id}`
      }
    })
    return map
  }, [sites, sensors])

  // Lista única de centros para el selector de atributos
  const availableSites = useMemo(() => {
    const uniqueIds = new Set()
    const result = []

    sites.forEach((site) => {
      uniqueIds.add(String(site.id))
      result.push({ id: String(site.id), name: site.name })
    })

    sensors.forEach((s) => {
      if (s.site_id && !uniqueIds.has(String(s.site_id))) {
        uniqueIds.add(String(s.site_id))
        result.push({ id: String(s.site_id), name: `Centro #${s.site_id}` })
      }
    })

    return result.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  }, [sites, sensors])

  // Filtrado multidimensional: por nombre (sensor y centro) y por atributos
  const filteredSensors = useMemo(() => {
    return sensors.filter((sensor) => {
      // 1. Filtro por atributo: Estado
      if (statusFilter !== 'all' && sensor.status !== statusFilter) {
        return false
      }

      // 2. Filtro por atributo: Centro de cultivo (por ID resuelto a nombre)
      if (selectedSite !== 'all' && String(sensor.site_id) !== String(selectedSite)) {
        return false
      }

      // 3. Filtro por atributo: Posición / Estructura (Jaula vs Pontón)
      if (positionFilter !== 'all') {
        const pos = (sensor.position || '').toLowerCase()
        if (!pos.includes(positionFilter.toLowerCase())) {
          return false
        }
      }

      // 4. Búsqueda por Nombre (nombre de sensor, nombre de centro, posición, profundidad o ID)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim()
        const words = term.split(/\s+/).filter(Boolean)

        const siteName = (sitesMap[sensor.site_id] || `Centro #${sensor.site_id}`).toLowerCase()
        const sensorName = (sensor.name || '').toLowerCase()
        const position = (sensor.position || '').toLowerCase()
        const depth = sensor.depth != null ? `${sensor.depth}m` : ''
        const sensorId = String(sensor.id)
        const siteId = String(sensor.site_id)
        const statusText =
          sensor.status === 'out_of_range'
            ? 'fuera de rango alerta anomalo'
            : sensor.status === 'no_data'
            ? 'sin transmitir offline inactivo desconectado'
            : 'operativo normal ok'

        const searchable = `${sensorName} ${siteName} ${position} ${depth} #${sensorId} ${sensorId} ${siteId} ${statusText}`

        const matchesAll = words.every((word) => searchable.includes(word))
        if (!matchesAll) return false
      }

      return true
    })
  }, [sensors, statusFilter, selectedSite, positionFilter, searchTerm, sitesMap])

  const totalPages = Math.max(1, Math.ceil(filteredSensors.length / pageSize))

  // Paginación reactiva sobre el conjunto filtrado
  const displayedSensors = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return filteredSensors.slice(startIndex, startIndex + pageSize)
  }, [filteredSensors, page, pageSize])

  const hasActiveFilters =
    statusFilter !== 'all' ||
    selectedSite !== 'all' ||
    positionFilter !== 'all' ||
    searchTerm.trim() !== ''

  const handleClearFilters = () => {
    setStatusFilter('all')
    setSelectedSite('all')
    setPositionFilter('all')
    setSearchTerm('')
    setPage(1)
  }

  const handleCardClick = (targetStatus) => {
    setStatusFilter((prev) => (prev === targetStatus ? 'all' : targetStatus))
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

      {/* Tarjetas de Resumen KPI (Clicables para filtrar rápidamente por estado) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Sin Transmitir */}
        <button
          type="button"
          onClick={() => handleCardClick('no_data')}
          className={`text-left p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            statusFilter === 'no_data'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20 ring-2 ring-rose-600 ring-offset-2 dark:ring-offset-slate-950'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-rose-300 dark:hover:border-rose-800/80 shadow-xs'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${statusFilter === 'no_data' ? 'text-rose-100' : 'text-slate-400 dark:text-slate-500'}`}>
                Sin Transmitir
              </p>
              <h3 className={`text-3xl font-extrabold mt-1.5 ${statusFilter === 'no_data' ? 'text-white' : 'text-rose-600 dark:text-rose-400'}`}>
                {loadingMetrics ? <Loader2 className="w-6 h-6 animate-spin mt-1" /> : metrics.offlineCount}
              </h3>
            </div>
            <div className={`p-2.5 rounded-xl ${statusFilter === 'no_data' ? 'bg-white/20 text-white' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'}`}>
              <WifiOff className="w-5 h-5" />
            </div>
          </div>
          <p className={`text-xs mt-3 flex items-center gap-1 font-medium ${statusFilter === 'no_data' ? 'text-rose-100' : 'text-rose-600 dark:text-rose-400'}`}>
            Inactivos (&gt;90 min) <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </button>

        {/* Fuera de Rango */}
        <button
          type="button"
          onClick={() => handleCardClick('out_of_range')}
          className={`text-left p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            statusFilter === 'out_of_range'
              ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20 ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-950'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-amber-300 dark:hover:border-amber-800/80 shadow-xs'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${statusFilter === 'out_of_range' ? 'text-amber-100' : 'text-slate-400 dark:text-slate-500'}`}>
                Fuera de Rango
              </p>
              <h3 className={`text-3xl font-extrabold mt-1.5 ${statusFilter === 'out_of_range' ? 'text-white' : 'text-amber-500'}`}>
                {loadingMetrics ? <Loader2 className="w-6 h-6 animate-spin mt-1" /> : metrics.outOfRangeCount}
              </h3>
            </div>
            <div className={`p-2.5 rounded-xl ${statusFilter === 'out_of_range' ? 'bg-white/20 text-white' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className={`text-xs mt-3 flex items-center gap-1 font-medium ${statusFilter === 'out_of_range' ? 'text-amber-100' : 'text-amber-600 dark:text-amber-400'}`}>
            Oxígeno anómalo <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </button>

        {/* Operativos */}
        <button
          type="button"
          onClick={() => handleCardClick('ok')}
          className={`text-left p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            statusFilter === 'ok'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 ring-2 ring-emerald-600 ring-offset-2 dark:ring-offset-slate-950'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-emerald-300 dark:hover:border-emerald-800/80 shadow-xs'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${statusFilter === 'ok' ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'}`}>
                Operativos
              </p>
              <h3 className={`text-3xl font-extrabold mt-1.5 ${statusFilter === 'ok' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {loadingMetrics ? <Loader2 className="w-6 h-6 animate-spin mt-1" /> : metrics.normalCount}
              </h3>
            </div>
            <div className={`p-2.5 rounded-xl ${statusFilter === 'ok' ? 'bg-white/20 text-white' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'}`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className={`text-xs mt-3 flex items-center gap-1 font-medium ${statusFilter === 'ok' ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
            Transmitiendo normal <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </button>

        {/* Total Sensores */}
        <button
          type="button"
          onClick={() => handleCardClick('all')}
          className={`text-left p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            statusFilter === 'all'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-slate-950'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${statusFilter === 'all' ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>
                Total Sensores
              </p>
              <h3 className="text-3xl font-extrabold mt-1.5">
                {loadingMetrics ? <Loader2 className="w-6 h-6 animate-spin mt-1" /> : metrics.total}
              </h3>
            </div>
            <div className={`p-2.5 rounded-xl ${statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
              <Radio className="w-5 h-5" />
            </div>
          </div>
          <p className={`text-xs mt-3 flex items-center gap-1 font-medium ${statusFilter === 'all' ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>
            Ver todos los sensores <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </button>
      </div>

      {/* Contenedor Principal: Filtros por Atributos y Búsqueda por Nombre */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-colors">
        {/* Cabecera con Buscador por Nombre y Controles de Atributos */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Listado de Sensores
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Busca sensores por nombre o filtra directamente por centro, estado o ubicación
              </p>
            </div>

            {/* Buscador inteligente por Nombre */}
            <div className="relative w-full lg:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por nombre de sensor, centro o posición..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
                className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition"
                aria-label="Buscar sensor o centro por nombre"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('')
                    setPage(1)
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Barra de Filtros por Atributos */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Filtrar por:
            </span>

            {/* Atributo: Centro de cultivo por Nombre (sin IDs manuales) */}
            <div className="relative inline-flex items-center">
              <Building className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
              <select
                value={selectedSite}
                onChange={(e) => {
                  setSelectedSite(e.target.value)
                  setPage(1)
                }}
                className="pl-8 pr-7 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                aria-label="Filtrar por centro de cultivo"
              >
                <option value="all">Todos los centros</option>
                {availableSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Atributo: Estado Operacional */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              aria-label="Filtrar por estado"
            >
              <option value="all">Todos los estados</option>
              <option value="ok">Operativos (Normal)</option>
              <option value="out_of_range">Fuera de Rango (Alerta)</option>
              <option value="no_data">Sin Transmitir (Offline)</option>
            </select>

            {/* Atributo: Posición / Estructura */}
            <select
              value={positionFilter}
              onChange={(e) => {
                setPositionFilter(e.target.value)
                setPage(1)
              }}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              aria-label="Filtrar por posición"
            >
              <option value="all">Todas las posiciones</option>
              <option value="jaula">Jaula</option>
              <option value="ponton">Pontón</option>
            </select>

            {/* Botón para Limpiar Filtros */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer ml-auto"
                title="Restablecer todos los filtros"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Tabla de Sensores */}
        {loadingSensors ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Cargando sensores...</p>
          </div>
        ) : filteredSensors.length === 0 ? (
          <div className="p-14 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center gap-3">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full">
              <Search className="w-6 h-6 text-slate-400 dark:text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No se encontraron sensores
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                No hay coincidencias para los criterios de búsqueda o atributos seleccionados.
              </p>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-1 px-3.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl transition cursor-pointer"
              >
                Restablecer filtros y ver todos
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Sensor</th>
                  <th className="py-3 px-4">Centro de Cultivo</th>
                  <th className="py-3 px-4">Posición / Prof.</th>
                  <th className="py-3 px-4">Rango Óptimo</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {displayedSensors.map((sensor) => {
                  const centerName = sitesMap[sensor.site_id] || `Centro #${sensor.site_id}`

                  return (
                    <tr
                      key={sensor.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {sensor.name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            ID: #{sensor.id}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSite(String(sensor.site_id))
                            setPage(1)
                          }}
                          className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline font-semibold cursor-pointer inline-flex items-center gap-1.5"
                          title={`Filtrar por ${centerName}`}
                        >
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>{centerName}</span>
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
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación sobre el conjunto filtrado */}
        {filteredSensors.length > 0 && (
          <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {hasActiveFilters ? (
                <>
                  Encontrados <strong className="text-slate-800 dark:text-slate-200">{filteredSensors.length}</strong>{' '}
                  {filteredSensors.length === 1 ? 'sensor' : 'sensores'} con los filtros aplicados
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
