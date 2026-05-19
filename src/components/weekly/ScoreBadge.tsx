interface ScoreBadgeProps {
  label: string
  score: number
}

const LABEL_MAP: Record<string, string> = {
  '影响': 'IMPACT',
  '增量': 'SIGNAL',
}

export default function ScoreBadge({ label, score }: ScoreBadgeProps) {
  const pct = (score / 5) * 100

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-[10px] text-[var(--text-secondary)] tracking-[0.15em] font-mono">
        {LABEL_MAP[label] || label}
      </span>
      <span className="text-xl font-bold tabular-nums text-[var(--text-primary)] leading-none">
        {score.toFixed(0)}
        <span className="text-[10px] text-[var(--text-secondary)] font-normal ml-px">
          /5
        </span>
      </span>
      <div className="w-16 h-[3px] rounded-full bg-[var(--border-primary)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background:
              score >= 4
                ? 'var(--accent)'
                : score >= 3
                  ? 'linear-gradient(90deg, var(--accent), #f59e0b)'
                  : '#9ca3af',
          }}
        />
      </div>
    </div>
  )
}
