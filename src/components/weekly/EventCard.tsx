import { useState } from 'react'
import ScoreBadge from './ScoreBadge'
import TimelineView from './TimelineView'
import GraphView from './GraphView'
import EvidenceView from './EvidenceView'

export interface TimelineNode {
  id: string
  time: string
  title: string
  description: string
  evidenceRefs: string[]
}

export interface EvidenceNode {
  id: string
  sourceType: '官媒' | '社交平台' | '一手材料' | '其他'
  sourceName: string
  sourceUrl: string | null
  content: string
  authenticity: '真实' | '存疑' | '不实' | '待验证'
  aiReason: string
}

export interface Edge {
  from: string
  to: string
  type: '因果' | '关联' | '反驳'
  description: string
}

interface Event {
  id: string
  title: string
  impactScore: number
  infoGainScore: number
  summary: string
  timeline: TimelineNode[]
  evidence: EvidenceNode[]
  edges: Edge[]
}

interface Props {
  event: Event
  index: number
}

type Tab = 'timeline' | 'graph' | 'evidence'

const TAB_LABELS: Record<Tab, string> = {
  timeline: '时间线',
  graph: '关系网',
  evidence: '证据',
}

export default function EventCard({ event, index }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('timeline')

  return (
    <section className="border border-[var(--border-primary)] rounded-lg bg-[var(--bg-primary)]">
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <span className="text-xs text-[var(--text-secondary)] font-mono tabular-nums tracking-wide">
              # {index + 1}
            </span>
            <h2 className="mt-1 text-lg font-bold text-[var(--text-primary)] tracking-wide">
              {event.title}
            </h2>
          </div>
          <div className="flex gap-5 shrink-0">
            <ScoreBadge label="影响" score={event.impactScore} />
            <ScoreBadge label="增量" score={event.infoGainScore} />
          </div>
        </div>

        <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
          {event.summary}
        </p>

        <div className="mt-4 flex gap-1 border-b border-[var(--border-primary)]">
          {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-xs tracking-wide transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {TAB_LABELS[tab]}
              {tab === 'timeline' && (
                <span className="ml-1 text-[10px] tabular-nums">({event.timeline.length})</span>
              )}
              {tab === 'evidence' && (
                <span className="ml-1 text-[10px] tabular-nums">({event.evidence.length})</span>
              )}
              {tab === 'graph' && (
                <span className="ml-1 text-[10px] tabular-nums">({event.edges.length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 pt-4">
        {activeTab === 'timeline' && <TimelineView nodes={event.timeline} />}
        {activeTab === 'graph' && (
          <GraphView
            timeline={event.timeline}
            evidence={event.evidence}
            edges={event.edges}
          />
        )}
        {activeTab === 'evidence' && <EvidenceView evidence={event.evidence} />}
      </div>
    </section>
  )
}
