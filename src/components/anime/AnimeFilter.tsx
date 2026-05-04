import type { ViewMode } from './types'
import { CATEGORIES } from './types'

interface FilterState {
  category: string
  city: string
  search: string
  favOnly: boolean
}

interface Props {
  view: ViewMode
  filter: FilterState
  cities: string[]
  sources: string[]
  onViewChange: (v: ViewMode) => void
  onFilterChange: (f: FilterState) => void
  onSourceToggle: (s: string) => void
  activeSources: Set<string>
}

export default function AnimeFilter({
  view, filter, cities, sources,
  onViewChange, onFilterChange, onSourceToggle, activeSources,
}: Props) {
  const update = (patch: Partial<FilterState>) => onFilterChange({ ...filter, ...patch })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => update({ category: cat })}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              filter.category === cat
                ? 'bg-accent text-white'
                : 'bg-accent/10 hover:bg-accent/20'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="搜索演出..."
          value={filter.search}
          onChange={e => update({ search: e.target.value })}
          className="px-3 py-1.5 text-sm rounded-lg border border-primary bg-secondary w-40
                     focus:outline-none focus:border-accent/50 transition-colors"
        />
        <select
          value={filter.city}
          onChange={e => update({ city: e.target.value })}
          className="px-3 py-1.5 text-sm rounded-lg border border-primary bg-secondary
                     focus:outline-none focus:border-accent/50 transition-colors"
        >
          <option value="">全部城市</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-1 text-sm text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={filter.favOnly}
            onChange={e => update({ favOnly: e.target.checked })}
            className="accent-accent"
          />
          仅收藏
        </label>

        <div className="ml-auto flex items-center gap-1">
          {(['calendar', 'list'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => onViewChange(mode)}
              className={`px-2 py-1 rounded text-sm transition-colors ${
                view === mode ? 'bg-accent text-white' : 'bg-accent/10 hover:bg-accent/20'
              }`}
            >
              <i className={`iconfont icon-${mode === 'calendar' ? 'calendar' : 'file-list'}`} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-secondary">来源:</span>
        {sources.map(s => (
          <label key={s} className="flex items-center gap-1 text-xs text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={activeSources.has(s)}
              onChange={() => onSourceToggle(s)}
              className="accent-accent"
            />
            {s}
          </label>
        ))}
      </div>
    </div>
  )
}
