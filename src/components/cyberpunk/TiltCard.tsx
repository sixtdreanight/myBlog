import { useRef, useCallback, type ReactNode } from 'react'
import { usePointerService, getLocalPoint } from '@/hooks/usePointerService'
import type { PointerState } from '@/hooks/usePointerService'

interface TiltCardProps {
  children: ReactNode
  className?: string
  [key: string]: unknown
}

export function TiltCard({ children, className, ...rest }: TiltCardProps) {
  const extraProps = rest as Record<string, unknown>
  // Filter out non-DOM props
  const domProps: Record<string, unknown> = {}
  for (const key of Object.keys(extraProps)) {
    if (key.startsWith('data-')) domProps[key] = extraProps[key]
  }
  const cardRef = useRef<HTMLDivElement>(null)

  const handlePointer = useCallback(
    (state: PointerState) => {
      const card = cardRef.current
      if (!card || state.insideViewport === false || document.hidden) {
        resetCardVars(card)
        return
      }

      const point = getLocalPoint(card, state)
      if (!point.inside || !point.rect) {
        resetCardVars(card)
        return
      }

      const ratioX = point.x / point.rect.width
      const ratioY = point.y / point.rect.height
      const centerX = ratioX - 0.5
      const centerY = ratioY - 0.5

      card.style.setProperty('--pointer-x', `${(ratioX * 100).toFixed(2)}%`)
      card.style.setProperty('--pointer-y', `${(ratioY * 100).toFixed(2)}%`)
      card.style.setProperty('--rotate-x', `${(-centerY * 12).toFixed(2)}deg`)
      card.style.setProperty('--rotate-y', `${(centerX * 18).toFixed(2)}deg`)
      card.style.setProperty('--card-scale', '1.03')
      card.style.setProperty('--glare-opacity', '0.35')
    },
    [],
  )

  usePointerService(handlePointer)

  return (
    <div
      ref={cardRef}
      className={className}
      {...domProps}
      style={{
        transform:
          'perspective(800px) rotateX(var(--rotate-x, 0deg)) rotateY(var(--rotate-y, 0deg)) scale(var(--card-scale, 1))',
        transition: 'transform 0.15s ease-out',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {children}
      <div
        className="pointer-events-none absolute inset-0 rounded-inherit"
        style={{
          background:
            'radial-gradient(circle at var(--pointer-x, 50%) var(--pointer-y, 50%), rgba(255,255,255,var(--glare-opacity, 0)) 0%, transparent 60%)',
        }}
        aria-hidden="true"
      />
    </div>
  )
}

function resetCardVars(card: HTMLElement | null) {
  if (!card) return
  card.style.setProperty('--rotate-x', '0deg')
  card.style.setProperty('--rotate-y', '0deg')
  card.style.setProperty('--card-scale', '1')
  card.style.setProperty('--glare-opacity', '0')
}
