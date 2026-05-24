# Cyberpunk Industrial Mode for myBlog

## Overview

A maximalist "heavy industrial data factory" mode for myBlog. While the regular theme is minimalist, cyberpunk mode is its maximalist opposite — dense HUD panels, rich industrial decorations, and layered non-linear animations. A floating toggle (Ctrl+K) switches between modes. On first visit, mode is randomly assigned (50/50).

## Anti-Flash Architecture

A synchronous IIFE at the very start of `<body>` reads localStorage and sets `data-cyberpunk="on"` before any content renders. Since the script blocks parsing, no page content is painted until the attribute is set. CSS in `<head>` is render-blocking — the first paint happens with the correct theme.

```
<body>
  <script>(function(){ ... setAttribute ... })();</script>
  <!-- all content below; data-cyberpunk already on body -->
```

## CSS Architecture

```
src/styles/
  cyberpunk/
    tokens.css          — Variables, typography, code blocks
    animations.css      — 25 @keyframes
    overlay.css         — CRT scanlines, beam, noise, vignette, grid, glitch, power
    layout.css          — Homepage pager, page transitions, header/footer overrides, anti-flash
    components.css      — Cards, buttons, tech items, signals, hero, header, indicator, industrial decorations
    hud.css             — SideMonitor, Spectrum, EventLog, Ticker, MeasureMarks, status lights
    responsive.css      — 960/768/480px breakpoints
    reduced-motion.css  — prefers-reduced-motion overrides
  cyberpunk.css         — @import aggregation (8 lines)
```

## Components (15 React + 1 Astro)

| Component | Renders on | Purpose |
|-----------|------------|---------|
| `CyberpunkHomepage` | Homepage | 5-page industrial pager |
| `CyberpunkHeader` | All pages | Fixed terminal bar (nav, cursor coords, clock) |
| `CyberpunkToggle` | All pages | Floating toggle (Ctrl+K) |
| `CyberpunkBoot` | First visit | Terminal boot overlay (extended ~3.5s) |
| `CyberpunkOverlay` | All pages | CRT scanlines/beam/vignette/grid + measure marks |
| `CyberpunkSparks` | All pages | Canvas ember particles (~80) |
| `BackgroundParallax` | All pages | Mouse-tracking grid/glow (DOM attribute check) |
| `CyberpunkBarcode` | All pages | Decorative barcode (jsbarcode CODE39) |
| `GlitchTrigger` | All pages | Random glitch (5-30s, respects reduced-motion) |
| `CyberpunkIndicator` | Homepage | Corner indicator + highlight rectangle |
| `CyberpunkSnakeBg` | Tech page | Canvas snake game |
| `SideMonitor` | Homepage | Top-left CPU/MEM/NET/DISK bars |
| `EventLog` | Homepage | Bottom-right scrolling event messages |
| `Spectrum` (CSS) | Homepage | Bottom-left 16 bouncing bars |
| `MeasureMarks` (CSS) | All pages | Left edge ruler ticks |

## Key Animations (25 @keyframes)

Base: `blink`, `dot-pulse`, `reveal`, `char-drop`, `bar-expand`
CRT: `overlay-in`, `beam`, `beam-rev`
Heavy Industry: `metal-sheen`, `piston-throb`, `weld-flash`, `impact`, `conveyor-in`, `rivet-clench`, `hazard-strobe`, `steam-rise`, `data-scramble`, `gauge-sweep`
Effects: `glitch`, `wipe-in`, `screen-tear`, `ticker-scroll`, `hazard-march`, `alert-flash`, `spectrum-bounce`, `power-on`, `power-off`

## Boot & Entrance Flow

1. IIFE sets `data-cyberpunk="on"` + `data-boot-state="pending"` (first visit only)
2. CSS: `body[data-boot-state="pending"]` → solid dark background + hide homepage
3. React hydrates → `CyberpunkBoot` mounts at z-index 99999
4. Boot sequence plays (~3.5s): entering → printing → pause → exiting
5. Boot dispatches `cyberpunk:boot-done` → `CyberpunkHomepage` receives it
6. Homepage restarts stagger-reveal animations (remove/re-add `.khp-page.on`) + amber wipe sweep

Subsequent visits skip boot → homepage entrance after 150ms settle delay.

## Mobile Responsive

- 960px: Hero single column, hide ASCII + SideMonitor
- 768px: Hide all 4 HUD panels, dots → bottom horizontal, header minimal, reduced padding
- 480px: Minimal title/header, compact cards, smaller corner brackets

## Theme Isolation

- Original header: hidden via `body[data-cyberpunk="on"] header.fixed.top-0:not(.khp-hdr)`
- Footer + BackToTopFAB: hidden via `display: none`
- AccessibleMenu (portaled): hidden via `.fixed.top-12.z-10`
- Regular homepage content: hidden via `.astro-homepage-content`
- Code blocks: forced `--shiki-dark` variables for readable syntax colors
- `color: var(--gold)` → `color: rgb(var(--gold))` (fixed invalid CSS values)
