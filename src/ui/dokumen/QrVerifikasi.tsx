import { create } from 'qrcode'
import { useMemo } from 'react'

/** QR verifikasi surat (SPEC §7.5): digambar sebagai SVG supaya tajam saat dicetak; satu modul = satu satuan. */
export function QrVerifikasi({ isi, label, className }: { isi: string; label: string; className?: string }) {
  const { jalur, ukuran } = useMemo(() => {
    const { modules } = create(isi, { errorCorrectionLevel: 'M' })
    let d = ''
    for (let y = 0; y < modules.size; y++) {
      for (let x = 0; x < modules.size; x++) if (modules.get(y, x)) d += `M${x} ${y}h1v1h-1z`
    }
    return { jalur: d, ukuran: modules.size }
  }, [isi])
  // Tepi putih dua modul supaya tetap terbaca pemindai walau ditempel di samping teks.
  return (
    <svg role="img" aria-label={label} viewBox={`-2 -2 ${ukuran + 4} ${ukuran + 4}`} shapeRendering="crispEdges" className={className}>
      <rect x={-2} y={-2} width={ukuran + 4} height={ukuran + 4} className="fill-putih" />
      <path d={jalur} className="fill-tinta" />
    </svg>
  )
}
