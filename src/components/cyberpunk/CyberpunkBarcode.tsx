/**
 * CSS-only barcode — no external dependencies.
 * Renders vertical bars of varying widths to simulate CODE39.
 */
export function CyberpunkBarcode() {
  // Pseudo-random bar widths based on 'INDUSTRIAL_MODE' character codes
  const seed = 'INDUSTRIAL_MODE'
  const bars = Array.from(seed, (c, i) => {
    const w = (c.charCodeAt(0) % 4) + 1
    const gap = i % 3 === 0 ? 3 : 1
    return { w, gap }
  })

  return (
    <div className="khp-barcode" aria-hidden="true">
      <svg width="200" height="30" style={{ display: 'block' }}>
        {bars.reduce<{ x: number; elements: React.ReactNode[] }>(
          (acc, bar, i) => {
            const el = (
              <rect
                key={i}
                x={acc.x}
                y={2}
                width={bar.w}
                height={26}
                fill="rgba(255,183,0,0.15)"
              />
            )
            return {
              x: acc.x + bar.w + bar.gap,
              elements: [...acc.elements, el],
            }
          },
          { x: 4, elements: [] }
        ).elements}
      </svg>
    </div>
  )
}
