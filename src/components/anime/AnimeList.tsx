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
          className="py-4 flex items-center gap-4 cursor-pointer group hover:bg-accent/5 px-2 -mx-2 rounded transition-colors"
        >
          <div className="text-sm text-secondary w-24 shrink-0">{e.startDate}</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold group-hover:text-accent transition-colors truncate">{e.title}</div>
            <div className="text-sm text-secondary">{e.city}{e.venue ? ` · ${e.venue}` : ''}</div>
          </div>
          <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[e.status]}`} />
          <span className="text-xs text-secondary w-10 shrink-0">{e.status}</span>
          <span className="text-sm text-secondary w-20 text-right shrink-0">{e.priceRange || '待定'}</span>
          <button
            onClick={ev => { ev.stopPropagation(); onToggleFav(e.id) }}
            className={`${favorites.has(e.id) ? 'text-accent' : 'text-secondary'} hover:text-accent transition-colors`}
          >
            {favorites.has(e.id) ? '★' : '☆'}
          </button>
        </div>
      ))}
    </div>
  )
}
