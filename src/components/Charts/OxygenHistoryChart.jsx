import { useState } from 'react'

export default function OxygenHistoryChart({
  data = [],
  oxygenMin = null,
  oxygenMax = null,
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null)

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm font-medium">
        No hay datos suficientes para graficar.
      </div>
    )
  }

  // Dimensiones del espacio vectorial SVG
  const svgWidth = 800
  const svgHeight = 320
  const padLeft = 55
  const padRight = 35
  const padTop = 30
  const padBottom = 45

  const chartWidth = svgWidth - padLeft - padRight
  const chartHeight = svgHeight - padTop - padBottom

  // Obtener valores y límites
  const values = data.map((d) => d.value)
  const minDataVal = Math.min(...values)
  const maxDataVal = Math.max(...values)

  // Considerar límites de oxígeno en la escala si existen
  const effectiveMin = oxygenMin != null ? Math.min(minDataVal, oxygenMin) : minDataVal
  const effectiveMax = oxygenMax != null ? Math.max(maxDataVal, oxygenMax) : maxDataVal

  // Añadir un pequeño margen superior e inferior para que el gráfico respire
  const yPadding = Math.max(0.5, (effectiveMax - effectiveMin) * 0.15)
  const yMin = Math.max(0, Number((effectiveMin - yPadding).toFixed(1)))
  const yMax = Number((effectiveMax + yPadding).toFixed(1))
  const yRange = yMax - yMin || 1

  // Función matemática de mapeo a coordenadas del plano SVG
  const getX = (index) => {
    if (data.length <= 1) return padLeft + chartWidth / 2
    return padLeft + (index / (data.length - 1)) * chartWidth
  }

  const getY = (val) => {
    const ratio = (val - yMin) / yRange
    return padTop + chartHeight - ratio * chartHeight
  }

  // Puntos de la curva
  const points = data.map((d, i) => ({
    x: getX(i),
    y: getY(d.value),
    value: d.value,
    timestamp: d.timestamp,
  }))

  const pointsString = points.map((p) => `${p.x},${p.y}`).join(' ')

  // Área bajo la curva para el degradado
  const areaPointsString = `${padLeft},${padTop + chartHeight} ${pointsString} ${
    points[points.length - 1].x
  },${padTop + chartHeight}`

  // 4 líneas de guía horizontales para el eje Y
  const ySteps = 4
  const gridLines = Array.from({ length: ySteps + 1 }, (_, i) => {
    const val = Number((yMin + (i * yRange) / ySteps).toFixed(1))
    const yPos = getY(val)
    return { val, yPos }
  })

  // Etiquetas espaciadas del eje X (máximo 6 etiquetas para no saturar)
  const maxLabels = Math.min(6, data.length)
  const xLabels = Array.from({ length: maxLabels }, (_, i) => {
    const index = Math.round((i / (maxLabels - 1 || 1)) * (data.length - 1))
    return {
      index,
      x: getX(index),
      label: data[index]?.timestamp,
    }
  })

  return (
    <div className="w-full relative select-none">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto overflow-visible"
        aria-label="Gráfico de mediciones históricas"
      >
        <defs>
          <linearGradient id="oxygenAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Líneas de cuadrícula horizontal (Eje Y) */}
        {gridLines.map((line, idx) => (
          <g key={idx}>
            <line
              x1={padLeft}
              y1={line.yPos}
              x2={padLeft + chartWidth}
              y2={line.yPos}
              strokeDasharray="3 3"
              strokeWidth="1"
              className="stroke-slate-100 dark:stroke-slate-800 transition-colors"
            />
            <text
              x={padLeft - 10}
              y={line.yPos + 4}
              textAnchor="end"
              fontSize="11"
              fontFamily="system-ui, sans-serif"
              className="fill-slate-400 dark:fill-slate-500 font-medium transition-colors"
            >
              {line.val}
            </text>
          </g>
        ))}

        {/* Líneas de referencia de umbral óptimo si están definidas */}
        {oxygenMin != null && oxygenMin >= yMin && oxygenMin <= yMax && (
          <g>
            <line
              x1={padLeft}
              y1={getY(oxygenMin)}
              x2={padLeft + chartWidth}
              y2={getY(oxygenMin)}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x={padLeft + chartWidth - 8}
              y={getY(oxygenMin) + 14}
              textAnchor="end"
              fill="#d97706"
              fontSize="10"
              fontWeight="bold"
            >
              Mín: {oxygenMin} mg/L
            </text>
          </g>
        )}

        {oxygenMax != null && oxygenMax >= yMin && oxygenMax <= yMax && (
          <g>
            <line
              x1={padLeft}
              y1={getY(oxygenMax)}
              x2={padLeft + chartWidth}
              y2={getY(oxygenMax)}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x={padLeft + chartWidth - 8}
              y={getY(oxygenMax) - 6}
              textAnchor="end"
              fill="#d97706"
              fontSize="10"
              fontWeight="bold"
            >
              Máx: {oxygenMax} mg/L
            </text>
          </g>
        )}

        {/* Polígono de relleno con degradado suave */}
        <polygon points={areaPointsString} fill="url(#oxygenAreaGradient)" />

        {/* Línea principal trazada con polilínea SVG */}
        <polyline
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pointsString}
        />

        {/* Puntos de datos interactivos */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredPoint?.index === i ? 5.5 : 2.5}
              fill={hoveredPoint?.index === i ? '#1d4ed8' : '#2563eb'}
              stroke="#ffffff"
              strokeWidth={hoveredPoint?.index === i ? 2 : 1}
              className="transition-all duration-150"
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={12}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint({ ...p, index: i })}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          </g>
        ))}

        {/* Etiquetas del eje X (Marcas temporales) */}
        {xLabels.map((lbl, idx) => (
          <g key={idx}>
            <line
              x1={lbl.x}
              y1={padTop + chartHeight}
              x2={lbl.x}
              y2={padTop + chartHeight + 6}
              strokeWidth="1"
              className="stroke-slate-200 dark:stroke-slate-700 transition-colors"
            />
            <text
              x={lbl.x}
              y={padTop + chartHeight + 20}
              textAnchor="middle"
              fontSize="11"
              fontFamily="system-ui, sans-serif"
              className="fill-slate-400 dark:fill-slate-500 font-medium transition-colors"
            >
              {lbl.label}
            </text>
          </g>
        ))}

        {/* Tooltip flotante al pasar el mouse por un punto */}
        {hoveredPoint && (
          <g transform={`translate(${hoveredPoint.x}, ${hoveredPoint.y - 45})`}>
            <rect
              x="-55"
              y="-10"
              width="110"
              height="36"
              rx="8"
              fill="#0f172a"
              className="dark:fill-slate-800 dark:stroke-slate-700"
              stroke="#1e293b"
              strokeWidth="1"
              filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))"
            />
            <polygon points="-6,26 6,26 0,31" fill="#0f172a" className="dark:fill-slate-800" />
            <text
              x="0"
              y="6"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="11"
              fontWeight="bold"
            >
              {hoveredPoint.value} mg/L
            </text>
            <text
              x="0"
              y="18"
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="9"
            >
              {hoveredPoint.timestamp}
            </text>
          </g>
        )}
      </svg>

      {/* Leyenda y unidades */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 px-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-600 rounded-full inline-block"></span>
            Nivel de Oxígeno (mg/L)
          </span>
          {(oxygenMin != null || oxygenMax != null) && (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <span className="w-3 h-0.5 border-t border-dashed border-amber-500 inline-block"></span>
              Límites Operacionales
            </span>
          )}
        </div>
        <span>Hora de Chile</span>
      </div>
    </div>
  )
}
