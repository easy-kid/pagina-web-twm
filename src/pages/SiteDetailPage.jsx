import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Fish, MapPin, Radio } from 'lucide-react'

export default function SiteDetailPage() {
  const { id } = useParams()

  return (
    <div className="space-y-6">
      {/* Botón Volver */}
      <Link
        to="/sites"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al listado de sitios</span>
      </Link>

      {/* Cabecera del Detalle */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Fish className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Identificador: #{id}
              </span>
              <h1 className="text-xl font-bold text-slate-900">Detalle del Centro de Cultivo</h1>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Sector Seno Reloncaví</span>
              </div>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Transmisión Activa
          </span>
        </div>
      </div>

      {/* Sensores asociados (Placeholder Rol 2) */}
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
          <Radio className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">
          Sensores y Jaulas del Centro #{id} (Rol 2)
        </h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
          Conecta en este archivo los endpoints <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">/sites/{id}</code> o <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">/sensors?site_id={id}</code> para mostrar las lecturas de los sensores.
        </p>
      </div>
    </div>
  )
}
