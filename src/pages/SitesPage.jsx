import { Link } from 'react-router-dom'
import { Fish, MapPin, ChevronRight, Plus } from 'lucide-react'

export default function SitesPage() {
  // Datos ilustrativos para testing visual y desacoplamiento con Rol 2
  const mockSites = [
    { id: '1', name: 'Centro Bahía Mansa', location: 'Región de Los Lagos', cages: 12, status: 'Activo' },
    { id: '2', name: 'Centro Fiordo Comau', location: 'Región de Los Lagos', cages: 8, status: 'Activo' },
    { id: '3', name: 'Centro Canal Desertores', location: 'Región de Aysén', cages: 10, status: 'Mantenimiento' },
  ]

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
            Rol 2 - Gestión de Centros de Cultivo
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Centros de Cultivo</h1>
          <p className="text-sm text-slate-500">
            Catálogo y administración de sitios de cultivo y jaulas.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Centro</span>
        </button>
      </div>

      {/* Lista de sitios */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-semibold text-sm text-slate-800">Listado de Sitios Registrados</span>
          <span className="text-xs text-slate-500">{mockSites.length} sitios disponibles</span>
        </div>

        <div className="divide-y divide-slate-100">
          {mockSites.map((site) => (
            <div
              key={site.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
            >
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Fish className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">{site.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {site.location}
                    </span>
                    <span>•</span>
                    <span>{site.cages} jaulas</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    site.status === 'Activo'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {site.status}
                </span>

                <Link
                  to={`/sites/${site.id}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <span>Ver Detalle</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nota técnica para Rol 2 */}
      <div className="bg-slate-100/70 rounded-xl p-4 border border-slate-200 text-xs text-slate-600">
        <p className="font-semibold text-slate-700 mb-1">Nota para Rol 2:</p>
        <p>
          Este componente está ubicado en <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">src/pages/SitesPage.jsx</code>.
          Conecta aquí la llamada real <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">client.get('/sites')</code> usando la instancia compartida de Axios.
        </p>
      </div>
    </div>
  )
}
