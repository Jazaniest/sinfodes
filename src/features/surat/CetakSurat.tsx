import { useEffect, useRef } from 'react'
import { LembarSurat, type PropsLembarSurat } from '@/ui/dokumen/LembarSurat'

/**
 * Satu lembar surat dicetak 1:1 tanpa margin halaman, karena marginnya sudah ada di lembar (SPEC §7.5). Tidak tampil
 * di layar. Dialog cetak browser langsung dibuka ("Simpan sebagai PDF" ada di sana); lembar dilepas setelah ditutup.
 */
export function CetakSurat({ lembar, onSelesai }: { lembar: PropsLembarSurat; onSelesai: () => void }) {
  const sudahDicetak = useRef(false)
  useEffect(() => {
    window.addEventListener('afterprint', onSelesai)
    return () => window.removeEventListener('afterprint', onSelesai)
  }, [onSelesai])
  useEffect(() => {
    // Sekali saja, juga di StrictMode (efek dijalankan dua kali saat pengembangan).
    if (sudahDicetak.current) return
    sudahDicetak.current = true
    window.print()
  }, [])
  const ukuran = lembar.kertas === 'F4' ? '215mm 330mm' : 'A4'
  return (
    <section aria-label="Lembar cetak" className="hidden print:block">
      <style>{`@page { size: ${ukuran}; margin: 0; }`}</style>
      <LembarSurat {...lembar} />
    </section>
  )
}
