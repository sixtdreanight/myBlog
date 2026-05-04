export interface AnimeEvent {
  id: string
  sourceType: 'ticketing' | 'social'
  sourceName: string
  title: string
  category: string
  city: string
  venue: string
  startDate: string
  endDate: string | null
  priceRange: string | null
  ticketUrl: string | null
  imageUrl: string | null
  status: '售票中' | '即将开票' | '预告' | '已结束'
  confidence: number
  canonicalId: string | null
  scrapedAt: string | null
}

export type ViewMode = 'calendar' | 'card' | 'list'

export const STATUS_COLORS: Record<string, string> = {
  '售票中': 'bg-green-500',
  '即将开票': 'bg-amber-500',
  '预告': 'bg-accent',
  '已结束': 'bg-gray-400',
}

export const CATEGORIES = ['全部', '漫展', '同人展', '演唱会', '舞台剧', '其他'] as const
