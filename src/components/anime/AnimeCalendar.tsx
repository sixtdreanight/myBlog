import { useState, useMemo } from 'react'
import type { AnimeEvent } from './types'
import { STATUS_COLORS } from './types'

interface Props {
  events: AnimeEvent[]
  favorites: Set<string>
  onToggleFav: (id: string) => void
  onSelect: (event: AnimeEvent) => void
}

export default function AnimeCalendar({ events, favorites, onToggleFav, onSelect }: Props) {
  const [month, setMonth] = useState(() => new Date().getMonth())
  const [year, setYear] = useState(() => new Date().getFullYear())

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPad = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
    const cells: (number | null)[] = Array.from({ length: startPad }, () => null)
    for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d)
    return cells
  }, [year, month])

  const eventMap = useMemo(() => {
    const map: Record<string, AnimeEvent[]> = {}
    for (const e of events) {
      const day = e.startDate
      if (!map[day]) map[day] = []
      map[day].push(e)
    }
    return map
  }, [events])

  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const prev = () => (month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1))
  const next = () => (month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1))

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="p-2 hover:text-accent transition-colors">
          <i className="iconfont icon-left" />
        </button>
        <span className="text-lg font-bold">
          {year}年 {month + 1}月
        </span>
        <button onClick={next} className="p-2 hover:text-accent transition-colors">
          <i className="iconfont icon-right" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-primary rounded-lg border border-primary overflow-hidden">
        {['一', '二', '三', '四', '五', '六', '日'].map(d => (
          <div key={d} className="text-center text-xs text-secondary py-2 bg-secondary">{d}</div>
        ))}
        {days.map((d, i) => {
          if (d === null) return <div key={`e${i}`} className="bg-primary p-1 min-h-[64px]" />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          const dayEvents = eventMap[dateStr] || []
          const isToday = dateStr === today
          const isSelected = dateStr === selectedDate
          return (
            <div
              key={dateStr}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className={`p-1 min-h-[64px] cursor-pointer bg-primary hover:bg-accent/5 transition-colors ${
                isToday ? 'ring-1 ring-accent ring-inset' : ''
              } ${isSelected ? 'bg-accent/10' : ''}`}
            >
              <div className={`text-xs ${isToday ? 'font-bold text-accent' : 'text-secondary'}`}>{d}</div>
              <div className="flex flex-wrap gap-0.5 mt-0.5">
                {dayEvents.slice(0, 3).map(e => (
                  <span
                    key={e.id}
                    className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_COLORS[e.status]}`}
                    title={e.title}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-secondary">+{dayEvents.length - 3}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {selectedDate && eventMap[selectedDate] && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-bold text-secondary">{selectedDate}</h3>
          {(eventMap[selectedDate] || []).map(e => (
            <div
              key={e.id}
              onClick={() => onSelect(e)}
              className="p-4 bg-accent/10 rounded-lg cursor-pointer group hover:bg-accent/20 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold group-hover:text-accent transition-colors">{e.title}</div>
                  <div className="text-sm text-secondary mt-1">
                    {e.city && <span>{e.city} · </span>}
                    {e.venue && <span>{e.venue} · </span>}
                    {e.priceRange || '待定'}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[e.status]}`} />
                    <span className="text-xs text-secondary">{e.status}</span>
                    {e.confidence < 1 && <span className="text-[10px] px-1 rounded bg-accent/10 text-accent">AI</span>}
                    <span className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                      {e.sourceName}
                    </span>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onToggleFav(e.currentTarget.dataset.id!) }}
                  data-id={e.id}
                  className={`text-lg ${favorites.has(e.id) ? 'text-accent' : 'text-secondary'} hover:text-accent transition-colors`}
                >
                  {favorites.has(e.id) ? '★' : '☆'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
