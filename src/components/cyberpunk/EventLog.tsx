import { useEffect, useState } from 'react'

const MESSAGES = [
  'SYS: heartbeat OK',
  'NET: packet acknowledged',
  'IO:  buffer flushed',
  'RTR: route table updated',
  'SYS: clock synced',
  'MEM: page reclaimed',
  'DISK: write complete',
  'SYS: task scheduled',
  'NET: latency spike (12ms)',
  'GPU: frame committed',
  'CACHE: entry evicted',
  'SYS: daemon restarted',
]

function timestamp(): string {
  const d = new Date()
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join(':')
}

export function EventLog() {
  const [lines, setLines] = useState<{ ts: string; msg: string }[]>(() =>
    Array.from({ length: 6 }, (_, i) => ({ ts: timestamp(), msg: MESSAGES[i] }))
  )

  useEffect(() => {
    let idx = 6
    const id = setInterval(() => {
      setLines(prev => {
        const next = [...prev, { ts: timestamp(), msg: MESSAGES[idx % MESSAGES.length] }]
        idx++
        return next.slice(-6)
      })
    }, 1800)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="khp-event-log" aria-hidden="true">
      <div className="khp-event-log-hd">
        <span className="khp-event-log-dot" />
        <span>EVENT LOG</span>
      </div>
      {lines.map((l, i) => (
        <div key={i} className="khp-event-log-line">
          <span className="khp-event-log-ts">[{l.ts}]</span>
          <span>{l.msg}</span>
        </div>
      ))}
    </div>
  )
}
