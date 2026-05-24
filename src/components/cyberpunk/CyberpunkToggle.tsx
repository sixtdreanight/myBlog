import { useAtom } from 'jotai'
import { useEffect, useCallback } from 'react'
import { cyberpunkModeAtom, persistCyberpunkMode } from '@/store/cyberpunk'
import { motion } from 'framer-motion'

export function CyberpunkToggle() {
  const [enabled, setEnabled] = useAtom(cyberpunkModeAtom)

  const triggerPowerAnimation = useCallback((powerOn: boolean) => {
    const cls = powerOn ? 'cyberpunk-power-on' : 'cyberpunk-power-off'
    document.body.classList.add(cls)
    setTimeout(() => document.body.classList.remove(cls), 700)
  }, [])

  const toggle = useCallback(() => {
    const next = !enabled
    setEnabled(next)
    triggerPowerAnimation(next)
  }, [enabled, setEnabled, triggerPowerAnimation])

  useEffect(() => {
    persistCyberpunkMode(enabled)
    document.body.setAttribute('data-cyberpunk', enabled ? 'on' : 'off')

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'cyberpunk-mode') {
        const next = e.newValue === 'on'
        setEnabled(next)
        document.body.setAttribute('data-cyberpunk', next ? 'on' : 'off')
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [enabled, setEnabled])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  return (
    <div className="fixed right-4 bottom-20 z-[260]">
      <motion.button
        id="cyberpunk-toggle"
        className={`size-10 rounded-full border flex items-center justify-center cyberpunk-exempt ${enabled ? 'cyberpunk-active' : ''}`}
        type="button"
        aria-label={enabled ? 'Disable industrial mode' : 'Enable industrial mode'}
        onClick={toggle}
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <i className={`iconfont text-lg ${enabled ? 'icon-ghost' : 'icon-computer'}`}></i>
      </motion.button>
    </div>
  )
}
