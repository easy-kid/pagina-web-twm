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

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null

  const value = payload[0].value

  return (
    <div className="bg-slate-900/95 dark:bg-slate-800/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-white">
      <p className="text-xs text-slate-400 mb-1 font-medium">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-bold text-blue-400">{value}</span>
        <span className="text-xs text-slate-400 font-medium">mg/L</span>
      </div>
      <p className="text-[10px] text-slate-500 mt-1">Oxígeno Disuelto</p>
    </div>
  )
}

export default function OxygenHistoryChart({
  data = [],
  oxygenMin = null,
  oxygenMax = null,
}) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm font-medium">
        No hay datos suficientes para graficar.
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 15, right: 25, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="oxygenAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            {/* Cuadrícula suave */}
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="stroke-slate-200 dark:stroke-slate-800"
              opacity={0.5}
            />

            {/* Eje X (marcas temporales con espaciado inteligente) */}
            <XAxis
              dataKey="timestamp"
              tickLine={false}
              axisLine={{ stroke: '#475569', opacity: 0.2 }}
              tick={{ fontSize: 11 }}
              className="text-slate-500 dark:text-slate-400 fill-current"
              minTickGap={35}
            />

            {/* Eje Y calibrado con margen suficiente para evitar cortes de texto */}
            <YAxis
              tickLine={false}
              axisLine={{ stroke: '#475569', opacity: 0.2 }}
              tick={{ fontSize: 11 }}
              className="text-slate-500 dark:text-slate-400 fill-current"
              tickFormatter={(v) => `${Number(v).toFixed(1)} mg/L`}
              width={85}
              domain={['auto', 'auto']}
            />

            {/* Tooltip interactivo al pasar el cursor */}
            <Tooltip content={<CustomTooltip />} />

            {/* Líneas de umbral operacional exactas en el eje Y */}
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

            {/* Curva de oxígeno con relleno azul degradado */}
            <Area
              type="monotone"
              dataKey="value"
              name="Oxígeno Disuelto"
              stroke="#2563eb"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#oxygenAreaGradient)"
              activeDot={{
                r: 6,
                fill: '#2563eb',
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Leyenda y rangos operacionales */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-3 px-2 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 bg-blue-600 rounded-full inline-block"></span>
            Oxígeno Disuelto (mg/L)
          </span>
          {(oxygenMin != null || oxygenMax != null) && (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
              <span className="w-3 h-0.5 border-t border-dashed border-amber-500 inline-block"></span>
              Rango Operacional: {oxygenMin != null ? `Mín ${oxygenMin} mg/L` : ''} {oxygenMax != null ? `- Máx ${oxygenMax} mg/L` : ''}
            </span>
          )}
        </div>
        <span>Hora de Chile</span>
      </div>
    </div>
  )
}
