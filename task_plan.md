# Task Plan: Cyberpunk Maximalist Mode for myBlog

## Goal
Transform the cyberpunk mode from a functional CRT overlay into a "maximalist heavy industrial data factory" — dense HUD panels, rich industrial decorations, and layered non-linear animations. While the regular blog theme is minimalism, cyberpunk mode is its maximalist opposite.

## Current Phase
Phase 9 — New Maximalist HUD Components

## Phases

### Phase 1-6: Foundation (complete)
Basic cyberpunk mode with CRT overlay, toggle, boot screen, glitch trigger, barcode, header, homepage. All phases complete. See git log for details.

### Phase 7: Code Review Fixes (complete)
- Fixed Sparks .filter() anti-pattern → explicit for loop
- Fixed ticker duplicate React keys
- Fixed GlitchTrigger prefers-reduced-motion check
- Fixed SnakeBg pointer events on inactive pages
- Fixed Indicator duplicate inline styles
- Fixed screen tear white flash (clip-path → gradient bars)
- Fixed header double-bar issue (JS polling → CSS selector)
- Fixed footer/BottomBar display on non-homepage pages

### Phase 8: CSS Architecture Refactoring
- [x] Split 760-line cyberpunk.css into 7 files under src/styles/cyberpunk/
  - [x] tokens.css — CSS variables, colors, fonts, typography
  - [x] animations.css — all @keyframes (~25 total)
  - [x] layout.css — homepage grid, pages, header/footer overrides
  - [x] components.css — cards, buttons, tech items, signals, hero, header, indicator
  - [x] overlay.css — CRT effects, grid, glow, noise, glitch, power
  - [x] hud.css — HUD panels, ticker, hazard stripes, spectrum, measure marks, status lights
  - [x] reduced-motion.css — prefers-reduced-motion overrides
- [x] Update cyberpunk.css to @import the split files
- [x] Verify build passes: 0 errors, all pages generate
- **Status:** complete

### Phase 9: New Maximalist HUD Components
- [x] SideMonitor — top-left fixed panel: CPU/MEM/NET/DISK bars with live random metrics
- [x] SpectrumAnalyzer — bottom-left: 16 CSS-only bouncing bars with staggered animation
- [x] EventLog — bottom-right: scrolling timestamped event messages (6 lines, 1.8s interval)
- [x] MeasureMarks — left edge ruler tick marks (CSS repeating-linear-gradient)
- [x] All components mounted in CyberpunkHomepage with aria-hidden
- **Status:** complete

### Phase 10: Industrial Decorations
- [ ] Rivet columns on cards (::before repeating dots + shadows)
- [ ] Warning labels on cards (angled corner tags)
- [ ] Steel ruler marks on section dividers
- [ ] Hazard stripe borders on hover
- [ ] Screw/bolt head decorations on corners

### Phase 11: New Animation Keyframes
- [ ] khp-gear-spin — rotating industrial gear
- [ ] khp-border-march — marching ants on borders
- [ ] khp-arc-spark — electrical arc between elements
- [ ] khp-char-scramble — text glitch/decay
- [ ] khp-gauge-pulse — pressure gauge needle bounce
- [ ] khp-alert-flash — red alert pulse
- [ ] khp-spectrum-bounce — spectrum bar bounce
- [ ] khp-conveyor-belt — continuous horizontal scroll

### Phase 12: Enhanced Existing Components
- [ ] Cards: add rivet columns, warning labels, multi-layer hover (sheen + brackets + scale + shadow)
- [ ] Hero: add industrial gear decoration, pressure gauge, enhanced ASCII art
- [ ] Tech items: add measurement marks, industrial label tape
- [ ] Signal cards: add antenna/waveform decoration, signal strength indicator
- [ ] Header: add alert indicator, scrolling status messages
- [ ] Background: add second parallax layer, diagonal crosshatch

### Phase 13: Integration & Polish
- [ ] All new components mounted in CyberpunkHomepage
- [ ] CSS @import chain verified
- [ ] No z-index conflicts between new HUD panels and existing overlay
- [ ] Performance audit (no layout thrashing, GPU-composited animations)
- [ ] Reduced-motion: all new animations respect the media query

### Phase 14: Testing & Verification
- [ ] Type check: 0 errors
- [ ] Build: all pages generate
- [ ] Visual: no overlapping, no broken layouts at mobile widths
- [ ] All existing cyberpunk features still work (toggle, boot, glitch, CRT)

## Key Questions
1. Should TiltCard be always active or only in cyberpunk mode? → Always active (independent)
2. Where does the floating toggle sit relative to BackToTopFAB? → Higher position, non-overlapping
3. Glitch interval range? → 5-30s random, 200-500ms duration
4. Boot screen timeout? → 4.5s fallback

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| CSS-driven CRT effects via `[data-cyberpunk="on"]` | Performance (GPU compositing), follows existing `[data-theme]` pattern |
| jotai for state management | Already used in project (ThemeProvider, modalStack, etc.) |
| PointerService as shared hook | Deduplicates cursor tracking (existing Flashlight + new TiltCard) |
| TiltCard independent from cyberpunk mode | Different aesthetic, useful standalone |
| Floating button position: bottom-right, above BackToTopFAB | User chose C, non-overlapping with existing FAB |
| wenzhimo.xyz CRTMonitorFX.js as reference, not direct copy | Adapt to Astro/React patterns, strip control panel UI |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| pre-commit hook: pnpm not found | 1 | Manual commit needed in user's terminal |

## Notes
- Spec document: `docs/superpowers/specs/2026-05-24-cyberpunk-mode-design.md`
- Source reference: https://www.wenzhimo.xyz/ (WordPress, kappa-heavy-industries theme)
- Visual companion server running at http://localhost:54501
