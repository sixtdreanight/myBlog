import { useEffect, useRef } from 'react'

export function CyberpunkCursorDisplay() {
  const xRef = useRef<HTMLSpanElement>(null)
  const yRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (xRef.current) xRef.current.textContent = String(Math.round(e.clientX)).padStart(4, '0')
      if (yRef.current) yRef.current.textContent = String(Math.round(e.clientY)).padStart(4, '0')
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return (
    <span className="status-item">
      <span>SYS.CURSOR_LOC</span>
      <span>
        [ X:<span ref={xRef} style={{ color: 'rgb(255,183,0)' }}>0000</span>{' '}
        Y:<span ref={yRef} style={{ color: 'rgb(255,183,0)' }}>0000</span> ]
      </span>
    </span>
  )
}
