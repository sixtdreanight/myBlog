import type { AnimeEvent } from './types'
import { STATUS_COLORS } from './types'

interface Props {
  events: AnimeEvent[]
  favorites: Set<string>
  onToggleFav: (id: string) => void
  onSelect: (event: AnimeEvent) => void
}

export default function AnimeList({ events, favorites, onToggleFav, onSelect }: Props) {
  return (
    <div className="divide-y divide-primary">
      {events.map(e => (
        <div
          key={e.id}
          onClick={() => onSelect(e)}
          className="py-3 md:py-4 px-2 -mx-2 rounded cursor-pointer group hover:bg-accent/5 transition-colors"
        >
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm md:text-base group-hover:text-accent transition-colors truncate">{e.title}</div>
              <div className="text-xs md:text-sm text-secondary mt-0.5">
                <span>{e.startDate}</span>
                <span className="mx-1">·</span>
                <span>{e.city}{e.venue ? ` · ${e.venue}` : ''}</span>
              </div>
            </div>
            <button
              onClick={ev => { ev.stopPropagation(); onToggleFav(e.id) }}
              className={`shrink-0 text-lg ${favorites.has(e.id) ? 'text-accent' : 'text-secondary'} hover:text-accent transition-colors`}
            >
              {favorites.has(e.id) ? '★' : '☆'}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1.5 ml-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[e.status]}`} />
            <span className="text-xs text-secondary">{e.status}</span>
            {e.confidence < 1 && <span className="text-[10px] px-1 rounded bg-accent/10 text-accent">AI</span>}
            <span className="text-xs text-secondary ml-auto">{e.priceRange || '待定'}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
