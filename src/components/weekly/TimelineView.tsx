import { useState } from 'react'

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

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function hasEvidence(node: TimelineNode): boolean {
  return node.evidenceRefs.length > 0
}

export default function TimelineView({ nodes }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpanded(next)
  }

  const sorted = [...nodes].sort((a, b) => a.time.localeCompare(b.time))

  return (
    <div className="relative pl-6">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[var(--border-primary)]" />

      <div className="space-y-0">
        {sorted.map((node, i) => {
          const isOpen = expanded.has(node.id)
          const isFirst = i === 0
          return (
            <div key={node.id} className="relative pb-5 last:pb-0">
              <span
                className={`absolute left-[-20px] top-1.5 w-[15px] h-[15px] rounded-full border-2 border-[var(--border-primary)] bg-[var(--bg-primary)] ${
                  isFirst ? 'ring-2 ring-[var(--accent)] border-[var(--accent)]' : ''
                } ${hasEvidence(node) ? '' : 'bg-[var(--bg-secondary)]'}`}
              />

              <button
                onClick={() => toggle(node.id)}
                className="w-full text-left group"
              >
                <time className="text-xs font-mono tabular-nums text-[var(--text-secondary)] tracking-tight">
                  {formatTime(node.time)}
                </time>
                <h5 className="mt-0.5 text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                  {node.title}
                </h5>
              </button>

              {isOpen && (
                <div className="mt-2 ml-0 text-sm text-[var(--text-secondary)] leading-relaxed">
                  {node.description}
                  {node.evidenceRefs.length > 0 && (
                    <span className="ml-2 text-xs text-[var(--accent)] font-mono tabular-nums">
                      [{node.evidenceRefs.length} 条证据]
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
