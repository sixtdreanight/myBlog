import { useEffect, useRef, useState, useCallback } from 'react'
import { useAtomValue } from 'jotai'
import { cyberpunkModeAtom } from '@/store/cyberpunk'
import { CyberpunkSnakeBg } from './CyberpunkSnakeBg'
import { CyberpunkIndicator } from './CyberpunkIndicator'
import { SideMonitor } from './SideMonitor'
import { EventLog } from './EventLog'

const TOTAL = 5

const TICKER_ITEMS = [
  'SYS.ONLINE',
  'NODE:PRIMARY',
  'UPTIME:99.98%',
  'TEMP:42°C',
  'LOAD:23%',
  'PACKETS:SECURE',
  'LATENCY:4ms',
  'PWR:STABLE',
  'FAN:1800RPM',
  'MEM:62%',
  'DISK:38%',
  'SIG:ACTIVE',
]

export function CyberpunkHomepage() {
  const enabled = useAtomValue(cyberpunkModeAtom)
  const [activeIndex, setActiveIndex] = useState(0)
  const [stagedIndex, setStagedIndex] = useState(0) // trails activeIndex by 1 frame for entrance animation
  const [entering, setEntering] = useState(false)
  const [tearing, setTearing] = useState(false)
  const pagesRef = useRef<(HTMLElement | null)[]>([])
  const animatingRef = useRef(false)
  const lastActiveRef = useRef(0)
  const stagedRaf = useRef(0)

  // Entrance — restart stagger-reveal animations when boot completes
  useEffect(() => {
    if (!enabled) return

    const doEntrance = () => {
      // Restart stagger animations: briefly remove .on from active page, reflow, re-add
      const activePage = document.querySelector('.khp-page.on') as HTMLElement | null
      if (activePage) {
        activePage.classList.remove('on')
        void activePage.offsetHeight
        activePage.classList.add('on')
      }
      // Wipe sweep
      setEntering(true)
      setTimeout(() => setEntering(false), 1400)
    }

    // Boot already shown (subsequent visits) — entrance after short settle
    if (sessionStorage.getItem('cyberpunk-boot-shown')) {
      const t = setTimeout(doEntrance, 150)
      return () => clearTimeout(t)
    }

    // First visit — wait for boot-done event
    const onBootDone = () => doEntrance()
    window.addEventListener('cyberpunk:boot-done', onBootDone, { once: true })
    return () => window.removeEventListener('cyberpunk:boot-done', onBootDone)
  }, [enabled])

  // Lock body scroll while homepage is mounted via CSS class (swup-safe)
  useEffect(() => {
    if (!enabled) return
    document.documentElement.classList.add('khp-scroll-locked')
    window.dispatchEvent(new CustomEvent('khp:scroll-lock'))
    return () => {
      document.documentElement.classList.remove('khp-scroll-locked')
    }
  }, [enabled])

  const goTo = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(idx, TOTAL - 1))
      if (clamped === activeIndex || animatingRef.current) return
      lastActiveRef.current = activeIndex
      animatingRef.current = true

      // Screen tear effect
      setTearing(true)
      setTimeout(() => setTearing(false), 550)

      // Phase 1: set data-dir transforms immediately
      setActiveIndex(clamped)
      // Phase 2: delay .on class by 1 frame so data-dir transform is the transition origin
      cancelAnimationFrame(stagedRaf.current)
      stagedRaf.current = requestAnimationFrame(() => {
        setStagedIndex(clamped)
      })

      window.dispatchEvent(
        new CustomEvent('kappa:pager-change', { detail: { index: clamped, total: TOTAL } }),
      )
      setTimeout(() => {
        animatingRef.current = false
      }, 700)
    },
    [activeIndex],
  )

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (animatingRef.current) return
      const sc = pagesRef.current[activeIndex]?.querySelector('.khp-page-scroll')
      if (!sc) return
      if (e.deltaY > 0 && sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2) {
        e.preventDefault()
        goTo(activeIndex + 1)
      } else if (e.deltaY < 0 && sc.scrollTop <= 0) {
        e.preventDefault()
        goTo(activeIndex - 1)
      }
    }
    const cleanup = () => {
      window.removeEventListener('wheel', onWheel)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('khp:cleanup', cleanup, { once: true })
    return () => {
      cleanup()
      window.removeEventListener('khp:cleanup', cleanup)
    }
  }, [activeIndex, goTo])

  useEffect(() => {
    let sy = 0
    const onS = (e: TouchEvent) => {
      if (e.touches.length === 1) sy = e.touches[0].clientY
    }
    const onE = (e: TouchEvent) => {
      if (e.changedTouches.length !== 1) return
      const d = sy - e.changedTouches[0].clientY
      if (Math.abs(d) < 60) return
      const sc = pagesRef.current[activeIndex]?.querySelector('.khp-page-scroll')
      if (!sc) return
      if (d > 0 && sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2) goTo(activeIndex + 1)
      else if (d < 0 && sc.scrollTop <= 0) goTo(activeIndex - 1)
    }
    const cleanup = () => {
      window.removeEventListener('touchstart', onS)
      window.removeEventListener('touchend', onE)
    }
    window.addEventListener('touchstart', onS, { passive: true })
    window.addEventListener('touchend', onE, { passive: true })
    window.addEventListener('khp:cleanup', cleanup, { once: true })
    return () => {
      cleanup()
      window.removeEventListener('khp:cleanup', cleanup)
    }
  }, [activeIndex, goTo])

  useEffect(() => {
    const onK = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault()
        goTo(activeIndex + 1)
      }
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault()
        goTo(activeIndex - 1)
      }
    }
    const cleanup = () => {
      window.removeEventListener('keydown', onK)
    }
    window.addEventListener('keydown', onK)
    window.addEventListener('khp:cleanup', cleanup, { once: true })
    return () => {
      cleanup()
      window.removeEventListener('khp:cleanup', cleanup)
    }
  }, [activeIndex, goTo])

  // Listen for pager-seek from header logo click
  useEffect(() => {
    const onSeek = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.index !== undefined) goTo(detail.index)
    }
    const cleanup = () => {
      window.removeEventListener('kappa:pager-seek', onSeek)
    }
    window.addEventListener('kappa:pager-seek', onSeek)
    window.addEventListener('khp:cleanup', cleanup, { once: true })
    return () => {
      cleanup()
      window.removeEventListener('khp:cleanup', cleanup)
    }
  }, [goTo])

  if (!enabled) return null

  const dir = activeIndex >= lastActiveRef.current ? 1 : -1

  const cardData = [
    {
      t: 'PROJECT',
      h: '项目集',
      d: '开源项目与创意实验',
      url: '/projects',
      accent: 'amber' as const,
    },
    {
      t: 'ARCHIVE',
      h: '文章归档',
      d: '技术笔记与深度思考',
      url: '/archives',
      accent: 'green' as const,
    },
    { t: 'SOCIAL', h: '友链', d: '独立博客时代的邻里', url: '/friends', accent: 'hazard' as const },
  ]
  const techData = [
    { l: 'FRONTEND', v: 'Astro · React · Tailwind CSS', d: '静态优先，交互赋能' },
    { l: 'BACKEND', v: 'Python · Node.js', d: 'API 服务与脚本工具链' },
    { l: 'AI / ML', v: 'PyTorch · LLM · RAG', d: '大模型应用与推理优化' },
    { l: 'CREATIVE', v: 'MMD · Video Editing', d: '3D 动画与视觉创作' },
  ]
  const signalData = [
    { t: 'WEEKLY', h: '每周热点', d: '热点追踪、趋势分析、每周精选内容的系统化整理', u: '/weekly' },
    { t: 'EVENTS', h: '演出日历', d: 'Anime & MMD 活动 · 同人展 · 演唱会日程', u: '/anime-events' },
    { t: 'LEARN', h: '学习路线', d: '从入门到精通的系统化知识体系与学习资源', u: '/learn' },
  ]

  // Accent color for card variety
  const accentBorder = {
    amber: 'rgba(255,183,0,0.2)',
    green: 'rgba(80,220,120,0.2)',
    hazard: 'rgba(255,100,20,0.2)',
  }
  const accentGlow = {
    amber: 'rgba(255,183,0,0.08)',
    green: 'rgba(80,220,120,0.06)',
    hazard: 'rgba(255,100,20,0.06)',
  }

  return (
    <div className="khp-homepage">
      {/* Ambient glow — grid/parallax handled globally by CyberpunkOverlay + BackgroundParallax */}
      <div className="khp-ambient-glow" />
      {entering && <div className="khp-wipe" />}
      {tearing && <div className="khp-screen-tear" />}
      <CyberpunkIndicator />
      <SideMonitor />
      {/* Spectrum analyzer — CSS-only bouncing bars */}
      <div className="khp-spectrum" aria-hidden="true">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="khp-spectrum-bar"
            style={{ height: `${18 + Math.random() * 22}px`, animationDelay: `${i * 0.06}s` }}
          />
        ))}
      </div>
      <EventLog />

      {/* Status ticker */}
      <div className="khp-ticker" aria-hidden="true">
        <div className="khp-ticker-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <div key={`${i}-${item}`} className="khp-ticker-item">
              <span className="khp-ticker-dot" />
              <span
                className={
                  item.startsWith('TEMP') || item.startsWith('LOAD') ? 'khp-ticker-warn' : ''
                }
              >
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      <nav className="khp-dots">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <button
            key={i}
            className={`khp-dot ${i === stagedIndex ? 'on' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Section ${i + 1}`}
          >
            <span className="khp-dot-core" />
          </button>
        ))}
      </nav>

      {/* Page 0: Hero */}
      <section
        ref={(el) => {
          pagesRef.current[0] = el
        }}
        className={`khp-page ${stagedIndex === 0 ? 'on' : ''} ${activeIndex > 0 ? 'past' : ''}`}
        data-dir={activeIndex === 0 ? dir : 0}
      >
        <div className="khp-page-scroll">
          <div className="khp-hero">
            <div className="khp-hero-hazard" aria-hidden="true" />
            <div className="khp-hero-main">
              {/* Status indicator lights */}
              <div className="khp-hero-status khp-s0">
                <div className="khp-status-light">
                  <span className="khp-status-bulb khp-status-bulb--green" />
                  <span>SYS.OK</span>
                </div>
                <div className="khp-status-light">
                  <span className="khp-status-bulb khp-status-bulb--amber" />
                  <span>RTR.ACT</span>
                </div>
                <div className="khp-status-light">
                  <span className="khp-status-bulb khp-status-bulb--hazard" />
                  <span>WARN</span>
                </div>
              </div>
              <div className="khp-hero-line" />
              <h1 className="khp-hero-title" data-selectable>
                <span className="khp-hero-char" style={{ animationDelay: '0s' }}>
                  梦
                </span>
                <span className="khp-hero-char" style={{ animationDelay: '0.06s' }}>
                  夜
                </span>
                <span className="khp-hero-char" style={{ animationDelay: '0.12s' }}>
                  的
                </span>
                <span className="khp-hero-char" style={{ animationDelay: '0.18s' }}>
                  工
                </span>
                <span className="khp-hero-char" style={{ animationDelay: '0.24s' }}>
                  厂
                </span>
              </h1>
              <p className="khp-hero-sub">大模型 × 视频制作 — 偶尔写点别的技术栈和自己的idea</p>
              <p className="khp-hero-quote">Stay foolish, stay hungry.</p>
              <p className="khp-hero-src">—— Steve Jobs</p>
              <a href="/archives" className="khp-btn-hud" data-selectable-highlight>
                <span className="khp-prompt">C:\&gt;</span> 检索完整观测日志{' '}
                <span className="khp-btag">[ ARCHIVE ]</span>
              </a>
            </div>
            <div className="khp-hero-side">
              <pre className="khp-ascii">{`
  ┌──────────────────────┐
  │  ⚙ SYSTEM.ONLINE    │
  │  ⚡ MODE:INDUSTRIAL  │
  │  ◈ NODE:PRIMARY     │
  │  ▣ UPLINK:ACTIVE    │
  └──────┬───────────────┘
         │
   ┌─────┴─────────┐
   │  ▣ TERMINAL   │
   │  ▤ MONITORING │
   │  ⚡ STANDBY    │
   └───────────────┘`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* Page 1: Nodes — cards with varied accent borders */}
      <section
        ref={(el) => {
          pagesRef.current[1] = el
        }}
        className={`khp-page ${stagedIndex === 1 ? 'on' : ''} ${activeIndex > 1 ? 'past' : ''}`}
        data-dir={activeIndex === 1 ? dir : 0}
      >
        <div className="khp-page-scroll">
          <div className="khp-nodes">
            <h2 className="khp-sh khp-s0" data-selectable>
              <span className="khp-sh-sl">//</span> NODES
            </h2>
            <p className="khp-ss khp-s1">极致源于梦想，追求源于热爱。</p>
            <div className="khp-cards">
              {cardData.map((c, i) => (
                <a
                  key={c.t}
                  href={c.url}
                  className={`khp-card-foil khp-card khp-s${i + 2}`}
                  data-selectable-highlight
                  style={{
                    borderLeftColor: accentBorder[c.accent],
                    boxShadow: `0 0 24px rgba(0,0,0,0.5), 0 0 2px ${accentGlow[c.accent]}`,
                  }}
                >
                  <div className="khp-cr khp-cr--tl" />
                  <div className="khp-cr khp-cr--tr" />
                  <div className="khp-cr khp-cr--bl" />
                  <div className="khp-cr khp-cr--br" />
                  <div className="khp-rivet-col" />
                  {c.accent === 'hazard' && <div className="khp-warn-label">CAUTION</div>}
                  <span className="khp-card-tag">[ {c.t} ]</span>
                  <h4 className="khp-card-h">{c.h}</h4>
                  <p className="khp-card-d">{c.d}</p>
                  <span className="khp-card-cta">
                    <span className="khp-prompt">C:\&gt;</span>{' '}
                    {c.h === '项目集' ? '查看项目' : c.h === '文章归档' ? '浏览文章' : '访问友链'}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Page 2: Tech + Snake */}
      <section
        ref={(el) => {
          pagesRef.current[2] = el
        }}
        className={`khp-page ${stagedIndex === 2 ? 'on' : ''} ${activeIndex > 2 ? 'past' : ''}`}
        data-dir={activeIndex === 2 ? dir : 0}
      >
        <div className="khp-page-scroll">
          <CyberpunkSnakeBg active={activeIndex === 2} />
          <div className="khp-tech">
            <h2 className="khp-sh khp-s0" data-selectable>
              <span className="khp-sh-sl">//</span> TECH STACK
            </h2>
            <div className="khp-tech-grid">
              {techData.map((t, i) => (
                <div key={t.l} className={`khp-tech-item khp-s${i + 1}`} data-selectable-highlight>
                  <span className="khp-tech-l">[ {t.l} ]</span>
                  <span className="khp-tech-v">{t.v}</span>
                  <span className="khp-tech-d">{t.d}</span>
                  <div className="khp-tech-bar" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Page 3: Signals */}
      <section
        ref={(el) => {
          pagesRef.current[3] = el
        }}
        className={`khp-page ${stagedIndex === 3 ? 'on' : ''}`}
        data-dir={activeIndex === 3 ? dir : 0}
      >
        <div className="khp-page-scroll">
          <div className="khp-signals">
            <h2 className="khp-sh khp-s0" data-selectable>
              <span className="khp-sh-sl">//</span> SIGNAL LOG
            </h2>
            <p className="khp-ss khp-s1">接收最新的信号脉冲</p>
            <div className="khp-signal-grid">
              {signalData.map((s, i) => (
                <a
                  key={s.t}
                  href={s.u}
                  className={`khp-card-foil khp-signal khp-s${i + 2}`}
                  data-selectable-highlight
                >
                  <div className="khp-cr khp-cr--tl" />
                  <div className="khp-cr khp-cr--tr" />
                  <div className="khp-cr khp-cr--bl" />
                  <div className="khp-cr khp-cr--br" />
                  <div className="khp-rivet-col" />
                  <span className="khp-signal-tag">[ {s.t} ]</span>
                  <span className="khp-signal-h">{s.h}</span>
                  <span className="khp-signal-d">{s.d}</span>
                  <span className="khp-signal-arr">&rarr;</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Page 4: Connect */}
      <section
        ref={(el) => {
          pagesRef.current[4] = el
        }}
        className={`khp-page ${stagedIndex === 4 ? 'on' : ''}`}
        data-dir={activeIndex === 4 ? dir : 0}
      >
        <div className="khp-page-scroll">
          <div className="khp-signals">
            <h2 className="khp-sh khp-s0" data-selectable>
              <span className="khp-sh-sl">//</span> CONNECT
            </h2>
            <p className="khp-ss khp-s1">在以下频率找到我</p>
            <div className="khp-signal-grid">
              <a
                href="https://github.com/dreamnight16"
                target="_blank"
                rel="noopener"
                className="khp-card-foil khp-signal khp-s2"
                data-selectable-highlight
              >
                <div className="khp-cr khp-cr--tl" />
                <div className="khp-cr khp-cr--tr" />
                <div className="khp-cr khp-cr--bl" />
                <div className="khp-cr khp-cr--br" />
                <span className="khp-signal-tag">[ CODE ]</span>
                <span className="khp-signal-h">GitHub</span>
                <span className="khp-signal-d">开源项目、代码片段与技术实验</span>
                <span className="khp-signal-arr">&rarr;</span>
              </a>
              <a
                href="https://twitter.com/sixtdreanight"
                target="_blank"
                rel="noopener"
                className="khp-card-foil khp-signal khp-s3"
                data-selectable-highlight
              >
                <div className="khp-cr khp-cr--tl" />
                <div className="khp-cr khp-cr--tr" />
                <div className="khp-cr khp-cr--bl" />
                <div className="khp-cr khp-cr--br" />
                <span className="khp-signal-tag">[ SOCIAL ]</span>
                <span className="khp-signal-h">X / Twitter</span>
                <span className="khp-signal-d">日常吐槽与技术观察</span>
                <span className="khp-signal-arr">&rarr;</span>
              </a>
              <a
                href="https://space.bilibili.com/514345038"
                target="_blank"
                rel="noopener"
                className="khp-card-foil khp-signal khp-s4"
                data-selectable-highlight
              >
                <div className="khp-cr khp-cr--tl" />
                <div className="khp-cr khp-cr--tr" />
                <div className="khp-cr khp-cr--bl" />
                <div className="khp-cr khp-cr--br" />
                <span className="khp-signal-tag">[ VIDEO ]</span>
                <span className="khp-signal-h">Bilibili</span>
                <span className="khp-signal-d">MMD 动画与视频创作</span>
                <span className="khp-signal-arr">&rarr;</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
