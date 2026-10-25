import { useState } from 'react'
import { ConfirmDialog } from '@/ui/lapisan/ConfirmDialog'
import { Tombol } from '@/ui/tombol/Tombol'
import { useDrafSitus } from '../tampilan/useDrafSitus'
import { DaftarBlokHtml } from './DaftarBlokHtml'
import { KontrakTema } from './KontrakTema'
import { PenyuntingCss } from './PenyuntingCss'

const KOTAK_PENJELASAN = 'Tingkat Lanjut menyalakan CSS kustom dan Blok HTML untuk website publik desa ini.'
const KALIMAT_KONFIRMASI = 'Tingkat Lanjut untuk yang paham CSS dan HTML.'

/**
 * Sub-tab Kode (7G, keputusan 8): tingkat Lanjut harus dinyalakan sendiri oleh pengelola website. Saat aktif,
 * `Matikan tingkat Lanjut` langsung mematikan CSS kustom dan Blok HTML di website publik tanpa menghapus kodenya.
 */
export function TabKode() {
  const draf = useDrafSitus()
  const [konfirmasi, setKonfirmasi] = useState(false)

  if (!draf.lanjut.aktif) {
    return (
      <section className="flex flex-col gap-3 rounded-2 border border-garis p-4">
        <h3 className="text-judul font-semibold">Tingkat Lanjut</h3>
        <p className="text-teks">{KOTAK_PENJELASAN}</p>
        <div>
          <Tombol onPress={() => setKonfirmasi(true)}>Aktifkan tingkat Lanjut</Tombol>
        </div>
        <ConfirmDialog
          isOpen={konfirmasi}
          onOpenChange={setKonfirmasi}
          judul="Aktifkan tingkat Lanjut?"
          labelSetuju="Aktifkan"
          onSetuju={() => {
            setKonfirmasi(false)
            void draf.aturLanjut(true)
          }}
        >
          <p className="text-teks">{KALIMAT_KONFIRMASI}</p>
          <p className="text-teks-kecil text-tinta-2">Kode yang salah bisa merusak tampilan website publik.</p>
        </ConfirmDialog>
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2 border border-garis p-4">
        <p className="text-teks">Tingkat Lanjut aktif. Kode tampil di website publik setelah diterbitkan.</p>
        <Tombol varian="sekunder" onPress={() => void draf.aturLanjut(false)}>
          Matikan tingkat Lanjut
        </Tombol>
      </div>
      <PenyuntingCss />
      <DaftarBlokHtml />
      <KontrakTema />
    </div>
  )
}
