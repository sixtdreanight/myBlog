import { useEffect, useRef } from 'react'
import { useAtomValue } from 'jotai'
import { cyberpunkModeAtom } from '@/store/cyberpunk'

const MIN_INTERVAL = 5000
const MAX_INTERVAL = 30000
const MIN_DURATION = 200
const MAX_DURATION = 500

export function GlitchTrigger() {
  const enabled = useAtomValue(cyberpunkModeAtom)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const scheduleNext = () => {
      const interval = MIN_INTERVAL + Math.random() * (MAX_INTERVAL - MIN_INTERVAL)
      timerRef.current = setTimeout(() => {
        const duration = MIN_DURATION + Math.random() * (MAX_DURATION - MIN_DURATION)
        document.body.classList.add('cyberpunk-glitch-active')
        setTimeout(() => {
          document.body.classList.remove('cyberpunk-glitch-active')
        }, duration)
        scheduleNext()
      }, interval)
    }

    scheduleNext()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      document.body.classList.remove('cyberpunk-glitch-active')
    }
  }, [enabled])

  return null
}
