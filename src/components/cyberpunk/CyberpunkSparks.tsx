import { useEffect, useRef } from 'react'

interface Spark {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; size: number
  hue: number; alpha: number
}

const MAX_SPARKS = 80
const SPAWN_RATE = 0.35
const BURST_RATE = 0.08
const GRAVITY = 0.003
const SHRINK = 0.998

export function CyberpunkSparks() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let sparks: Spark[] = []
    let animId = 0
    let w = 0, h = 0

    const resize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const spawn = () => {
      if (sparks.length >= MAX_SPARKS) return
      const x = Math.random() * w
      sparks.push({
        x, y: h - 20 - Math.random() * 40,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -(Math.random() * 0.8 + 0.3),
        life: 0,
        maxLife: 60 + Math.random() * 140,
        size: Math.random() * 2 + 0.8,
        hue: Math.random() < 0.7 ? 30 + Math.random() * 20 : 5 + Math.random() * 10,
        alpha: Math.random() * 0.5 + 0.2,
      })
    }

    const tick = () => {
      ctx.clearRect(0, 0, w, h)

      if (Math.random() < SPAWN_RATE) spawn()
      if (Math.random() < BURST_RATE) { spawn(); spawn() }

      const alive: Spark[] = []
      for (const s of sparks) {
        s.life++
        s.x += s.vx + Math.sin(s.life * 0.05) * 0.3
        s.y += s.vy
        s.vy -= GRAVITY
        s.size *= SHRINK

        const progress = s.life / s.maxLife
        const alpha = s.alpha * (1 - progress) * (0.6 + 0.4 * Math.sin(progress * Math.PI))

        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${s.hue}, 90%, 55%, ${alpha})`
        ctx.fill()

        if (s.size > 1.2 && progress < 0.6) {
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.size * 2.5, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${s.hue}, 100%, 60%, ${alpha * 0.12})`
          ctx.fill()
        }

        if (s.life < s.maxLife && s.y > -20) alive.push(s)
      }
      sparks = alive

      animId = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="khp-sparks-canvas"
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 3, pointerEvents: 'none',
        opacity: 'var(--spark-opacity, 0.7)',
      }}
    />
  )
}
