import { useEffect, useRef, useState, useCallback } from 'react'
import { useAtomValue } from 'jotai'
import { cyberpunkModeAtom } from '@/store/cyberpunk'

const BOOT_SHOWN_KEY = 'cyberpunk-boot-shown'

const STEPS = [
  { id: 'core', message: '[BOOT] 核心总线已接通 // CORE BUS LINKED' },
  { id: 'assets', message: '[ASST] 视觉资源已就绪 // ASSETS READY' },
  { id: 'render', message: '[RDY ] 首帧已提交 // FIRST FRAME COMMITTED' },
]

function Spinner() {
  return (
    <span className="boot-spinner" aria-hidden="true">
      <span /><span /><span />
    </span>
  )
}

export function CyberpunkBoot() {
  const enabled = useAtomValue(cyberpunkModeAtom)
  const [phase, setPhase] = useState<'hidden' | 'entering' | 'printing' | 'exiting' | 'done'>('hidden')
  const [lines, setLines] = useState<{ text: string; spinner?: boolean }[]>([])
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('同步总线中 / SYNCING BUS...')
  const finishedRef = useRef(false)
  const queueRef = useRef<{ message: string; spinner?: boolean; done?: () => void }[]>([])
  const printingRef = useRef(false)

  const pushLine = useCallback((message: string, spinner?: boolean) =>
    new Promise<void>((resolve) => {
      queueRef.current.push({ message, spinner, done: resolve })
      flushQueue()
    }), [])

  const flushQueue = useCallback(() => {
    if (printingRef.current || queueRef.current.length === 0) return
    printingRef.current = true
    const { message, spinner, done } = queueRef.current.shift()!
    setLines((prev) => [...prev, { text: message, spinner }])
    setTimeout(() => { printingRef.current = false; done?.(); flushQueue() }, 80)
  }, [])

  useEffect(() => {
    if (!enabled || typeof sessionStorage === 'undefined') {
      document.body.removeAttribute('data-boot-state')
      return
    }
    if (sessionStorage.getItem(BOOT_SHOWN_KEY)) {
      document.body.removeAttribute('data-boot-state')
      return
    }
    sessionStorage.setItem(BOOT_SHOWN_KEY, '1')

    setPhase('entering')
    setTimeout(() => { setPhase('printing'); runBoot() }, 200)

    const fallback = setTimeout(() => {
      if (finishedRef.current) return
      finishedRef.current = true
      setPhase('exiting')
      setTimeout(() => {
        setPhase('done')
        document.body.removeAttribute('data-boot-state')
        document.body.classList.add('cyberpunk-power-on')
        window.dispatchEvent(new CustomEvent('cyberpunk:boot-done'))
        setTimeout(() => document.body.classList.remove('cyberpunk-power-on'), 400)
      }, 400)
    }, 4000)

    return () => clearTimeout(fallback)
  }, [enabled, pushLine])

  // Clean up leaked state when swup navigates away from homepage
  useEffect(() => {
    const cleanup = () => {
      document.documentElement.classList.remove('khp-scroll-locked')
      document.body.style.overflow = ''
      window.dispatchEvent(new CustomEvent('khp:cleanup'))
    }
    document.addEventListener('swup:content:replace', cleanup)
    return () => document.removeEventListener('swup:content:replace', cleanup)
  }, [])

  async function runBoot() {
    setStatusText('同步总线中 / SYNCING BUS...')
    await pushLine('[INIT] 开始加载系统资源', true)

    const completed = new Set<string>()
    for (const step of STEPS) {
      completed.add(step.id)
      await pushLine(step.message)
      setProgress(completed.size / STEPS.length)
    }

    setStatusText('准备完成，释放界面 / READY // RELEASING')
    await pushLine('[SYS ] 系统已预加载完成，正在进入系统 // ENTERING')
    finishedRef.current = true
    await new Promise(r => setTimeout(r, 300))
    setPhase('exiting')
    setTimeout(() => {
      setPhase('done')
      document.body.removeAttribute('data-boot-state')
      document.body.classList.add('cyberpunk-power-on')
      window.dispatchEvent(new CustomEvent('cyberpunk:boot-done'))
      setTimeout(() => document.body.classList.remove('cyberpunk-power-on'), 400)
    }, 400)
  }

  if (phase === 'hidden' || phase === 'done') return null

  return (
    <div
      id="cyberpunk-boot-overlay"
      className={`cyberpunk-boot ${phase === 'entering' ? 'boot-enter' : ''} ${phase === 'exiting' ? 'boot-exit' : ''}`}
      aria-live="polite"
      aria-busy="true"
    >
      {/* Internal CRT effects */}
      <div className="boot-inner-scanlines" aria-hidden="true" />
      <div className="boot-inner-beam" aria-hidden="true" />
      <div className="boot-inner-flicker" aria-hidden="true" />
      <div className="boot-inner-vignette" aria-hidden="true" />

      <div className="boot-terminal">
        <div className="boot-label">启动磁带 / BOOT TAPE // SIDE A</div>

        <div className="boot-screen">
          <div className="boot-header">
            <span>系统启动 / SYS_BOOT // 首页初始化 / HOMEPAGE_INIT</span>
            <span className="boot-status">{statusText}</span>
          </div>

          <div className="boot-log">
            <div className="boot-log-line boot-log-initial">
              <span>[INIT] 开始加载系统资源</span>
              <Spinner />
            </div>
            {lines.map((line, i) => (
              <div key={i} className="boot-log-line">
                <span>{line.text}</span>
                {line.spinner && <Spinner />}
              </div>
            ))}
          </div>

          <div className="boot-progress">
            <span style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      </div>

      <style>{`
        .cyberpunk-boot {
          position: fixed; inset: 0; z-index: 99999;
          background: #080a0c; color: #ccb878;
          font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .boot-enter { animation: bootFadeIn 0.5s ease-out forwards; }
        .boot-exit  { animation: bootFadeOut 0.7s ease-in forwards; }
        @keyframes bootFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bootFadeOut { from { opacity: 1; } to { opacity: 0; } }

        /* Internal CRT effects */
        .boot-inner-scanlines {
          position: absolute; inset: 0; pointer-events: none; z-index: 2;
          background: repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px);
        }
        .boot-inner-beam {
          position: absolute; inset: 0; pointer-events: none; z-index: 1;
          background: linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%);
          background-size: 100% 20%; background-repeat: no-repeat;
          animation: bootBeamSweep 10s linear infinite;
        }
        @keyframes bootBeamSweep {
          0% { background-position: 0 -100vh; }
          100% { background-position: 0 200vh; }
        }
        .boot-inner-flicker {
          position: absolute; inset: 0; pointer-events: none; z-index: 3;
          background: rgba(255,176,0,0.02); opacity: 0;
          animation: bootFlicker 0.3s infinite;
        }
        @keyframes bootFlicker {
          0%,100% { opacity: 0; } 50% { opacity: 1; }
        }
        .boot-inner-vignette {
          position: absolute; inset: 0; pointer-events: none; z-index: 4;
          background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%);
        }

        /* Terminal window */
        .boot-terminal {
          position: relative; z-index: 10;
          width: 100%; max-width: 580px; padding: 0 24px;
        }
        .boot-label {
          font-size: 0.68rem; letter-spacing: 0.08em; text-align: center;
          color: rgba(204,184,120,0.4); margin-bottom: 16px;
          text-transform: uppercase;
        }

        .boot-screen {
          border: 1px solid rgba(204,184,120,0.12);
          padding: 20px 24px;
          position: relative;
        }
        /* Corner brackets */
        .boot-screen::before, .boot-screen::after {
          content: ""; position: absolute; width: 8px; height: 8px;
          border-color: rgba(204,184,120,0.3); border-style: solid; border-width: 0;
        }
        .boot-screen::before { top: 0; left: 0; border-top-width: 1px; border-left-width: 1px; }
        .boot-screen::after  { bottom: 0; right: 0; border-bottom-width: 1px; border-right-width: 1px; }

        .boot-header {
          display: flex; justify-content: space-between; align-items: baseline;
          padding-bottom: 12px; margin-bottom: 14px;
          border-bottom: 1px solid rgba(204,184,120,0.1);
          font-size: 0.68rem; letter-spacing: 0.04em;
          color: rgba(204,184,120,0.5);
        }
        .boot-status { color: rgba(204,184,120,0.35); }

        .boot-log {
          height: 200px; overflow: hidden; margin-bottom: 16px;
          font-size: 0.78rem; line-height: 2;
          text-shadow: 0 0 4px rgba(204,184,120,0.2);
        }
        .boot-log-line {
          display: flex; align-items: center; gap: 6px; opacity: 0.8;
        }
        .boot-log-initial { opacity: 1; }

        .boot-spinner {
          display: inline-flex; align-items: center; gap: 3px;
        }
        .boot-spinner span {
          width: 4px; height: 4px; border-radius: 50%;
          background: #ccb878; box-shadow: 0 0 4px rgba(204,184,120,0.5);
          animation: spinnerDot 0.8s ease-in-out infinite;
        }
        .boot-spinner span:nth-child(2) { animation-delay: 0.15s; }
        .boot-spinner span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes spinnerDot {
          0%,100% { opacity: 0.2; transform: scale(0.8); }
          50%     { opacity: 1; transform: scale(1.2); }
        }

        .boot-progress {
          width: 100%; height: 1px; background: rgba(204,184,120,0.08);
        }
        .boot-progress span {
          display: block; height: 100%;
          background: #ccb878; box-shadow: 0 0 6px rgba(204,184,120,0.4);
          transition: width 0.3s ease;
        }
      `}</style>
    </div>
  )
}
