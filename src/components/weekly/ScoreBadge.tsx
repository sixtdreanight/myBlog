interface ScoreBadgeProps {
  label: string
  score: number
}

export default function ScoreBadge({ label, score }: ScoreBadgeProps) {
  const pct = (score / 5) * 100

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--text-secondary)] tracking-wide uppercase">
        {label}
      </span>
      <span className="text-sm font-bold tabular-nums text-[var(--text-primary)]">
        {score.toFixed(1)}
      </span>
      <div className="w-12 h-1 rounded-full bg-[var(--border-primary)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
