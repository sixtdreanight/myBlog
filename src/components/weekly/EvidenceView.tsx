import type { EvidenceNode } from './EventCard'

interface Props {
  evidence: EvidenceNode[]
}

const AUTH_CONFIG: Record<string, { border: string; bg: string; text: string; icon: string }> = {
  '真实': {
    border: 'border-emerald-600/60',
    bg: 'bg-emerald-100 dark:bg-emerald-950/50',
    text: 'text-emerald-700 dark:text-emerald-400',
    icon: '◆',
  },
  '存疑': {
    border: 'border-amber-500/60',
    bg: 'bg-amber-100 dark:bg-amber-950/50',
    text: 'text-amber-700 dark:text-amber-400',
    icon: '◇',
  },
  '不实': {
    border: 'border-red-500/60',
    bg: 'bg-red-100 dark:bg-red-950/50',
    text: 'text-red-700 dark:text-red-400',
    icon: '✕',
  },
  '待验证': {
    border: 'border-dashed border-gray-400/60',
    bg: 'bg-gray-100 dark:bg-gray-900/50',
    text: 'text-gray-500 dark:text-gray-400',
    icon: '○',
  },
}

export default function EvidenceView({ evidence }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-[var(--border-primary)] text-left">
            <th className="py-2.5 pr-4 text-[10px] font-semibold text-[var(--text-secondary)] tracking-[0.12em] uppercase w-[72px]">
              Verdict
            </th>
            <th className="py-2.5 pr-4 text-[10px] font-semibold text-[var(--text-secondary)] tracking-[0.12em] uppercase w-[72px]">
              Type
            </th>
            <th className="py-2.5 pr-4 text-[10px] font-semibold text-[var(--text-secondary)] tracking-[0.12em] uppercase">
              Source
            </th>
            <th className="py-2.5 text-[10px] font-semibold text-[var(--text-secondary)] tracking-[0.12em] uppercase">
              Content
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-primary)]">
          {evidence.map((e) => {
            const cfg = AUTH_CONFIG[e.authenticity]
            return (
              <tr
                key={e.id}
                className="group hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <td className="py-3 pr-4 align-top">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold rounded-sm border ${cfg.border} ${cfg.bg} ${cfg.text}`}
                    style={{ letterSpacing: '0.05em' }}
                  >
                    <span className="text-[8px]">{cfg.icon}</span>
                    {e.authenticity}
                  </span>
                </td>
                <td className="py-3 pr-4 align-top text-[11px] font-mono text-[var(--text-secondary)] tabular-nums">
                  {e.sourceType}
                </td>
                <td className="py-3 pr-4 align-top">
                  <div className="text-[12px] font-semibold text-[var(--text-primary)]">
                    {e.sourceName}
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--text-secondary)] leading-relaxed italic">
                    {e.aiReason}
                  </div>
                </td>
                <td className="py-3 align-top text-[12px] text-[var(--text-primary)] leading-relaxed">
                  {e.content}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
