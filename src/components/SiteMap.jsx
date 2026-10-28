import { useEffect, useMemo, useState } from 'react'
import { divIcon, latLngBounds } from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
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

const siteMarkerIcon = divIcon({
  className: 'site-map-marker',
  html: '<span class="site-map-marker__pin"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a8 8 0 0 0-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 0 0-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/></svg></span>',
  iconSize: [32, 38],
  iconAnchor: [16, 36],
  popupAnchor: [0, -34],
})

const FitMarkers = ({ markers }) => {
  const map = useMap()

  useEffect(() => {
    if (markers.length === 1) {
      map.setView(markers[0].coordinates, 12)
    } else if (markers.length > 1) {
      map.fitBounds(
        latLngBounds(markers.map(({ coordinates }) => coordinates)),
        { padding: [36, 36], maxZoom: 12 },
      )
    }
  }, [map, markers])

  return null
}

export default function SiteMap({ sites, title = 'Ubicación del centro' }) {
  const [selectedSite, setSelectedSite] = useState(null)
  const markers = useMemo(
    () =>
      sites.flatMap((site) => {
        const coordinates = getSiteCoordinates(site)
        return coordinates ? [{ site, coordinates }] : []
      }),
    [sites],
  )

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {markers.length
            ? `${markers.length} ${markers.length === 1 ? 'centro con ubicación' : 'centros con ubicación'}. Haz clic en un marcador para ver su información.`
            : 'No hay coordenadas disponibles para mostrar en el mapa.'}
        </p>
      </div>

      {markers.length > 0 && (
        <div
          className="site-map overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800"
          role="region"
          aria-label={title}
        >
          <MapContainer
            center={markers[0].coordinates}
            zoom={markers.length === 1 ? 12 : 5}
            scrollWheelZoom={false}
            className="h-80 w-full md:h-96"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitMarkers markers={markers} />
            {markers.map(({ site, coordinates }, index) => {
              const siteId = site.id ?? site._id
              return (
                <Marker
                  key={siteId ?? `${site.name}-${index}`}
                  position={coordinates}
                  icon={siteMarkerIcon}
                  title={`Ver información de ${site.name || 'centro de cultivo'}`}
                  eventHandlers={{ click: () => setSelectedSite(site) }}
                />
              )
            })}
          </MapContainer>
        </div>
      )}
      {selectedSite && (
        <SiteInfoDialog
          site={selectedSite}
          onClose={() => setSelectedSite(null)}
        />
      )}
    </section>
  )
}
