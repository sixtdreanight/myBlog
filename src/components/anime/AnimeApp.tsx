import { useState, useMemo, useCallback } from 'react'
import type { AnimeEvent, ViewMode } from './types'
import AnimeCalendar from './AnimeCalendar'
import AnimeList from './AnimeList'
import AnimeFilter from './AnimeFilter'
import AnimeDetail from './AnimeDetail'
import { Modal } from '@/components/ui/modal/Modal'

interface Props {
  initialEvents: AnimeEvent[]
}

function loadFavorites(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem('anime_favs') || '[]'))
  } catch { return new Set() }
}

function saveFavorites(favs: Set<string>) {
  localStorage.setItem('anime_favs', JSON.stringify([...favs]))
}

export default function AnimeApp({ initialEvents }: Props) {
  const [view, setView] = useState<ViewMode>('list')
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites)
  const [filter, setFilter] = useState({ category: '全部', city: '', search: '', favOnly: false })
  const [activeSources, setActiveSources] = useState<Set<string>>(new Set())
  const [detail, setDetail] = useState<AnimeEvent | null>(null)

  const toggleFav = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      saveFavorites(next)
      return next
    })
  }, [])

  const toggleSource = useCallback((s: string) => {
    setActiveSources(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }, [])

  const sources = useMemo(() => [...new Set(initialEvents.map(e => e.sourceName))], [initialEvents])
  const cities = useMemo(() => [...new Set(initialEvents.map(e => e.city).filter(Boolean))].sort(), [initialEvents])

  const filtered = useMemo(() => {
    return initialEvents.filter(e => {
      if (filter.category !== '全部' && e.category !== filter.category) return false
      if (filter.city && e.city !== filter.city) return false
      if (filter.search && !e.title.includes(filter.search) && !e.venue.includes(filter.search)) return false
      if (filter.favOnly && !favorites.has(e.id)) return false
      if (activeSources.size > 0 && !activeSources.has(e.sourceName)) return false
      return true
    })
  }, [initialEvents, filter, favorites, activeSources])

  const handleExportIcal = () => {
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AnimeEvents//CN',
    ]
    for (const e of filtered) {
      const d = e.startDate.replace(/-/g, '')
      const d2 = e.endDate ? e.endDate.replace(/-/g, '') : d
      lines.push(
        'BEGIN:VEVENT',
        `UID:${e.id}`,
        `DTSTART;VALUE=DATE:${d}`,
        `DTEND;VALUE=DATE:${d2}`,
        `SUMMARY:${e.title}`,
        `LOCATION:${e.city} ${e.venue}`,
        `DESCRIPTION:${e.priceRange || ''} ${e.ticketUrl || ''}`,
        'END:VEVENT',
      )
    }
    lines.push('END:VCALENDAR')
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'anime-events.ics'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCsv = () => {
    const header = '标题,分类,城市,场馆,开始日期,结束日期,票价,状态,来源,购票链接'
    const rows = filtered.map(e =>
      [e.title, e.category, e.city, e.venue, e.startDate, e.endDate || '',
       e.priceRange || '', e.status, e.sourceName, e.ticketUrl || '']
        .map(v => `"${v.replace(/"/g, '""')}"`).join(',')
    )
    const blob = new Blob(['﻿' + [header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'anime-events.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <AnimeFilter
        view={view} filter={filter} cities={cities} sources={sources}
        onViewChange={setView} onFilterChange={setFilter}
        onSourceToggle={toggleSource} activeSources={activeSources}
      />

      <div className="mt-6">
        {view === 'calendar' ? (
          <AnimeCalendar
            events={filtered}
            favorites={favorites}
            onToggleFav={toggleFav}
            onSelect={setDetail}
          />
        ) : (
          <AnimeList
            events={filtered}
            favorites={favorites}
            onToggleFav={toggleFav}
            onSelect={setDetail}
          />
        )}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-secondary">暂无符合条件的演出</div>
      )}

      <div className="mt-6 md:mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm text-secondary">
        <span>共 {filtered.length} 场演出</span>
        <div className="flex gap-4">
          <button onClick={handleExportIcal} className="hover:text-accent transition-colors">
            <i className="iconfont icon-calendar" /> 导出 iCal
          </button>
          <button onClick={handleExportCsv} className="hover:text-accent transition-colors">
            <i className="iconfont icon-file-list" /> 导出 CSV
          </button>
        </div>
      </div>

      {detail && (
        <Modal index={0} id={`event-${detail.id}`}>
          <AnimeDetail
            event={detail}
            isFavorite={favorites.has(detail.id)}
            onToggleFav={toggleFav}
            onClose={() => setDetail(null)}
          />
        </Modal>
      )}
    </div>
  )
}
