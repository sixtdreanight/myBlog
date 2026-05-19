import { useState, useEffect, useRef } from 'react'
import ScoreBadge from './ScoreBadge'
import TimelineView from './TimelineView'
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
  classBias?: string
}

export interface Edge {
  from: string
  to: string
  type: '因果' | '关联' | '矛盾'
  description: string
}

interface ClassAnalysis {
  classNature: string
  contradiction: string
  historicalContext: string
}

interface Event {
  id: string
  title: string
  impactScore: number
  infoGainScore: number
  summary: string
  classAnalysis?: ClassAnalysis
  dialecticalSummary?: string
  timeline: TimelineNode[]
  evidence: EvidenceNode[]
  edges: Edge[]
}

interface Props {
  event: Event
  index: number
}

type Tab = 'analysis' | 'timeline' | 'evidence'

const TAB_INFO: Record<Tab, { label: string }> = {
  analysis: { label: '事件分析' },
  timeline: { label: '时间线' },
  evidence: { label: '证据' },
}

const CLASS_BIAS_COLORS: Record<string, string> = {
  '无产阶级立场': 'text-red-600 dark:text-red-400',
  '资产阶级立场': 'text-blue-600 dark:text-blue-400',
  '小资产阶级立场': 'text-amber-600 dark:text-amber-400',
  '帝国主义话语': 'text-purple-600 dark:text-purple-400',
  '待判断': 'text-gray-500',
}

export default function EventCard({ event, index }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('analysis')
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          obs.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const totalEvidence = event.evidence.length
  const verifiedCount = event.evidence.filter((e) => e.authenticity === '真实').length
  const disputedCount = event.evidence.filter(
    (e) => e.authenticity === '不实' || e.authenticity === '存疑'
  ).length

  const hasAnalysis =
    event.classAnalysis &&
    (event.classAnalysis.classNature ||
      event.classAnalysis.contradiction ||
      event.classAnalysis.historicalContext ||
      event.dialecticalSummary)

  return (
    <section
      ref={ref}
      className="border border-[var(--border-primary)] bg-[var(--bg-primary)]"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(16px)',
        transition: `opacity 0.5s ease ${index * 120}ms, transform 0.5s ease ${index * 120}ms`,
      }}
    >
      <div className="px-6 pt-6 pb-3">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[10px] font-mono tabular-nums text-[var(--accent)] tracking-[0.15em]">
            REPORT #{String(index + 1).padStart(2, '0')}
          </span>
          <span className="flex-1 h-px bg-[var(--border-primary)]" />
          <span className="text-[10px] font-mono tabular-nums text-[var(--text-secondary)]">
            {event.timeline.length} 节点 · {totalEvidence} 证据
          </span>
        </div>

        <div className="flex items-start justify-between gap-8">
          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-wide leading-tight">
            {event.title}
          </h2>
          <div className="flex gap-6 shrink-0 pt-0.5">
            <ScoreBadge label="影响" score={event.impactScore} />
            <ScoreBadge label="辩证" score={event.infoGainScore} />
          </div>
        </div>

        <div className="flex gap-4 mt-3 text-[10px] font-mono tabular-nums text-[var(--text-secondary)]">
          <span>可信: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{verifiedCount}</span></span>
          <span>争议: <span className="text-amber-600 dark:text-amber-400 font-semibold">{disputedCount}</span></span>
          <span>待验: <span className="text-gray-500 font-semibold">{totalEvidence - verifiedCount - disputedCount}</span></span>
        </div>

        <div className="mt-4 pl-4 border-l-2 border-[var(--border-primary)]">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {event.summary}
          </p>
        </div>

        <div className="mt-5 flex gap-0 border-b-2 border-[var(--border-primary)] overflow-x-auto">
          {(Object.keys(TAB_INFO) as Tab[]).map((tab) => {
            const info = TAB_INFO[tab]
            const count =
              tab === 'timeline'
                ? event.timeline.length
                : tab === 'evidence'
                  ? event.evidence.length
                  : null
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-4 py-2.5 text-xs tracking-[0.1em] transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-[var(--accent)] font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {info.label}
                {count != null && (
                  <span className="ml-1.5 text-[10px] font-mono tabular-nums opacity-60">
                    {count}
                  </span>
                )}
                {activeTab === tab && (
                  <span className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-[var(--accent)]" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-6 py-5">
        {activeTab === 'analysis' && (
          <div className="space-y-4">
            {hasAnalysis ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 border border-[var(--border-primary)]">
                    <p className="text-[10px] font-mono text-[var(--text-secondary)] tracking-[0.12em] uppercase mb-1">
                      阶级本质
                    </p>
                    <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
                      {event.classAnalysis?.classNature || '—'}
                    </p>
                  </div>
                  <div className="p-3 border border-[var(--border-primary)]">
                    <p className="text-[10px] font-mono text-[var(--text-secondary)] tracking-[0.12em] uppercase mb-1">
                      主要矛盾
                    </p>
                    <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
                      {event.classAnalysis?.contradiction || '—'}
                    </p>
                  </div>
                  <div className="p-3 border border-[var(--border-primary)]">
                    <p className="text-[10px] font-mono text-[var(--text-secondary)] tracking-[0.12em] uppercase mb-1">
                      历史语境
                    </p>
                    <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
                      {event.classAnalysis?.historicalContext || '—'}
                    </p>
                  </div>
                </div>
                {event.dialecticalSummary && (
                  <div className="p-4 border-l-2 border-[var(--accent)] bg-[var(--bg-secondary)]">
                    <p className="text-[10px] font-mono text-[var(--accent)] tracking-[0.12em] uppercase mb-1.5">
                      辩证总结
                    </p>
                    <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
                      {event.dialecticalSummary}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--text-secondary)] py-8 text-center">
                暂无分析数据。运行 AI pipeline 生成。
              </p>
            )}
          </div>
        )}

        {activeTab === 'timeline' && <TimelineView nodes={event.timeline} />}

        {activeTab === 'evidence' && <EvidenceView evidence={event.evidence} />}
      </div>
    </section>
  )
}
