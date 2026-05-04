import type { AnimeEvent } from './types'
import { STATUS_COLORS } from './types'

interface Props {
  event: AnimeEvent
  isFavorite: boolean
  onToggleFav: (id: string) => void
  onClose: () => void
}

export default function AnimeDetail({ event, isFavorite, onToggleFav, onClose }: Props) {
  return (
    <div className="bg-primary rounded-lg border border-primary max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
      {event.imageUrl && (
        <img src={event.imageUrl} alt={event.title} className="w-full aspect-video object-cover rounded-t-lg" />
      )}
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold">{event.title}</h2>
          <button
            onClick={() => onToggleFav(event.id)}
            className={`text-xl shrink-0 ${isFavorite ? 'text-accent' : 'text-secondary'} hover:text-accent transition-colors`}
          >
            {isFavorite ? '★' : '☆'}
          </button>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          {event.city && (
            <div className="flex items-center gap-2 text-secondary">
              <i className="iconfont icon-map" /> {event.city}{event.venue ? ` · ${event.venue}` : ''}
            </div>
          )}
          <div className="flex items-center gap-2 text-secondary">
            <i className="iconfont icon-calendar" />
            {event.startDate}{event.endDate ? ` - ${event.endDate}` : ''}
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[event.status]}`} />
            <span className="text-secondary">{event.status}</span>
          </div>
          <div className="text-secondary">
            票价：{event.priceRange || '待公布'}
          </div>
          <div className="text-secondary">
            来源：{event.sourceName}{event.confidence < 1 ? ` (置信度 ${Math.round(event.confidence * 100)}%)` : ''}
          </div>
        </div>

        {event.ticketUrl && (
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-4 px-4 py-2 bg-accent text-white rounded-lg
                       hover:opacity-90 transition-opacity text-sm font-bold"
          >
            前往购票 <i className="iconfont icon-external-link" />
          </a>
        )}

        <button
          onClick={onClose}
          className="mt-4 ml-4 px-4 py-2 text-sm text-secondary hover:text-accent transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  )
}
