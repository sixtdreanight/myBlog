import type { EvidenceNode } from './EventCard'

interface Props {
  evidence: EvidenceNode[]
}

const AUTH_STYLES: Record<string, string> = {
  '真实': 'border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-400',
  '存疑': 'border-amber-500/40 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-400',
  '不实': 'border-red-500/40 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-400',
  '待验证': 'border-dashed border-gray-400/40 bg-gray-50 text-gray-600 dark:border-gray-500/30 dark:bg-gray-950/30 dark:text-gray-400',
}

export default function EvidenceView({ evidence }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-primary)] text-left">
            <th className="py-2 pr-4 text-xs font-medium text-[var(--text-secondary)] tracking-wide w-16">
              判定
            </th>
            <th className="py-2 pr-4 text-xs font-medium text-[var(--text-secondary)] tracking-wide w-16">
              来源类型
            </th>
            <th className="py-2 pr-4 text-xs font-medium text-[var(--text-secondary)] tracking-wide">
              来源
            </th>
            <th className="py-2 text-xs font-medium text-[var(--text-secondary)] tracking-wide">
              内容
            </th>
          </tr>
        </thead>
        <tbody>
          {evidence.map((e) => (
            <tr key={e.id} className="border-b border-[var(--border-primary)] last:border-0">
              <td className="py-3 pr-4">
                <span className={`inline-block px-2 py-0.5 text-xs rounded border ${AUTH_STYLES[e.authenticity]}`}>
                  {e.authenticity}
                </span>
              </td>
              <td className="py-3 pr-4 text-xs text-[var(--text-secondary)] tabular-nums">
                {e.sourceType}
              </td>
              <td className="py-3 pr-4">
                <div className="text-xs font-medium text-[var(--text-primary)]">
                  {e.sourceName}
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs">
                  {e.aiReason}
                </div>
              </td>
              <td className="py-3 text-xs text-[var(--text-primary)] leading-relaxed">
                {e.content}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
