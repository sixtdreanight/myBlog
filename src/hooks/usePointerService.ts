import { useEffect, useRef } from 'react'

export interface PointerState {
  x: number
  y: number
  insideViewport: boolean
}

type PointerCallback = (state: PointerState) => void

const state: PointerState = {
  x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
  y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
  insideViewport: false,
}

const subscribers = new Set<PointerCallback>()
let frameScheduled = false

function notifySubscribers() {
  frameScheduled = false
  subscribers.forEach((cb) => cb({ ...state }))
}

function scheduleNotify() {
  if (frameScheduled) return
  frameScheduled = true
  requestAnimationFrame(notifySubscribers)
}

function handlePointerMove(event: PointerEvent) {
  state.x = event.clientX
  state.y = event.clientY
  state.insideViewport = true
  scheduleNotify()
}

function handlePointerLeave() {
  state.insideViewport = false
  scheduleNotify()
}

let listenersInitialized = false

function initGlobalListeners() {
  if (listenersInitialized || typeof window === 'undefined') return
  listenersInitialized = true
  window.addEventListener('pointermove', handlePointerMove, { passive: true })
  window.addEventListener('pointerdown', handlePointerMove, { passive: true })
  window.addEventListener('pointerleave', handlePointerLeave, { passive: true })
}

export function usePointerService(callback: PointerCallback) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    initGlobalListeners()

    const wrappedCallback: PointerCallback = (s) => callbackRef.current(s)
    subscribers.add(wrappedCallback)

    return () => {
      subscribers.delete(wrappedCallback)
    }
  }, [])
}

export function getPointerState(): PointerState {
  return { ...state }
}

export function getLocalPoint(
  element: HTMLElement | null,
  pointerState: PointerState = state,
) {
  if (!element) {
    return { x: 0, y: 0, rect: null, inside: false }
  }

  const rect = element.getBoundingClientRect()
  const x = pointerState.x - rect.left
  const y = pointerState.y - rect.top
  const inside =
    pointerState.insideViewport &&
    rect.width > 0 &&
    rect.height > 0 &&
    x >= 0 &&
    y >= 0 &&
    x <= rect.width &&
    y <= rect.height

  return { x, y, rect, inside }
}
