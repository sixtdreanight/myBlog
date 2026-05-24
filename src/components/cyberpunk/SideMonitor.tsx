import { useEffect, useState } from 'react'

const METRICS = [
  { label: 'CPU', unit: '%', max: 100 },
  { label: 'MEM', unit: '%', max: 100 },
  { label: 'NET', unit: 'KB', max: 500 },
  { label: 'DISK', unit: '%', max: 100 },
]

function randomMetric(max: number): number {
  return Math.round((Math.random() * max * 0.6 + max * 0.15) * 10) / 10
}

export function SideMonitor() {
  const [metrics, setMetrics] = useState(() => METRICS.map(m => ({ ...m, value: randomMetric(m.max) })))

  useEffect(() => {
    const id = setInterval(() => {
      setMetrics(prev => prev.map(m => ({ ...m, value: randomMetric(m.max) })))
    }, 2500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="khp-side-monitor" aria-hidden="true">
      <div className="khp-side-monitor-hd">
        <span className="khp-side-monitor-dot" />
        <span>SYS.MONITOR</span>
      </div>
      {metrics.map(m => (
        <div key={m.label} className="khp-side-monitor-row">
          <span className="khp-side-monitor-label">{m.label}</span>
          <div className="khp-side-monitor-bar-track">
            <div
              className="khp-side-monitor-bar-fill"
              style={{ width: `${(m.value / m.max) * 100}%` }}
            />
          </div>
          <span className="khp-side-monitor-val">{m.value}{m.unit}</span>
        </div>
      ))}
      <div className="khp-side-monitor-row khp-side-monitor-alert">
        <span className="khp-side-monitor-dot khp-side-monitor-dot--hazard" />
        <span>ALERT: NOMINAL</span>
      </div>
    </div>
  )
}
