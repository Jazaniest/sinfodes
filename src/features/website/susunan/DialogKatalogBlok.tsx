import { useState } from 'react'
import { LABEL_JENIS_BLOK, JENIS_BLOK, type BlokHtml, type JenisBlok } from '@/domain/website/blok'
import { Select } from '@/ui/isian/Select'
import { Dialog } from '@/ui/lapisan/Dialog'
import { Tombol } from '@/ui/tombol/Tombol'

type Props = {
  isOpen: boolean
  onOpenChange: (buka: boolean) => void
  /** `htmlId` terisi untuk blok `html` (7G), menunjuk kode HTML yang dipilih di kartu Blok HTML. */
  onPilih: (jenis: JenisBlok, htmlId?: string) => void
  /** Kode HTML yang tersedia (7G). */
  blokHtml: readonly BlokHtml[]
  /** Kartu Blok HTML hanya tampil bila tingkat Lanjut aktif dan ada kode (keputusan 8). */
  lanjut: boolean
}

/** Keterangan satu kalimat per jenis blok katalog v0.2 (SPEC-V0.2 11.4). */
const KETERANGAN: Readonly<Record<JenisBlok, string>> = {
  sampul: 'Foto pembuka halaman dengan kalimat pengantar.',
  kabar: 'Artikel terbaru dari halaman Kabar.',
  layanan: 'Pintasan layanan surat yang paling sering dipakai warga.',
  angka: 'Jumlah jiwa, keluarga, dusun, dan luas desa dalam angka.',
  apbdes: 'Ringkasan pendapatan dan belanja APBDes tahun berjalan.',
  'pengumuman-agenda': 'Pengumuman yang masih berlaku dan agenda terdekat.',
  galeri: 'Deretan foto dokumentasi desa.',
  peta: 'Peta wilayah desa beserta lapisannya.',
  potensi: 'Daftar potensi dan unggulan desa.',
  video: 'Video YouTube, baru dimuat setelah diklik.',
  sambutan: 'Sambutan Kepala Desa dengan foto dan kutipan.',
  teks: 'Judul, paragraf, dan satu tautan; bebas tanpa HTML.',
  ajakan: 'Judul dan tombol yang mengajak warga membuka sebuah halaman.',
  kontak: 'Alamat kantor, telepon, dan jam pelayanan desa.',
  lencana: 'Lencana peringkat Indeks Desa Digital yang diraih desa.',
  pemisah: 'Garis pemisah berhias motif daerah.',
  html: 'Kode HTML dari sub-tab Kode, tampil dalam bingkai terkurung.',
}

/** Dialog katalog blok (keputusan 2): memilih jenis blok baru yang ditaruh sesudah blok terpilih. */
export function DialogKatalogBlok({ isOpen, onOpenChange, onPilih, blokHtml, lanjut }: Props) {
  const [kodeTerpilih, setKodeTerpilih] = useState<string | null>(null)
  const tampil = JENIS_BLOK.filter((jenis) => jenis !== 'html' || (lanjut && blokHtml.length > 0))
  const htmlId = kodeTerpilih ?? blokHtml[0]?.id ?? null

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} judul="Tambah blok" lebar="lebar">
      <ul className="grid gap-2 sm:grid-cols-2">
        {tampil.map((jenis) => (
          <li key={jenis} className="flex flex-col gap-1 rounded-1 border border-garis bg-lembar p-2">
            {jenis === 'html' && (
              <Select
                label="Kode HTML"
                pilihan={blokHtml.map((b) => ({ id: b.id, label: b.nama }))}
                nilai={htmlId}
                onUbah={setKodeTerpilih}
              />
            )}
            <Tombol
              ukuran="kecil"
              varian="sekunder"
              onPress={() => {
                onPilih(jenis, jenis === 'html' ? (htmlId ?? undefined) : undefined)
                onOpenChange(false)
              }}
            >
              {LABEL_JENIS_BLOK[jenis]}
            </Tombol>
            <p id={`ket-${jenis}`} className="text-teks-kecil text-tinta-2">
              {KETERANGAN[jenis]}
            </p>
          </li>
        ))}
      </ul>
    </Dialog>
  )
}
