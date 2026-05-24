import { useEffect, useRef, useCallback } from 'react'

const CELL_SIZE = 52
const INITIAL_LENGTH = 1
const GROWTH_STEP = 1

interface Props {
  active: boolean
}

export function CyberpunkSnakeBg({ active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    columns: 0, rows: 0, running: false, frameId: 0,
    snake: [] as { x: number; y: number }[],
    food: null as { x: number; y: number } | null,
    snakeLen: INITIAL_LENGTH,
    pointerIn: false, targetCell: null as { x: number; y: number } | null,
  })

  const randomCell = useCallback(() => ({
    x: Math.floor(Math.random() * stateRef.current.columns),
    y: Math.floor(Math.random() * stateRef.current.rows),
  }), [])

  const key = (c: { x: number; y: number }) => `${c.x},${c.y}`

  const spawnFood = useCallback(() => {
    const s = stateRef.current
    if (!s.columns || !s.rows) { s.food = null; return }
    const occupied = new Set(s.snake.map(key))
    for (let i = 0; i < s.columns * s.rows; i++) {
      const f = randomCell()
      if (!occupied.has(key(f))) { s.food = f; return }
    }
    s.food = null
  }, [randomCell])

  const draw = useCallback(() => {
    const s = stateRef.current
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    for (let x = 0; x <= s.columns; x++) {
      const px = Math.round(x * CELL_SIZE) + 0.5
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, height); ctx.stroke()
    }
    for (let y = 0; y <= s.rows; y++) {
      const py = Math.round(y * CELL_SIZE) + 0.5
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(width, py); ctx.stroke()
    }

    // Snake
    s.snake.forEach((cell, i) => {
      const ratio = s.snake.length <= 1 ? 1 : (i + 1) / s.snake.length
      const alpha = 0.16 + ratio * 0.5
      const px = cell.x * CELL_SIZE + Math.max(4, CELL_SIZE * 0.12)
      const py = cell.y * CELL_SIZE + Math.max(4, CELL_SIZE * 0.12)
      const size = CELL_SIZE - Math.max(4, CELL_SIZE * 0.12) * 2
      ctx.fillStyle = `rgba(196,138,28,${alpha.toFixed(3)})`
      ctx.strokeStyle = `rgba(255,196,72,${(alpha + 0.08).toFixed(3)})`
      ctx.lineWidth = 1
      ctx.fillRect(px, py, size, size)
      ctx.strokeRect(px, py, size, size)
    })

    // Food
    if (s.food) {
      const px = s.food.x * CELL_SIZE + Math.max(6, CELL_SIZE * 0.18)
      const py = s.food.y * CELL_SIZE + Math.max(6, CELL_SIZE * 0.18)
      const size = CELL_SIZE - Math.max(6, CELL_SIZE * 0.18) * 2
      ctx.fillStyle = 'rgba(110,24,18,0.96)'
      ctx.shadowColor = 'rgba(145,38,28,0.38)'
      ctx.shadowBlur = 12
      ctx.fillRect(px, py, size, size)
      ctx.shadowBlur = 0
    }
  }, [])

  const move = useCallback(() => {
    const s = stateRef.current
    if (!s.pointerIn || !s.targetCell) return

    const head = s.snake[s.snake.length - 1]
    if (!head) { s.snake.push({ ...s.targetCell }); return }
    if (head.x === s.targetCell.x && head.y === s.targetCell.y) return

    const next = { ...head }
    if (head.x !== s.targetCell.x) next.x += Math.sign(s.targetCell.x - head.x)
    else if (head.y !== s.targetCell.y) next.y += Math.sign(s.targetCell.y - head.y)

    s.snake.push(next)
    if (s.food && next.x === s.food.x && next.y === s.food.y) {
      s.snakeLen += GROWTH_STEP
      spawnFood()
    }
    if (s.snake.length > s.snakeLen) s.snake = s.snake.slice(s.snake.length - s.snakeLen)
  }, [spawnFood])

  const loop = useCallback((_t: number) => {
    const s = stateRef.current
    if (!s.running) return
    move()
    draw()
    s.frameId = requestAnimationFrame(loop)
  }, [move, draw])

  // Resize + init
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return
    const rect = parent.getBoundingClientRect()
    const w = Math.max(1, Math.floor(rect.width))
    const h = Math.max(1, Math.floor(rect.height))
    canvas.width = w; canvas.height = h
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`

    const s = stateRef.current
    s.columns = Math.max(1, Math.floor(w / CELL_SIZE))
    s.rows = Math.max(1, Math.floor(h / CELL_SIZE))
    s.snake = []
    s.snakeLen = INITIAL_LENGTH
    s.pointerIn = false
    s.targetCell = null
    spawnFood()
    draw()
  }, [spawnFood, draw])

  // Pointer tracking — only when page is active
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !active) return
    const parent = canvas.parentElement
    if (!parent) return

    const onMove = (e: PointerEvent) => {
      const s = stateRef.current
      const rect = parent.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        s.pointerIn = false; s.targetCell = null; return
      }
      s.pointerIn = true
      s.targetCell = {
        x: Math.min(s.columns - 1, Math.max(0, Math.floor(x / CELL_SIZE))),
        y: Math.min(s.rows - 1, Math.max(0, Math.floor(y / CELL_SIZE))),
      }
    }
    const onLeave = () => { const s = stateRef.current; s.pointerIn = false; s.targetCell = null }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
    }
  }, [active])

  // Resize observer
  useEffect(() => {
    resizeCanvas()
    const ro = new ResizeObserver(resizeCanvas)
    const parent = canvasRef.current?.parentElement
    if (parent) ro.observe(parent)
    return () => ro.disconnect()
  }, [resizeCanvas])

  // Start/stop based on active
  useEffect(() => {
    const s = stateRef.current
    if (active) {
      resizeCanvas()
      s.running = true
      s.frameId = requestAnimationFrame(loop)
    } else {
      s.running = false
      if (s.frameId) cancelAnimationFrame(s.frameId)
    }
    return () => { s.running = false; if (s.frameId) cancelAnimationFrame(s.frameId) }
  }, [active, loop, resizeCanvas])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}
    />
  )
}
