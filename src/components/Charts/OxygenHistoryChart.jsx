import { useState, useEffect } from 'react'
import Chart from 'react-apexcharts'

export default function OxygenHistoryChart({
  data = [],
  oxygenMin = null,
  oxygenMax = null,
}) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return false
  })

  // Sincroniza el tema del gráfico con el modo oscuro de la aplicación
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm font-medium">
        No hay datos suficientes para graficar.
      </div>
    )
  }

  // Serie de mediciones
  const series = [
    {
      name: 'Oxígeno Disuelto',
      data: data.map((d) => d.value),
    },
  ]

  // Líneas de umbral operacional exactas en el eje Y
  const yaxisAnnotations = []
  if (oxygenMin != null) {
    yaxisAnnotations.push({
      y: oxygenMin,
      borderColor: '#f59e0b',
      borderWidth: 1.5,
      strokeDashArray: 4,
      label: {
        borderColor: '#f59e0b',
        style: {
          color: '#ffffff',
          background: '#d97706',
          fontSize: '10px',
          fontWeight: 'bold',
          padding: { left: 6, right: 6, top: 2, bottom: 2 },
        },
        text: `Mínimo: ${oxygenMin} mg/L`,
        position: 'right',
      },
    })
  }

  if (oxygenMax != null) {
    yaxisAnnotations.push({
      y: oxygenMax,
      borderColor: '#f59e0b',
      borderWidth: 1.5,
      strokeDashArray: 4,
      label: {
        borderColor: '#f59e0b',
        style: {
          color: '#ffffff',
          background: '#d97706',
          fontSize: '10px',
          fontWeight: 'bold',
          padding: { left: 6, right: 6, top: 2, bottom: 2 },
        },
        text: `Máximo: ${oxygenMax} mg/L`,
        position: 'right',
      },
    })
  }

  // Opciones de configuración de ApexCharts
  const options = {
    chart: {
      type: 'area',
      height: 290,
      fontFamily: 'inherit',
      background: 'transparent',
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 600,
      },
    },
    theme: {
      mode: isDark ? 'dark' : 'light',
    },
    colors: ['#2563eb'],
    stroke: {
      curve: 'smooth',
      width: 2.5,
      colors: ['#2563eb'],
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: isDark ? 0.45 : 0.4,
        opacityTo: 0.05,
        stops: [0, 95, 100],
      },
    },
    dataLabels: {
      enabled: false,
    },
    grid: {
      borderColor: isDark ? '#1e293b' : '#e2e8f0',
      strokeDashArray: 3,
      xaxis: {
        lines: { show: false },
      },
      yaxis: {
        lines: { show: true },
      },
      padding: {
        top: 10,
        right: 20,
        bottom: 0,
        left: 15,
      },
    },
    xaxis: {
      categories: data.map((d) => d.timestamp),
      tickAmount: 8,
      labels: {
        rotate: 0,
        style: {
          colors: isDark ? '#94a3b8' : '#64748b',
          fontSize: '11px',
        },
        hideOverlappingLabels: true,
      },
      axisBorder: {
        show: true,
        color: isDark ? '#334155' : '#cbd5e1',
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      labels: {
        formatter: (val) => `${val.toFixed(1)} mg/L`,
        style: {
          colors: isDark ? '#94a3b8' : '#64748b',
          fontSize: '11px',
        },
      },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: {
        formatter: (val) => `${val} mg/L`,
      },
      x: {
        show: true,
      },
    },
    annotations: {
      yaxis: yaxisAnnotations,
    },
  }

  return (
    <div className="w-full">
      <div className="w-full h-[290px]">
        <Chart options={options} series={series} type="area" height="100%" />
      </div>

      {/* Leyenda y rangos operacionales */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 px-2 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 bg-blue-600 rounded-full inline-block"></span>
            Nivel de Oxígeno Disuelto (mg/L)
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
