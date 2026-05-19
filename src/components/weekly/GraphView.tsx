import { useMemo, useState, useRef } from 'react'

interface TimelineNode {
  id: string
  time: string
  title: string
  description: string
  evidenceRefs: string[]
}

interface EvidenceNode {
  id: string
  sourceType: string
  sourceName: string
  sourceUrl: string | null
  content: string
  authenticity: '真实' | '存疑' | '不实' | '待验证'
  aiReason: string
}

interface Edge {
  from: string
  to: string
  type: '因果' | '关联' | '反驳'
  description: string
}

interface Props {
  timeline: TimelineNode[]
  evidence: EvidenceNode[]
  edges: Edge[]
}

const AUTH_COLORS: Record<string, string> = {
  '真实': '#22c55e',
  '存疑': '#eab308',
  '不实': '#ef4444',
  '待验证': '#9ca3af',
}

const EDGE_COLORS: Record<string, string> = {
  '因果': '#ef4444',
  '关联': '#6b7280',
  '反驳': '#f59e0b',
}

interface LayoutNode {
  id: string
  x: number
  y: number
  label: string
  group: 'timeline' | 'evidence'
  color: string
  detail: string
}

interface LayoutEdge {
  from: string
  to: string
  fromPos: { x: number; y: number }
  toPos: { x: number; y: number }
  color: string
  dash: string
  label: string
}

export default function GraphView({ timeline, evidence, edges }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const { nodes, links, svgHeight } = useMemo(() => {
    const padding = 50
    const nodeRadius = 16
    const leftX = 80
    const rightX = 500
    const gap = 55
    const svgHeight = Math.max(
      Math.max(timeline.length, evidence.length) * gap + padding * 2 + 40,
      280
    )

    const nodeMap = new Map<string, LayoutNode>()

    timeline.forEach((t, i) => {
      nodeMap.set(t.id, {
        id: t.id,
        x: leftX,
        y: padding + i * gap + nodeRadius,
        label: t.title,
        group: 'timeline',
        color: 'var(--accent)',
        detail: t.description,
      })
    })

    evidence.forEach((e, i) => {
      nodeMap.set(e.id, {
        id: e.id,
        x: rightX,
        y: padding + i * gap + nodeRadius,
        label: e.sourceName,
        group: 'evidence',
        color: AUTH_COLORS[e.authenticity] || '#9ca3af',
        detail: `${e.authenticity} · ${e.aiReason}`,
      })
    })

    const links: LayoutEdge[] = edges
      .filter((e) => nodeMap.has(e.from) || nodeMap.has(e.to))
      .map((e) => {
        const fromN = nodeMap.get(e.from)
        const toN = nodeMap.get(e.to)
        const defaultPos = { x: leftX, y: padding }
        return {
          from: e.from,
          to: e.to,
          fromPos: fromN ? { x: fromN.x, y: fromN.y } : defaultPos,
          toPos: toN ? { x: toN.x, y: toN.y } : defaultPos,
          color: EDGE_COLORS[e.type] || '#6b7280',
          dash: e.type === '关联' ? '6,3' : e.type === '反驳' ? '3,3' : '',
          label: `${e.type} · ${e.description}`,
        }
      })

    return { nodes: Array.from(nodeMap.values()), links, svgHeight }
  }, [timeline, evidence, edges])

  return (
    <div className="overflow-x-auto border border-[var(--border-primary)] rounded-lg bg-[var(--bg-secondary)]">
      <svg
        ref={svgRef}
        viewBox={`0 0 600 ${svgHeight}`}
        className="block w-full"
        style={{ minHeight: svgHeight }}
      >
        {/* Edges */}
        {links.map((link, i) => {
          const cx = (link.fromPos.x + link.toPos.x) / 2
          const cy = (link.fromPos.y + link.toPos.y) / 2
          const isHovered =
            hoveredId === `${link.from}-${link.to}` ||
            hoveredId === link.from ||
            hoveredId === link.to

          return (
            <g key={`e-${i}`}>
              <line
                x1={link.fromPos.x}
                y1={link.fromPos.y}
                x2={link.toPos.x}
                y2={link.toPos.y}
                stroke={link.color}
                strokeWidth={isHovered ? 2.5 : 1.2}
                strokeDasharray={link.dash}
                opacity={hoveredId && !isHovered ? 0.15 : 0.6}
                className="transition-all cursor-pointer"
                onMouseEnter={() => setHoveredId(`${link.from}-${link.to}`)}
                onMouseLeave={() => setHoveredId(null)}
              />
              {isHovered && (
                <text
                  x={cx}
                  y={cy - 8}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--text-primary)"
                  className="pointer-events-none"
                >
                  {link.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Timeline nodes (circles) */}
        {nodes
          .filter((n) => n.group === 'timeline')
          .map((node) => {
            const isHovered = hoveredId === node.id
            const r = isHovered ? 18 : 14
            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r}
                  fill="var(--bg-primary)"
                  stroke={node.color}
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all"
                />
                <text
                  x={node.x}
                  y={node.y + 26}
                  textAnchor="middle"
                  fontSize="10"
                  fill={
                    isHovered
                      ? 'var(--accent)'
                      : 'var(--text-primary)'
                  }
                  className="transition-colors"
                >
                  {node.label.length > 8
                    ? node.label.slice(0, 8) + '…'
                    : node.label}
                </text>
                {isHovered && (
                  <text
                    x={node.x}
                    y={node.y - 22}
                    textAnchor="middle"
                    fontSize="9"
                    fill="var(--text-secondary)"
                    className="pointer-events-none"
                  >
                    {node.detail.length > 15
                      ? node.detail.slice(0, 15) + '…'
                      : node.detail}
                  </text>
                )}
              </g>
            )
          })}

        {/* Evidence nodes (diamonds) */}
        {nodes
          .filter((n) => n.group === 'evidence')
          .map((node) => {
            const isHovered = hoveredId === node.id
            const s = isHovered ? 13 : 10
            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <polygon
                  points={`${node.x},${node.y - s} ${node.x + s},${node.y} ${node.x},${node.y + s} ${node.x - s},${node.y}`}
                  fill={node.color}
                  opacity={
                    hoveredId && !isHovered ? 0.25 : 0.85
                  }
                  className="transition-all"
                />
                <text
                  x={node.x}
                  y={node.y + 22}
                  textAnchor="middle"
                  fontSize="10"
                  fill={
                    isHovered
                      ? node.color
                      : 'var(--text-primary)'
                  }
                  className="transition-colors"
                >
                  {node.label.length > 6
                    ? node.label.slice(0, 6) + '…'
                    : node.label}
                </text>
              </g>
            )
          })}

        {/* Legend */}
        <g transform={`translate(10, ${svgHeight - 12})`}>
          <circle cx="6" cy="-4" r="4" fill="var(--bg-primary)" stroke="var(--accent)" strokeWidth="1.5" />
          <text x="14" y="-1" fontSize="9" fill="var(--text-secondary)">
            事件节点
          </text>
          <polygon points="78,-8 82,-4 78,0 74,-4" fill="#22c55e" opacity="0.85" />
          <text x="86" y="-1" fontSize="9" fill="var(--text-secondary)">
            证据
          </text>
          <line x1="112" y1="-4" x2="130" y2="-4" stroke="#ef4444" strokeWidth="1.2" />
          <text x="134" y="-1" fontSize="9" fill="var(--text-secondary)">
            因果
          </text>
          <line x1="158" y1="-4" x2="176" y2="-4" stroke="#6b7280" strokeWidth="1.2" strokeDasharray="4,2" />
          <text x="180" y="-1" fontSize="9" fill="var(--text-secondary)">
            关联
          </text>
          <line x1="206" y1="-4" x2="224" y2="-4" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="2,2" />
          <text x="228" y="-1" fontSize="9" fill="var(--text-secondary)">
            反驳
          </text>
        </g>
      </svg>
    </div>
  )
}
