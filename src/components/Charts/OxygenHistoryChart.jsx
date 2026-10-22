import { useState } from 'react'
import {
  Sparklines,
  SparklinesLine,
  SparklinesSpots,
  SparklinesReferenceLine,
} from 'react-sparklines'

export default function OxygenHistoryChart({
  data = [],
  oxygenMin = null,
  oxygenMax = null,
}) {
  const [hoveredData, setHoveredData] = useState(null)

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm font-medium">
        No hay datos suficientes para graficar.
      </div>
    )
  }

  // Obtenemos los valores numéricos
  const values = data.map((d) => d.value)
  const latestValue = values[values.length - 1]
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const avgValue = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)

  // Primer y último timestamp para el eje de tiempo
  const firstTimestamp = data[0]?.timestamp || ''
  const lastTimestamp = data[data.length - 1]?.timestamp || ''

  // Escala vertical que incluya los límites operacionales si están definidos
  const scaleMin = Math.max(0, Math.min(minValue, oxygenMin ?? minValue) - 0.5)
  const scaleMax = Math.max(maxValue, oxygenMax ?? maxValue) + 0.5

  return (
    <div className="w-full">
      {/* Tarjetas KPI de resumen rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-2.5">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Lectura Actual</p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {hoveredData?.value ?? latestValue} <span className="text-xs font-normal text-slate-400">mg/L</span>
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-2.5">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Promedio (60 m)</p>
          <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
            {avgValue} <span className="text-xs font-normal text-slate-400">mg/L</span>
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-2.5">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Mínimo Registrado</p>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {minValue} <span className="text-xs font-normal text-slate-400">mg/L</span>
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-2.5">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Máximo Registrado</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {maxValue} <span className="text-xs font-normal text-slate-400">mg/L</span>
          </p>
        </div>
      </div>

      {/* Contenedor del Gráfico Sparkline */}
      <div className="relative bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 overflow-hidden">
        {/* Guías de valores en los extremos */}
        <div className="flex justify-between items-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-2 px-1">
          <span>Máx escala: {scaleMax.toFixed(1)} mg/L</span>
          {oxygenMin != null && (
            <span className="text-amber-500 font-medium">Límite mínimo: {oxygenMin} mg/L</span>
          )}
          <span>Mín escala: {scaleMin.toFixed(1)} mg/L</span>
        </div>

        <div className="w-full h-44">
          <Sparklines
            data={values}
            width={800}
            height={180}
            margin={10}
            min={scaleMin}
            max={scaleMax}
            onMouseMove={(action, val) => {
              if (action === 'enter') setHoveredData({ value: val })
            }}
          >
            {/* Curva principal con estilo vectorial fijo */}
            <SparklinesLine
              color="#2563eb"
              style={{
                stroke: '#2563eb',
                strokeWidth: 2.5,
                fill: '#3b82f6',
                fillOpacity: 0.15,
                strokeLinejoin: 'round',
                strokeLinecap: 'round',
                vectorEffect: 'non-scaling-stroke',
              }}
            />

            {/* Puntos de datos */}
            <SparklinesSpots
              size={3}
              style={{
                stroke: '#2563eb',
                fill: '#ffffff',
                strokeWidth: 1.5,
                vectorEffect: 'non-scaling-stroke',
              }}
            />

            {/* Línea de umbral mínimo operacional */}
            {oxygenMin != null && (
              <SparklinesReferenceLine
                type="custom"
                value={oxygenMin}
                style={{
                  stroke: '#f59e0b',
                  strokeWidth: 1.5,
                  strokeDasharray: '4 4',
                  vectorEffect: 'non-scaling-stroke',
                }}
              />
            )}

            {/* Línea de umbral máximo operacional */}
            {oxygenMax != null && (
              <SparklinesReferenceLine
                type="custom"
                value={oxygenMax}
                style={{
                  stroke: '#f59e0b',
                  strokeWidth: 1.5,
                  strokeDasharray: '4 4',
                  vectorEffect: 'non-scaling-stroke',
                }}
              />
            )}
          </Sparklines>
        </div>

        {/* Eje horizontal de fechas */}
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 mt-2">
          <span>Inicio: {firstTimestamp}</span>
          <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
            {values.length} muestras en hora de Chile
          </span>
          <span>Último: {lastTimestamp}</span>
        </div>
      </div>

      {/* Leyenda inferior */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-3 px-1 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-blue-600 rounded-full inline-block"></span>
            Oxígeno Disuelto (react-sparklines)
          </span>
          {(oxygenMin != null || oxygenMax != null) && (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
              <span className="w-3 h-0.5 border-t border-dashed border-amber-500 inline-block"></span>
              Límites Operacionales: {oxygenMin != null ? `Mín ${oxygenMin} mg/L` : ''} {oxygenMax != null ? `- Máx ${oxygenMax} mg/L` : ''}
            </span>
          )}
        </div>
        <span>Hora de Chile</span>
      </div>
    </div>
  )
}
