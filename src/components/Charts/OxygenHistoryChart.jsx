/**
 * =============================================================================
 * COMPONENTE DE TELEMETRÍA Y VISUALIZACIÓN CRONOLÓGICA (OxygenHistoryChart)
 * =============================================================================
 * Implementación basada en la biblioteca de visualización declarativa Recharts.
 * 
 * Principios de Ingeniería de Software y Arquitectura Gráfica:
 * 1. Abstracción del Modelo SVG Declarativo:
 *    Recharts transforma arrays de estructuras de datos unidimensionales en elementos
 *    vectoriales del DOM (`<svg>`, `<path>`, `<defs>`, `<g>`) mediante un grafo de
 *    coordenadas cartesianas parametrizado (ejes X/Y).
 * 
 * 2. `ResponsiveContainer` con Dimensión Inicial Paramétrica:
 *    Para mitigar el problema recurrente de colapso a 0px de altura derivado del cálculo
 *    asíncrono de ResizeObserver en layouts CSS Flexbox, se inyectan propiedades
 *    estáticas `height={320}`, `minHeight={320}` e `initialDimension={{ width: 600, height: 320 }}`.
 *    Esto garantiza el renderizado determinista desde el ciclo de montaje inicial (Frame 0).
 * 
 * 3. Curva de Interpolación Monótona (`type="monotone"`):
 *    Emplea splines cúbicos monótonos para conservar los puntos extremos de la serie
 *    sin introducir oscilaciones artificiales (fenómeno de Runge).
 * 
 * 4. Umbrales Operacionales mediante `ReferenceLine`:
 *    Inyecta líneas de referencia analíticas en el dominio numérico del eje Y,
 *    proporcionando contraste visual inmediato contra los límites ecológicos (`oxygenMin`, `oxygenMax`).
 * 
 * 5. Inyección Contextual de Tooltip (`CustomTooltip`):
 *    Intercepta los eventos del puntero del ratón o pantalla táctil, desacoplando
 *    el renderizado nativo para presentar un popup flotante con formato semántico y tipografía adaptativa.
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
 * Límite de Error Declarativo (ChartErrorBoundary):
 * Intercepta cualquier fallo en el ciclo de vida de renderizado de Recharts,
 * impidiendo que una excepción desmonte la vista principal.
 */
class ChartErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[OxygenHistoryChart] Error capturado en motor gráfico Recharts:', error, errorInfo)
  }

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
 * Componente de Presentación Flotante (CustomTooltip):
 * Recibe de forma reactiva las propiedades inyectadas por el despachador de eventos de Recharts:
 * - `active`: Booleano que indica proximidad del cursor a un vértice temporal.
 * - `payload`: Array de entidades de datos asociadas a la coordenada activa.
 * - `label`: Rótulo temporal formateado del eje X.
 * - `isOffline`: Si el dispositivo está fuera de línea, adapta la semántica visual.
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
      <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">
        {isOffline ? 'Oxígeno Disuelto (Histórico Archivado)' : 'Oxígeno Disuelto'}
      </p>
    </div>
  )
}

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

  // Paleta de color según estado operacional: azul saturado en vivo, gris pizarra si está offline
  const strokeColor = isOffline ? '#64748b' : '#2563eb'
  const stopColor = isOffline ? '#64748b' : '#3b82f6'
  const gradientId = isOffline ? 'oxygenAreaGradientOffline' : 'oxygenAreaGradient'

  return (
    <div className="w-full">
      {/* Contenedor con altura mínima asegurada y mitigación de desbordamiento */}
      <div className="w-full h-80 min-h-[320px]">
        <ChartErrorBoundary>
          <ResponsiveContainer
            width="100%"
            height={320}
            minHeight={320}
            initialDimension={{ width: 600, height: 320 }}
          >
            <AreaChart
              data={data}
              margin={{ top: 15, right: 25, left: 10, bottom: 5 }}
            >
              {/* Definición del degradado SVG para el sombreado de área bajo la curva */}
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={stopColor} stopOpacity={isOffline ? 0.25 : 0.4} />
                  <stop offset="95%" stopColor={stopColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              {/* Malla cartesiana ortogonal de baja opacidad */}
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                className="stroke-slate-200 dark:stroke-slate-800"
                opacity={0.5}
              />

              {/* Eje X: Serie temporal discreta con intervalo mínimo de solapamiento */}
              <XAxis
                dataKey="timestamp"
                tickLine={false}
                axisLine={{ stroke: '#475569', opacity: 0.2 }}
                tick={{ fontSize: 11 }}
                className="text-slate-500 dark:text-slate-400 fill-current"
                minTickGap={35}
              />

              {/* Eje Y: Escala continua calibrada con formateador numérico defensivo */}
              <YAxis
                tickLine={false}
                axisLine={{ stroke: '#475569', opacity: 0.2 }}
                tick={{ fontSize: 11 }}
                className="text-slate-500 dark:text-slate-400 fill-current"
                tickFormatter={(v) => (v != null && !isNaN(v) ? `${Number(v).toFixed(1)} mg/L` : '')}
                width={85}
                domain={['auto', 'auto']}
              />

              {/* Componente flotante de inspección granular */}
              <Tooltip content={<CustomTooltip isOffline={isOffline} />} />

              {/* Límites operacionales proyectados en el plano cartesiano */}
              {oxygenMin != null && (
                <ReferenceLine
                  y={oxygenMin}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  label={{
                    value: `Mín ${oxygenMin} mg/L`,
                    fill: '#d97706',
                    fontSize: 10,
                    position: 'insideTopRight',
                    fontWeight: 600,
                  }}
                />
              )}
              {oxygenMax != null && (
                <ReferenceLine
                  y={oxygenMax}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  label={{
                    value: `Máx ${oxygenMax} mg/L`,
                    fill: '#d97706',
                    fontSize: 10,
                    position: 'insideBottomRight',
                    fontWeight: 600,
                  }}
                />
              )}

              {/* Primitiva gráfica de área con interpolación monótona */}
              <Area
                type="monotone"
                dataKey="value"
                name="Oxígeno Disuelto"
                stroke={strokeColor}
                strokeWidth={2.5}
                strokeDasharray={isOffline ? '5 5' : undefined}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                activeDot={{
                  r: 6,
                  fill: strokeColor,
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartErrorBoundary>
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
        <span>Hora Oficial de Chile (CLST/CLT)</span>
      </div>
    </div>
  )
}

