import { useState, useEffect } from 'react'

interface TimelineNode {
  id: string
  time: string
  title: string
  description: string
  evidenceRefs: string[]
}

interface Props {
  nodes: TimelineNode[]
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${m}-${day} ${h}:${min}`
}

export default function TimelineView({ nodes }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  const toggle = (id: string) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpanded(next)
  }

  const sorted = [...nodes].sort(
    (a, b) => a.time.localeCompare(b.time)
  )

  return (
    <div className="relative pl-8">
      <div className="absolute left-[9px] top-0 bottom-0 w-px bg-[var(--border-primary)]" />

      <div className="space-y-0">
        {sorted.map((node, i) => {
          const isOpen = expanded.has(node.id)
          const isFirst = i === 0
          const delay = 80 + i * 60

          return (
            <div
              key={node.id}
              className="relative pb-6 last:pb-0"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(-8px)',
                transition: `opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms`,
              }}
            >
              {/* Node dot */}
              <button
                onClick={() => toggle(node.id)}
                className="absolute left-[-24px] top-0.5 group"
                aria-label={node.title}
              >
                <span
                  className={`block w-[13px] h-[13px] rounded-full transition-all ${
                    isFirst
                      ? 'bg-[var(--accent)] ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-primary)]'
                      : 'border-2 border-[var(--border-primary)] bg-[var(--bg-primary)] group-hover:border-[var(--accent)]'
                  }`}
                />
              </button>

              <button
                onClick={() => toggle(node.id)}
                className="w-full text-left"
              >
                <div className="flex items-baseline gap-3 flex-wrap">
                  <time className="text-[11px] font-mono tabular-nums text-[var(--text-secondary)] shrink-0">
                    {formatTime(node.time)}
                  </time>
                  <h5
                    className={`text-sm transition-colors ${
                      isFirst
                        ? 'font-bold text-[var(--text-primary)]'
                        : 'font-medium text-[var(--text-primary)]'
                    }`}
                  >
                    {node.title}
                  </h5>
                  {node.evidenceRefs.length > 0 && (
                    <span className="text-[10px] font-mono tabular-nums text-[var(--accent)] opacity-60">
                      [{node.evidenceRefs.length}]
                    </span>
                  )}
                </div>
              </button>

              <div
                className="overflow-hidden transition-all duration-300"
                style={{
                  maxHeight: isOpen ? '200px' : '0px',
                  opacity: isOpen ? 1 : 0,
                }}
              >
                <div className="mt-2 ml-0 pl-4 border-l-2 border-[var(--border-primary)]">
                  <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                    {node.description}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
