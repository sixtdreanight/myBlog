import { useEffect, useRef, useState } from 'react'
import { useAtomValue } from 'jotai'
import { cyberpunkModeAtom } from '@/store/cyberpunk'

const NAV = [
  { href: '/', label: 'HOME' },
  { href: '/archives', label: 'ARCHIVE' },
  { href: '/projects', label: 'PROJECTS' },
  { href: '/weekly', label: 'WEEKLY' },
  { href: '/about', label: 'ABOUT' },
  { href: '/friends', label: 'FRIENDS' },
]

function formatTime(): string {
  const d = new Date()
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':')
}

export function CyberpunkHeader() {
  const enabled = useAtomValue(cyberpunkModeAtom)
  const [time, setTime] = useState(formatTime())
  const xRef = useRef<HTMLSpanElement>(null)
  const yRef = useRef<HTMLSpanElement>(null)

  // Original header is hidden via CSS (header.fixed.top-0:not(.khp-hdr))
  // CSS is more reliable than JS polling — no race conditions

  useEffect(() => { const id = setInterval(() => setTime(formatTime()), 1000); return () => clearInterval(id) }, [])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (xRef.current) xRef.current.textContent = String(Math.round(e.clientX)).padStart(4, '0')
      if (yRef.current) yRef.current.textContent = String(Math.round(e.clientY)).padStart(4, '0')
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  if (!enabled) return null

  return (
    <header className="khp-hdr">
      <div className="khp-hdr-left">
        <a href="/" className="khp-hdr-logo" title="回首页" onClick={() => {
          window.dispatchEvent(new CustomEvent('kappa:pager-seek', { detail: { index: 0 } }))
        }}>
          <span className="khp-hdr-name">梦夜的工厂</span>
          <span className="khp-hdr-sub">热爱创造的极地空想家</span>
        </a>
      </div>

      <div className="khp-hdr-right">
        <div className="khp-hdr-info">
          <span className="khp-hdr-dot" title="SYS.ONLINE" />
          <span className="khp-hdr-label">SYS</span>
          <span className="khp-hdr-val">ONLINE</span>
        </div>

        <div className="khp-hdr-info">
          <span className="khp-hdr-label">CURSOR</span>
          <span className="khp-hdr-bracket">[</span>
          <span className="khp-hdr-val">X:<span ref={xRef}>0000</span></span>
          <span className="khp-hdr-val">Y:<span ref={yRef}>0000</span></span>
          <span className="khp-hdr-bracket">]</span>
        </div>

        <div className="khp-hdr-info">
          <span className="khp-hdr-label">TIME</span>
          <span className="khp-hdr-bracket">[</span>
          <span className="khp-hdr-val">{time}</span>
          <span className="khp-hdr-blink" />
          <span className="khp-hdr-bracket">]</span>
        </div>

        <nav className="khp-hdr-nav">
          {NAV.map(n => (
            <a key={n.href} href={n.href} className="khp-hdr-navlink">
              <span className="khp-hdr-bracket">[</span>{n.label}<span className="khp-hdr-bracket">]</span>
            </a>
          ))}
        </nav>
      </div>
    </header>
  )
}
