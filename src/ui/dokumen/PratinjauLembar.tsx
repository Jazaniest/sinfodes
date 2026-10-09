import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Lebar kertas A4 dalam piksel CSS (21 cm pada 96 dpi). */
const LEBAR_LEMBAR_PX = (21 / 2.54) * 96

/**
 * Lembar surat diperkecil agar muat di kolomnya (SPEC §7.4); ukuran cetaknya tetap 1:1. Skala dihitung dari lebar
 * wadah lewat ResizeObserver, lalu diterapkan dengan `zoom` supaya tinggi tata letaknya ikut mengecil.
 */
export function PratinjauLembar({ label, children }: { label: string; children: ReactNode }) {
  const wadah = useRef<HTMLDivElement>(null)
  const [skala, setSkala] = useState(1)
  useEffect(() => {
    const el = wadah.current
    if (!el) return
    const pengamat = new ResizeObserver(([entri]) => setSkala(Math.min(1, entri.contentRect.width / LEBAR_LEMBAR_PX)))
    pengamat.observe(el)
    return () => pengamat.disconnect()
  }, [])
  return (
    <div role="region" aria-label={label} className="rounded-2 border border-garis bg-kertas-2 p-3 sm:p-6 print:hidden">
      <div ref={wadah} className="overflow-hidden">
        <div style={{ zoom: skala }} className="mx-auto w-fit shadow-melayang">
          {children}
        </div>
      </div>
    </div>
  )
}
