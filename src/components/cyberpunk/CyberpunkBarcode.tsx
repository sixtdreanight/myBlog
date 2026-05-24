import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

export function CyberpunkBarcode() {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return
    JsBarcode(svgRef.current, 'INDUSTRIAL_MODE', {
      format: 'CODE39', width: 1.2, height: 30,
      displayValue: false, background: 'transparent',
      lineColor: 'rgba(255, 183, 0, 0.15)', margin: 0,
    })
  }, [])

  return (
    <div className="khp-barcode" aria-hidden="true">
      <svg ref={svgRef} />
    </div>
  )
}
