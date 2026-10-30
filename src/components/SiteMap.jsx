import { useEffect, useMemo, useRef, useState } from 'react'
import { divIcon, latLngBounds } from 'leaflet'
import { MapContainer, Marker, ScaleControl, TileLayer, useMap } from 'react-leaflet'
import SiteInfoDialog from './SiteInfoDialog'

const parseCoordinate = (value) =>
  typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')
    ? Number(value)
    : Number.NaN

const getCoordinates = (value) => {
  if (!value || typeof value !== 'object') return null

  if (Array.isArray(value)) {
    const [longitude, latitude] = value.map(parseCoordinate)
    return isValidCoordinates(latitude, longitude) ? [latitude, longitude] : null
  }

  if (value.type === 'Point' && Array.isArray(value.coordinates)) {
    return getCoordinates(value.coordinates)
  }

  const latitude = parseCoordinate(value.latitude ?? value.lat)
  const longitude = parseCoordinate(value.longitude ?? value.lng ?? value.lon)
  return isValidCoordinates(latitude, longitude) ? [latitude, longitude] : null
}

const isValidCoordinates = (latitude, longitude) =>
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180

const getSiteCoordinates = (site) =>
  getCoordinates(site) ??
  getCoordinates(site?.coordinates) ??
  getCoordinates(site?.geometry) ??
  getCoordinates(site?.location)

const markerColors = {
  offline: '#e11d48',
  outOfRange: '#d97706',
  online: '#059669',
  unknown: '#2563eb',
}

const siteHasStatus = (site, status) => {
  const sensors = Array.isArray(site.sensors) ? site.sensors : []

  if (status === 'offline') return sensors.some((sensor) => sensor.status === 'no_data')
  if (status === 'outOfRange') return sensors.some((sensor) => sensor.status === 'out_of_range')
  if (status === 'online') return sensors.length > 0 && sensors.every((sensor) => sensor.status === 'ok')
  return false
}

const getSiteMarkerIcon = (site) => {
  const sensors = Array.isArray(site.sensors) ? site.sensors : []
  const counts = {
    online: sensors.filter((sensor) => sensor.status === 'ok').length,
    outOfRange: sensors.filter((sensor) => sensor.status === 'out_of_range').length,
    offline: sensors.filter((sensor) => sensor.status === 'no_data').length,
    unknown: sensors.filter(
      (sensor) => !['ok', 'out_of_range', 'no_data'].includes(sensor.status),
    ).length,
  }
  const colors = [
    [counts.online, markerColors.online],
    [counts.outOfRange, markerColors.outOfRange],
    [counts.offline, markerColors.offline],
    [counts.unknown, markerColors.unknown],
  ]
  let accumulatedPercentage = 0
  const gradientStops = colors
    .filter(([count]) => count > 0)
    .map(([count, color]) => {
      const start = accumulatedPercentage
      accumulatedPercentage += (count / sensors.length) * 100
      return `${color} ${start}% ${accumulatedPercentage}%`
    })
  const gradient = gradientStops.length
    ? `conic-gradient(${gradientStops.join(', ')})`
    : 'conic-gradient(#94a3b8 0% 100%)'
  const operationalPercentage = sensors.length
    ? Math.round((counts.online / sensors.length) * 100)
    : 0
  const label = sensors.length
    ? `${operationalPercentage}% operativos; ${counts.outOfRange} fuera de rango; ${counts.offline} sin transmitir`
    : 'Centro sin sensores'

  return divIcon({
    className: 'site-map-marker',
    html: `<span class="site-map-marker__sphere" style="--marker-gradient:${gradient}"><span class="site-map-marker__value" role="img" aria-label="${label}">${operationalPercentage}%</span></span>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  })
}

const FitMarkers = ({ markers }) => {
  const map = useMap()
  const hasFittedMarkers = useRef(false)

  useEffect(() => {
    if (hasFittedMarkers.current || markers.length === 0) return

    if (markers.length === 1) {
      map.setView(markers[0].coordinates, 12)
    } else if (markers.length > 1) {
      map.fitBounds(
        latLngBounds(markers.map(({ coordinates }) => coordinates)),
        { padding: [36, 36], maxZoom: 12 },
      )
    }

    hasFittedMarkers.current = true
  }, [map, markers])

  return null
}

export default function SiteMap({ sites, title = 'Ubicación del centro' }) {
  const [selectedSite, setSelectedSite] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const { markers, sitesWithoutCoordinates } = useMemo(() => {
    const markers = []
    const sitesWithoutCoordinates = []

    sites.forEach((site) => {
      const coordinates = getSiteCoordinates(site)
      if (coordinates) {
        markers.push({ site, coordinates })
      } else {
        sitesWithoutCoordinates.push(site)
      }
    })

    return { markers, sitesWithoutCoordinates }
  }, [sites])
  const initialCenter = markers[0]?.coordinates ?? [-39.5, -72.5]
  const visibleMarkers = useMemo(
    () =>
      statusFilter === 'all'
        ? markers
        : markers.filter(({ site }) => siteHasStatus(site, statusFilter)),
    [markers, statusFilter],
  )
  const statusFilters = [
    { id: 'all', label: 'Todos', color: '#475569' },
    { id: 'offline', label: 'Desconectado', color: markerColors.offline },
    { id: 'outOfRange', label: 'Fuera de rango', color: markerColors.outOfRange },
    { id: 'online', label: 'En línea', color: markerColors.online },
  ]

  return (
    <section className="space-y-3">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {markers.length
                ? `Mostrando ${visibleMarkers.length} de ${markers.length} centros con ubicación. Toca un marcador para ver sus sensores.`
                : 'No hay coordenadas disponibles para mostrar en el mapa.'}
            </p>
          </div>
        </div>
        {markers.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar centros por estado">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Filtrar:
            </span>
            {statusFilters.map(({ id, label, color }) => {
              const isSelected = statusFilter === id
              const count = id === 'all'
                ? markers.length
                : markers.filter(({ site }) => siteHasStatus(site, id)).length

              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setStatusFilter(id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    isSelected
                      ? 'border-slate-800 bg-slate-800 text-white shadow-sm dark:border-white dark:bg-white dark:text-slate-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {id !== 'all' && (
                    <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900" style={{ backgroundColor: color }} />
                  )}
                  {label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isSelected ? 'bg-white/15 dark:bg-slate-900/10' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div
        className="site-map relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-lg shadow-slate-900/10 dark:border-slate-800"
        role="region"
        aria-label={title}
      >
        <MapContainer
          center={initialCenter}
          zoom={markers.length === 1 ? 12 : markers.length > 1 ? 5 : 4}
          scrollWheelZoom
          className="h-[24rem] w-full md:h-[32rem]"
        >
          <TileLayer
            attribution='Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <ScaleControl position="bottomleft" />
          <FitMarkers markers={markers} />
          {visibleMarkers.map(({ site, coordinates }, index) => {
            const siteId = site.id ?? site._id
            return (
              <Marker
                key={siteId ?? `${site.name}-${index}`}
                position={coordinates}
                icon={getSiteMarkerIcon(site)}
                title={`Ver información de ${site.name || 'centro de cultivo'}`}
                eventHandlers={{ click: () => setSelectedSite(site) }}
              />
            )
          })}
        </MapContainer>
        {sitesWithoutCoordinates.length > 0 && (
          <div
            className="absolute left-3 right-3 top-3 z-[1000] rounded-xl border border-amber-200 bg-white/95 p-3 text-sm text-slate-700 shadow-lg backdrop-blur dark:border-amber-900 dark:bg-slate-900/95 dark:text-slate-200 sm:left-4 sm:right-auto sm:max-w-sm"
            role="status"
          >
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              {markers.length
                ? `${sitesWithoutCoordinates.length} ${sitesWithoutCoordinates.length === 1 ? 'centro no tiene' : 'centros no tienen'} coordenadas válidas`
                : 'No hay coordenadas válidas para mostrar centros'}
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              El mapa sigue visible, pero solo se marcan centros con latitud y longitud disponibles en la API.
            </p>
          </div>
        )}
      </div>
      {selectedSite && (
        <SiteInfoDialog
          site={selectedSite}
          onClose={() => setSelectedSite(null)}
        />
      )}
    </section>
  )
}
