import { useMemo, useEffect, useState, type ComponentType } from 'react'
import type { TimelineNode, EvidenceNode, Edge } from './EventCard'

interface GraphNode {
  id: string
  label: string
  group: 'timeline' | 'evidence'
  nodeData: TimelineNode | EvidenceNode
}

interface GraphLink {
  source: string
  target: string
  type: string
  description: string
}

interface Props {
  timeline: TimelineNode[]
  evidence: EvidenceNode[]
  edges: Edge[]
}

const EDGE_COLORS: Record<string, string> = {
  '因果': '#ef4444',
  '关联': '#6b7280',
  '反驳': '#f59e0b',
}

const EDGE_DASH: Record<string, number[]> = {
  '因果': [],
  '关联': [4, 4],
  '反驳': [2, 2],
}

const AUTH_COLORS: Record<string, string> = {
  '真实': '#22c55e',
  '存疑': '#eab308',
  '不实': '#ef4444',
  '待验证': '#9ca3af',
}

export default function GraphView({ timeline, evidence, edges }: Props) {
  const [ForceGraph, setForceGraph] = useState<ComponentType<any>>()

  useEffect(() => {
    import('react-force-graph-2d').then((m) => setForceGraph(() => m.default))
  }, [])

  const { nodes, links } = useMemo(() => {
    const nodes: GraphNode[] = [
      ...timeline.map((t) => ({
        id: t.id,
        label: t.title,
        group: 'timeline' as const,
        nodeData: t,
      })),
      ...evidence.map((e) => ({
        id: e.id,
        label: e.sourceName,
        group: 'evidence' as const,
        nodeData: e,
      })),
    ]

    const links: GraphLink[] = edges.map((e) => ({
      source: e.from,
      target: e.to,
      type: e.type,
      description: e.description,
    }))

    return { nodes, links }
  }, [timeline, evidence, edges])

  const width = typeof window !== 'undefined' ? Math.min(window.innerWidth - 64, 800) : 800

  return (
    <div className="border border-[var(--border-primary)] rounded-lg overflow-hidden bg-[var(--bg-secondary)]" style={{ height: 500 }}>
      {ForceGraph ? (
        <ForceGraph
          graphData={{ nodes, links }}
          width={width}
          height={500}
          nodeLabel={(n: GraphNode) => n.label}
          nodeColor={(n: GraphNode) =>
            n.group === 'evidence'
              ? AUTH_COLORS[(n.nodeData as EvidenceNode).authenticity] || '#9ca3af'
              : 'var(--accent)'
          }
          nodeRelSize={6}
          linkColor={(l: GraphLink) => EDGE_COLORS[l.type] || '#6b7280'}
          linkLineDash={(l: GraphLink) => EDGE_DASH[l.type] || []}
          linkDirectionalArrowLength={6}
          linkDirectionalArrowRelPos={1}
          linkLabel={(l: GraphLink) => `${l.type} · ${l.description}`}
          backgroundColor="transparent"
          linkWidth={1.5}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-sm text-[var(--text-secondary)]">
          关系图加载中...
        </div>
      )}
    </div>
  )
}
