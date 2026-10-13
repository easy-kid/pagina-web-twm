import { LayoutDashboard, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
          Rol 3 - Visualización & Métricas
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard General</h1>
        <p className="text-sm text-slate-500">
          Resumen operativo y telemetría de centros acuícolas en tiempo real.
        </p>
      </div>

      {/* Tarjetas de Métricas de ejemplo (Placeholder) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Centros Activos</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">8</div>
          <p className="text-xs text-emerald-600 font-medium mt-1">100% operativos</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Sensores Conectados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">32</div>
          <p className="text-xs text-slate-500 mt-1">Oxígeno, temp, salinidad</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Alertas Activas</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">1</div>
          <p className="text-xs text-amber-600 font-medium mt-1">Oxígeno bajo en Jaula 4</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Última Sincronización</span>
            <LayoutDashboard className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-base font-semibold text-slate-900 mt-1">Hace 2 minutos</div>
          <p className="text-xs text-slate-500 mt-1">Latencia promedio: 140ms</p>
        </div>
      </div>

      {/* Contenedor principal para Rol 3 */}
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
          <LayoutDashboard className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">Espacio asignado a Rol 3 (Dashboard)</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
          Este componente está conectado al enrutador en <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">/</code>.
          Aquí se deben montar los gráficos de telemetría y monitoreo de la API.
        </p>
      </div>
    </div>
  )
}
