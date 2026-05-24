import { useEffect, useRef } from 'react'

/* ============================================
   Corner indicator + highlight rectangle system
   Replicates wenzhimo.xyz's indicator.js behavior
   ============================================ */

export function CyberpunkIndicator() {
  const indicatorRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const indicatorTarget = useRef<HTMLElement | null>(null)
  const highlightTarget = useRef<HTMLElement | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const indicator = indicatorRef.current
    const highlight = highlightRef.current
    if (!indicator || !highlight) return

    const GAP = 1

    function updateIndicator(el: HTMLElement) {
      const r = el.getBoundingClientRect()
      indicator!.style.opacity = '1'
      indicator!.style.width = `${r.width}px`
      indicator!.style.height = `${r.height}px`
      indicator!.style.transform = `translate(${r.left}px, ${r.top}px)`

      const x = Math.round(r.left), y = Math.round(r.top)
      const w = Math.round(r.width), h = Math.round(r.height)
      const ts = Date.now()
      indicator!.setAttribute('data-info', `X:${x} Y:${y} W:${w} H:${h} TS:${ts}`)
    }

    function updateHighlight(el: HTMLElement) {
      const r = el.getBoundingClientRect()
      const innerW = Math.max(0, r.width - GAP * 2)
      const innerH = Math.max(0, r.height - GAP * 2)
      const x = r.left + GAP, y = r.top + GAP

      if (el === highlightTarget.current) {
        highlight!.style.transform = `translate(${x}px, ${y}px)`
        if (!animTimer.current) {
          highlight!.style.width = `${innerW}px`
          highlight!.style.height = `${innerH}px`
        }
        return
      }

      if (animTimer.current) { clearTimeout(animTimer.current); animTimer.current = null }

      const wasActive = highlightTarget.current !== null
      highlightTarget.current = el

      if (wasActive) {
        highlight!.style.transition = 'transform 0.45s cubic-bezier(.25,1,.5,1), width 0.35s cubic-bezier(.25,1,.5,1), height 0.35s cubic-bezier(.25,1,.5,1), opacity 0.2s ease'
        highlight!.style.opacity = '1'
        highlight!.style.transform = `translate(${x}px, ${y}px)`
        highlight!.style.width = `${innerW}px`
        highlight!.style.height = `${innerH}px`
      } else {
        highlight!.style.transition = 'none'
        highlight!.style.transform = `translate(${x}px, ${y}px)`
        highlight!.style.width = '0px'
        highlight!.style.height = '0px'
        highlight!.style.opacity = '1'
        void (highlight!.offsetHeight)
        animTimer.current = setTimeout(() => {
          highlight!.style.transition = 'width 0.2s ease-out, height 0.2s ease-out'
          highlight!.style.width = `${innerW}px`
          highlight!.style.height = `${innerH}px`
          animTimer.current = null
        }, 30)
      }
    }

    function hideHighlight() {
      const h = highlight!
      h.style.transition = 'transform 0.45s cubic-bezier(.25,1,.5,1), width 0.35s cubic-bezier(.25,1,.5,1), height 0.35s cubic-bezier(.25,1,.5,1), opacity 0.2s ease 0.1s'
      h.style.width = '0px'; h.style.height = '0px'; h.style.opacity = '0'
      highlightTarget.current = null
      if (animTimer.current) { clearTimeout(animTimer.current); animTimer.current = null }
    }

    const onOver = (e: PointerEvent) => {
      const target = e.target as HTMLElement

      const elIndicator = target.closest<HTMLElement>('[data-selectable]')
      if (elIndicator && elIndicator !== indicatorTarget.current) {
        indicatorTarget.current = elIndicator
        updateIndicator(elIndicator)
      }

      const elHighlight = target.closest<HTMLElement>('[data-selectable-highlight]')
      if (elHighlight) {
        if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null }
        if (elHighlight !== highlightTarget.current) updateHighlight(elHighlight)
      } else if (highlightTarget.current && !hideTimer.current) {
        hideTimer.current = setTimeout(() => { hideHighlight(); hideTimer.current = null }, 100)
      }
    }

    const onLeave = () => { if (highlightTarget.current) hideHighlight() }

    document.addEventListener('pointerover', onOver, true)
    document.addEventListener('pointerleave', onLeave)
    return () => {
      document.removeEventListener('pointerover', onOver, true)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <>
      <div ref={indicatorRef} id="cyberpunk-indicator" aria-hidden="true" />
      <div ref={highlightRef} id="cyberpunk-highlight" aria-hidden="true" />
    </>
  )
}
