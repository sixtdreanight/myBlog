import { useEffect, useRef } from 'react'

/**
 * Mouse-tracking for background grid & glow parallax.
 * Uses data-cyberpunk attribute directly (bypasses jotai atom timing).
 * Runs on ALL pages — keeps industrial atmosphere consistent.
 */
export function BackgroundParallax() {
  const rafRef = useRef(0)

  useEffect(() => {
    // Check the DOM attribute directly each frame — no atom dependency
    const onMove = (e: PointerEvent) => {
      if (document.body.getAttribute('data-cyberpunk') !== 'on') return

      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        const cx = e.clientX / window.innerWidth
        const cy = e.clientY / window.innerHeight

        const grids = document.querySelectorAll<HTMLElement>('.cyberpunk-grid-base')
        for (const el of grids) {
          el.style.setProperty('--gx', `${(cx - 0.5) * 24}px`)
          el.style.setProperty('--gy', `${(cy - 0.5) * 24}px`)
        }
        const glows = document.querySelectorAll<HTMLElement>('.cyberpunk-grid-glow, .khp-ambient-glow')
        for (const el of glows) {
          el.style.setProperty('--gx', `${40 + cx * 20}%`)
          el.style.setProperty('--gy', `${25 + cy * 20}%`)
        }
      })
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return null
}
