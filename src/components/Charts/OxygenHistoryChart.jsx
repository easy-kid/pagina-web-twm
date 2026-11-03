/**
 * COMPONENTE DE TELEMETRÍA Y VISUALIZACIÓN CRONOLÓGICA (OxygenHistoryChart.jsx)
 * COMPONENTE DE TELEMETRÍA Y VISUALIZACIÓN CRONOLÓGICA (OxygenHistoryChart.jsx)
 */

import { Component } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'

/**
 * ChartErrorBoundary:
 * Límite de Error Declarativo (React Error Boundary) implementado como componente de clase.
 * Captura excepciones no controladas producidas en el subárbol de renderizado de Recharts.
 *
 * @extends Component
 */
class ChartErrorBoundary extends Component {
  /**
   * Inicializa el estado local del interceptor de fallos.
   * @param {Object} props - Propiedades del componente envolvente.
   */
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  /**
   * getDerivedStateFromError:
   * Ciclo de vida estático invocado inmediatamente tras ser arrojada una excepción.
   * Actualiza el estado reactivo para activar la rama de renderizado de contingencia.
   *
   * @returns {{ hasError: boolean }}
   */
  static getDerivedStateFromError() {
    return { hasError: true }
  }

  /**
   * componentDidCatch:
   * Ciclo de vida para el registro de telemetría de errores del cliente.
   *
   * @param {Error} error - La excepción capturada en el motor gráfico.
   * @param {Object} errorInfo - Árbol de trazas de componentes React (Component Stack Trace).
   */
  componentDidCatch(error, errorInfo) {
    console.error('[OxygenHistoryChart] Error capturado en motor gráfico Recharts:', error, errorInfo)
  }

  /**
   * render:
   * Despliega una interfaz de degradación elegante (Graceful Fallback UI) si ocurrió
   * un fallo interno, o el contenido vectorial regular en caso nominal.
   *
   * @returns {JSX.Element}
   */
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Modo de contingencia gráfico activo
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Se detectó una discrepancia al inicializar las primitivas vectoriales de Recharts.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * CustomTooltip:
 * Componente funcional de presentación flotante acoplado a los eventos del puntero de Recharts.
 * Despliega el valor numérico con 2 decimales y el rótulo temporal correspondiente al punto de muestra.
 *
 * @param {Object} props - Propiedades inyectadas por el despachador de eventos de Recharts.
 * @param {boolean} props.active - Indica proximidad del cursor al nodo de datos.
 * @param {Array<Object>} props.payload - Arreglo de registros asociados a la coordenada activa.
 * @param {string} props.label - Estampa de tiempo formateada del eje X.
 * @param {boolean} [props.isOffline=false] - Bandera de sensor sin transmisión en vivo.
 * @returns {JSX.Element|null} Contenedor con tipografía adaptativa y desenfoque (backdrop-blur).
 */
function CustomTooltip({ active, payload, label, isOffline = false }) {
  if (!active || !payload || !payload.length) return null

  const rawVal = payload[0]?.value
  const value = rawVal != null && !isNaN(rawVal) ? Number(rawVal).toFixed(2) : '--'

  return (
    <div className="bg-slate-900/95 dark:bg-slate-800/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-white transition-opacity">
      <p className="text-xs text-slate-400 mb-1 font-medium">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-xl font-bold ${isOffline ? 'text-slate-300' : 'text-blue-400'}`}>{value}</span>
        <span className="text-xs text-slate-400 font-medium">mg/L</span>
      </div>
      <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
        {isOffline ? 'Telemetría Archivada' : 'Oxígeno Disuelto'}
      </p>
    </div>
  )
}

/**
 * OxygenHistoryChart:
 * Función componente principal que orquesta el gráfico cartesiano de área para
 * la serie de oxígeno disuelto.
 *
 * @param {Object} props - Propiedades del componente.
 * @param {Array<Object>} props.data - Arreglo de puntos de telemetría `{ timestamp, value }`.
 * @param {number|null} [props.oxygenMin] - Límite mínimo normativo para trazar la línea de referencia inferior.
 * @param {number|null} [props.oxygenMax] - Límite máximo normativo para la línea de referencia superior.
 * @param {boolean} [props.isOffline=false] - Indica si el nodo se encuentra desconectado.
 * @returns {JSX.Element} Panel gráfico interactivo.
 */
export default function OxygenHistoryChart({
  data = [],
  oxygenMin = null,
  oxygenMax = null,
  isOffline = false,
}) {
  // Validación de seguridad para prevenir fallos por conjuntos de datos nulos o vacíos
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm font-medium">
        No hay datos suficientes para graficar.
      </div>
    )
  }

  // Paleta de gradientes y tonalidades según el estado operativo (Normal vs Inactivo/Offline)
  const strokeColor = isOffline ? '#64748b' : '#2563eb'
  const gradientStart = isOffline ? '#64748b' : '#3b82f6'
  const gradientEnd = isOffline ? '#334155' : '#1d4ed8'

  return (
    <ChartErrorBoundary>
      <div className="w-full relative min-h-[320px] transition-colors" style={{ height: 320 }}>
        {/* Contenedor adaptativo con dimensiones explícitas para cálculo de viewport */}
        <ResponsiveContainer
          width="100%"
          height={320}
          minHeight={320}
          initialDimension={{ width: 600, height: 320 }}
        >
          <AreaChart
            data={data}
            margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
          >
            {/* Definición vectorial de gradientes cromáticos para el relleno del área */}
            <defs>
              <linearGradient id="oxygenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={gradientStart} stopOpacity={isOffline ? 0.25 : 0.45} />
                <stop offset="95%" stopColor={gradientEnd} stopOpacity={0.0} />
              </linearGradient>
            </defs>

            {/* Malla cartesiana sutil para referencia de magnitud */}
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="stroke-slate-200 dark:stroke-slate-800"
              opacity={0.5}
            />

            {/* Eje de tiempo cronológico (Eje X) */}
            <XAxis
              dataKey="timestamp"
              tickLine={false}
              axisLine={{ stroke: '#475569', opacity: 0.2 }}
              tick={{ fontSize: 11 }}
              className="text-slate-500 dark:text-slate-400 fill-current"
              minTickGap={35}
            />

            {/* Eje numérico de concentración de oxígeno disuelto (Eje Y) */}
            <YAxis
              tickLine={false}
              axisLine={{ stroke: '#475569', opacity: 0.2 }}
              tick={{ fontSize: 11 }}
              className="text-slate-500 dark:text-slate-400 fill-current"
              tickFormatter={(v) => (v != null && !isNaN(v) ? `${Number(v).toFixed(1)} mg/L` : '')}
              width={85}
              domain={['auto', 'auto']}
            />

            {/* Ventana flotante de inspección interactiva */}
            <Tooltip content={<CustomTooltip isOffline={isOffline} />} />

            {/* Umbral operativo mínimo normativo */}
            {oxygenMin != null && !isNaN(oxygenMin) && (
              <ReferenceLine
                y={Number(oxygenMin)}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Mín ${Number(oxygenMin).toFixed(1)} mg/L`,
                  position: 'insideBottomRight',
                  fill: '#f59e0b',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            )}

            {/* Umbral operativo máximo normativo */}
            {oxygenMax != null && !isNaN(oxygenMax) && (
              <ReferenceLine
                y={Number(oxygenMax)}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Máx ${Number(oxygenMax).toFixed(1)} mg/L`,
                  position: 'insideTopRight',
                  fill: '#f59e0b',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            )}

            {/* Curva continua interpolada mediante splines monótonos */}
            <Area
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={2.5}
              fill="url(#oxygenGradient)"
              dot={false}
              activeDot={{
                r: 5,
                stroke: '#ffffff',
                strokeWidth: 2,
                fill: strokeColor,
              }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Rótulos semánticos e indicadores de convención horaria */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-3 px-2 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className={`w-3 h-1.5 ${isOffline ? 'bg-slate-500' : 'bg-blue-600'} rounded-full inline-block`}></span>
            {isOffline ? 'Oxígeno Disuelto (Histórico Archivado / Inactivo)' : 'Oxígeno Disuelto (mg/L)'}
          </span>
          {(oxygenMin != null || oxygenMax != null) && (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
              <span className="w-3 h-0.5 border-t border-dashed border-amber-500 inline-block"></span>
              Rango Operacional: {oxygenMin != null ? `Mín ${oxygenMin} mg/L` : ''} {oxygenMax != null ? `- Máx ${oxygenMax} mg/L` : ''}
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          Hora Oficial de Chile (CLST/CLT)
        </div>
      </div>
    </ChartErrorBoundary>
  )
}
