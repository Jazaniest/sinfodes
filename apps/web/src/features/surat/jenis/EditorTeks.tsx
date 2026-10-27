import { useRef } from 'react'
import { Button } from 'react-aria-components'
import { PENANDA_TABEL, type IsianTambahan } from '@/domain/surat/jenis'
import { sisipanTersedia } from '@/domain/surat/ubah-jenis'
import { gayaLabel } from '@/ui/isian/gaya'
import { TextArea } from '@/ui/isian/TextArea'

type Props = { teks: string; isian: readonly IsianTambahan[]; galat?: string; onUbah: (teks: string) => void }

/**
 * Teks surat dengan chip sisipan (SPEC §7.3, §7.4 layar 6). Chip menyisipkan `[kunci]` di posisi kursor; penanda tabel
 * rincian disisipkan sebagai paragraf sendiri, karena hanya paragraf utuh `[tabelRincian]` yang diganti tabel.
 */
export function EditorTeks({ teks, isian, galat, onUbah }: Props) {
  const wadah = useRef<HTMLDivElement>(null)
  const sisipkan = (kunci: string) => {
    const el = wadah.current?.querySelector('textarea')
    const awal = el?.selectionStart ?? teks.length
    const akhir = el?.selectionEnd ?? teks.length
    const sebelum = teks.slice(0, awal)
    const sesudah = teks.slice(akhir)
    const potongan =
      kunci === PENANDA_TABEL
        ? `${sebelum.trim() === '' ? '' : '\n\n'}[${kunci}]${sesudah.trim() === '' ? '' : '\n\n'}`
        : `[${kunci}]`
    const kiri = kunci === PENANDA_TABEL ? sebelum.trimEnd() : sebelum
    const kanan = kunci === PENANDA_TABEL ? sesudah.trimStart() : sesudah
    onUbah(kiri + potongan + kanan)
    // Kursor diletakkan sesudah sisipan, supaya petugas bisa langsung melanjutkan mengetik.
    const posisi = kiri.length + potongan.length
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(posisi, posisi)
    })
  }
  return (
    <div ref={wadah} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className={gayaLabel}>Sisipkan ke teks</span>
        <div role="group" aria-label="Sisipan" className="flex flex-wrap gap-1.5">
          {sisipanTersedia(isian).map((s) => (
            <Button
              key={s.kunci}
              aria-label={`Sisipkan ${s.label}`}
              onPress={() => sisipkan(s.kunci)}
              className="rounded-full border border-garis-input bg-lembar px-2.5 py-0.5 text-teks-kecil text-tinta outline-none hover:border-biru data-focus-visible:outline-2 data-focus-visible:outline-solid data-focus-visible:outline-biru"
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>
      <TextArea
        label="Teks surat"
        baris={12}
        value={teks}
        onChange={onUbah}
        galat={galat}
        keterangan="Paragraf dipisah baris kosong. Sisipan tampil dalam kurung siku, mis. [nama], dan diganti data penduduk di surat."
      />
    </div>
  )
}
