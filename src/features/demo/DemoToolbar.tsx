import { ArrowCounterClockwise, X } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { ModeJaringan } from '@/mocks/kendali'
import { tampilkanToast } from '@/ui/toast/antrean'
import { useKendaliDemo } from './useKendaliDemo'

const KUNCI_TERBUKA = 'sinfodes.demo.toolbar'
const PILIHAN_KONEKSI: ReadonlyArray<readonly [ModeJaringan, string]> = [
  ['normal', 'Normal'],
  ['lambat', 'Lambat (3G)'],
  ['gagal', 'Gagal'],
]
const bagian = 'flex items-center gap-2 border-l border-kapur/20 px-2 sm:px-3'

function bacaTerbuka(): boolean {
  try {
    return localStorage.getItem(KUNCI_TERBUKA) !== 'tertutup'
  } catch {
    return true
  }
}

/** Toolbar mode demo (SPEC §3.6). Tidak dirender di build produksi (VITE_DEMO=false). */
export function DemoToolbar() {
  const kendali = useKendaliDemo()
  const queryClient = useQueryClient()
  const [terbuka, setTerbuka] = useState(bacaTerbuka)
  const [mode, setMode] = useState<ModeJaringan | null>(null)
  const [konfirmasi, setKonfirmasi] = useState(false)
  const [mereset, setMereset] = useState(false)
  if (!kendali) return null

  const modeAktif = mode ?? kendali.bacaModeJaringan()
  const ubahTerbuka = (nilai: boolean) => {
    setTerbuka(nilai)
    try {
      localStorage.setItem(KUNCI_TERBUKA, nilai ? 'terbuka' : 'tertutup')
    } catch {
      // Diabaikan.
    }
  }
  const reset = async () => {
    setMereset(true)
    try {
      await kendali.resetDataDemo()
      await queryClient.resetQueries()
      tampilkanToast({ pesan: 'Data demo dikembalikan ke kondisi awal.', nada: 'berhasil' })
    } finally {
      setMereset(false)
      setKonfirmasi(false)
    }
  }

  if (!terbuka) {
    return (
      <button
        type="button"
        aria-label="Tampilkan kontrol demo"
        onClick={() => ubahTerbuka(true)}
        className="fixed bottom-3 left-3 z-40 rounded-1 bg-tinta px-3 py-1.5 text-label font-semibold tracking-widest text-oker-muda shadow-melayang"
      >
        DEMO
      </button>
    )
  }

  return (
    <div
      role="region"
      aria-label="Kontrol demo"
      // Cincin fokus biru tidak terlihat di atas tinta; di dalam toolbar dipakai kapur.
      className="fixed bottom-3 left-3 z-40 flex max-w-[calc(100vw-1.5rem)] flex-wrap items-stretch rounded-1 bg-tinta text-teks-kecil text-kapur shadow-melayang [&_:focus-visible]:-outline-offset-2 [&_:focus-visible]:outline-kapur"
    >
      <span className="flex items-center px-2 text-label font-semibold tracking-widest text-oker-muda sm:px-3">DEMO</span>
      <span className={bagian}>
        {/* Di ponsel 360 px toolbar tidak muat satu baris; label tetap terbaca pembaca layar. */}
        <label htmlFor="demo-koneksi" className="max-sm:sr-only">
          Koneksi
        </label>
        <select
          id="demo-koneksi"
          value={modeAktif}
          onChange={(e) => {
            const baru = e.target.value as ModeJaringan
            kendali.aturModeJaringan(baru)
            setMode(baru)
          }}
          className="bg-transparent py-1.5 text-kapur [&>option]:text-tinta"
        >
          {PILIHAN_KONEKSI.map(([nilai, label]) => (
            <option key={nilai} value={nilai}>
              {label}
            </option>
          ))}
        </select>
      </span>
      {konfirmasi ? (
        <span className={bagian}>
          <span>Kembalikan semua data?</span>
          <button type="button" disabled={mereset} onClick={() => void reset()} className="font-semibold underline">
            {mereset ? 'Memproses…' : 'Ya, reset'}
          </button>
          <button type="button" onClick={() => setKonfirmasi(false)} className="underline">
            Batal
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setKonfirmasi(true)} className={`${bagian} hover:bg-kapur/10`}>
          <ArrowCounterClockwise aria-hidden size={14} /> Reset data
        </button>
      )}
      <button
        type="button"
        aria-label="Sembunyikan kontrol demo"
        onClick={() => ubahTerbuka(false)}
        className={`${bagian} hover:bg-kapur/10`}
      >
        <X aria-hidden size={14} />
      </button>
    </div>
  )
}
