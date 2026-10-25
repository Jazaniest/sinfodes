import { useEffect, useRef, useState } from 'react'
import { periksaCss, POLA_MEDIA, type MasalahCss } from '@/domain/website/css-kustom'
import { cn } from '@/ui/cn'
import { gayaKotakBebas } from '@/ui/isian/gaya'
import { useDrafSitus } from '../tampilan/useDrafSitus'
import { SalinPrompt } from './SalinPrompt'

/** Satu baris masalah/peringatan: bagian `Baris {b}` menjadi tautan pemindah kursor ke baris itu. */
function BarisMasalah({ m, onKeBaris }: { m: MasalahCss; onKeBaris: (baris: number) => void }) {
  // `pesan` sudah memuat "Baris {b}: "; bagian itu ditampilkan sebagai tautan, sisanya sebagai teks.
  const awalan = `Baris ${m.baris}: `
  if (!m.pesan.startsWith(awalan)) return <li className="text-teks-kecil">{m.pesan}</li>
  return (
    <li className="text-teks-kecil">
      <button type="button" className="underline" onClick={() => onKeBaris(m.baris)}>
        Baris {m.baris}
      </button>
      : {m.pesan.slice(awalan.length)}
    </li>
  )
}

function DaftarMasalah({ judul, daftar, onKeBaris }: { judul: string; daftar: readonly MasalahCss[]; onKeBaris: (baris: number) => void }) {
  if (daftar.length === 0) return null
  return (
    <div className="flex flex-col gap-1">
      <p className="text-label font-medium text-tinta-2 uppercase">{judul}</p>
      <ul className="flex flex-col gap-0.5">
        {daftar.map((m) => (
          <BarisMasalah key={`${m.baris}-${m.pesan}`} m={m} onKeBaris={onKeBaris} />
        ))}
      </ul>
    </div>
  )
}

/**
 * Penyunting CSS kustom (7G): nomor baris di samping isian monospace, pemeriksaan 500 ms setelah ketikan lewat
 * `periksaCss`, dan perubahan baru masuk draf bila tidak ada masalah (peringatan kontras tetap diterima).
 */
export function PenyuntingCss() {
  const { isi, ubah } = useDrafSitus()
  const [teks, setTeks] = useState(() => isi?.cssKustom ?? '')
  const [hasil, setHasil] = useState<{ masalah: MasalahCss[]; peringatan: MasalahCss[] } | null>(null)
  const tersimpan = useRef(isi?.cssKustom ?? '')
  const urutan = useRef(0)
  const kotak = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const jadwal = setTimeout(() => {
      const sini = ++urutan.current
      void periksaCss(teks, { polaMedia: POLA_MEDIA }).then((h) => {
        if (sini !== urutan.current) return // hasil pemeriksaan yang sudah ketinggalan dibuang
        setHasil({ masalah: h.masalah, peringatan: h.peringatan })
        if (h.masalah.length === 0 && teks !== tersimpan.current) {
          tersimpan.current = teks
          ubah((d) => ({ ...d, cssKustom: teks }))
        }
      })
    }, 500)
    return () => clearTimeout(jadwal)
  }, [teks, ubah])

  const keBaris = (baris: number) => {
    const kotakCss = kotak.current
    if (!kotakCss) return
    const posisi = teks.split('\n').slice(0, baris - 1).reduce((jumlah, barisTeks) => jumlah + barisTeks.length + 1, 0)
    kotakCss.focus()
    kotakCss.setSelectionRange(posisi, posisi)
  }

  return (
    <section aria-label="CSS kustom" className="flex flex-col gap-3 rounded-2 border border-garis p-4">
      <h3 className="text-judul font-semibold">CSS kustom</h3>
      <p className="text-teks-kecil text-tinta-2">
        Hanya berlaku di website publik desa ini. Setiap selektor otomatis dikurung lingkup pada wadah halaman.
      </p>
      <div className="flex gap-2">
        <div aria-hidden className="select-none py-2 text-right font-mono text-teks-kecil text-tinta-3 leading-relaxed">
          {teks.split('\n').map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={kotak}
          aria-label="CSS kustom"
          spellCheck={false}
          rows={14}
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          className={cn(gayaKotakBebas, 'w-full font-mono text-teks-kecil')}
        />
      </div>
      <DaftarMasalah judul="Masalah" daftar={hasil?.masalah ?? []} onKeBaris={keBaris} />
      <DaftarMasalah judul="Peringatan" daftar={hasil?.peringatan ?? []} onKeBaris={keBaris} />
      <SalinPrompt jenis="css" />
    </section>
  )
}
