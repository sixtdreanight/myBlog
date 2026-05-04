import type { AnimeEvent } from './types'
import { STATUS_COLORS } from './types'

interface Props {
  event: AnimeEvent
  isFavorite: boolean
  onToggleFav: (id: string) => void
  onClick: () => void
}

export default function AnimeCard({ event, isFavorite, onToggleFav, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className="bg-accent/10 rounded-lg overflow-hidden group cursor-pointer hover:bg-accent/20 transition-colors"
    >
      {event.imageUrl ? (
        <div className="aspect-video overflow-hidden">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="aspect-video bg-accent/5 flex items-center justify-center">
          <i className="iconfont icon-calendar text-3xl text-secondary" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold group-hover:text-accent transition-colors line-clamp-2">{event.title}</h3>
          <button
            onClick={e => { e.stopPropagation(); onToggleFav(event.id) }}
            className={`text-lg shrink-0 ${isFavorite ? 'text-accent' : 'text-secondary'} hover:text-accent transition-colors`}
          >
            {isFavorite ? '★' : '☆'}
          </button>
        </div>
        <div className="text-sm text-secondary mt-1.5 space-y-0.5">
          {event.city && <div className="flex items-center gap-1"><i className="iconfont icon-map text-xs" />{event.city}{event.venue ? ` · ${event.venue}` : ''}</div>}
          <div className="flex items-center gap-1"><i className="iconfont icon-calendar text-xs" />{event.startDate}{event.endDate ? ` - ${event.endDate}` : ''}</div>
          <div>{event.priceRange || '价格待定'}</div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[event.status]}`} />
          <span className="text-xs text-secondary">{event.status}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent ml-auto">
            {event.sourceName}
            {event.confidence < 1 && ` ${Math.round(event.confidence * 100)}%`}
          </span>
        </div>
      </div>
    </div>
  )
}
