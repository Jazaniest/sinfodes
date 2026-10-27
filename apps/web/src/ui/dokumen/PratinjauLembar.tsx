import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Lebar kertas dalam piksel CSS (cm pada 96 dpi); A4 21 cm, F4 21,5 cm. */
const lebarLembarPx = (cm: number) => (cm / 2.54) * 96

/**
 * Lembar surat diperkecil agar muat di kolomnya (SPEC §7.4); ukuran cetaknya tetap 1:1. Skala dihitung dari lebar
 * wadah lewat ResizeObserver, lalu diterapkan dengan `zoom` supaya tinggi tata letaknya ikut mengecil.
 */
export function PratinjauLembar({ label, children, lebarCm = 21 }: { label: string; children: ReactNode; lebarCm?: number }) {
  const wadah = useRef<HTMLDivElement>(null)
  const [skala, setSkala] = useState(1)
  useEffect(() => {
    const el = wadah.current
    if (!el) return
    const pengamat = new ResizeObserver(([entri]) => setSkala(Math.min(1, entri.contentRect.width / lebarLembarPx(lebarCm))))
    pengamat.observe(el)
    return () => pengamat.disconnect()
  }, [lebarCm])
  return (
    <div role="region" aria-label={label} className="min-w-0 rounded-2 border border-garis bg-kertas-2 p-3 sm:p-6 print:hidden">
      <div ref={wadah} className="overflow-hidden">
        <div style={{ zoom: skala }} className="mx-auto w-fit shadow-melayang">
          {children}
        </div>
      </div>
    </div>
  )
}
