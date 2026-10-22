import { AreaChart } from '@tremor/react'

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

  // Preparamos los datos con la categoría a mostrar
  const chartData = data.map((d) => ({
    timestamp: d.timestamp,
    'Oxígeno': d.value,
  }))

  const dataFormatter = (number) => `${number} mg/L`

  return (
    <div className="w-full">
      <AreaChart
        className="h-72 mt-2"
        data={chartData}
        index="timestamp"
        categories={['Oxígeno']}
        colors={['blue']}
        valueFormatter={dataFormatter}
        yAxisWidth={60}
        showAnimation={true}
        showLegend={false}
      />

      {/* Leyenda y rangos operacionales */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-4 px-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 bg-blue-600 rounded-full inline-block"></span>
            Oxígeno Disuelto (mg/L)
          </span>
          {(oxygenMin != null || oxygenMax != null) && (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              Rango Operacional: {oxygenMin != null ? `Mín ${oxygenMin} mg/L` : ''} {oxygenMax != null ? `- Máx ${oxygenMax} mg/L` : ''}
            </span>
          )}
        </div>
        <span>Hora de Chile</span>
      </div>
    </div>
  )
}
