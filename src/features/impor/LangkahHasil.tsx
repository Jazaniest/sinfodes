import { DownloadSimple } from '@phosphor-icons/react'
import { formatAngka } from '@/domain/format/angka'
import { keCsv } from '@/domain/format/csv'
import type { HasilImpor, LaporanImpor } from '@/domain/impor/schema'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { unduhBerkas } from '@/ui/unduh'

type Props = { laporan: LaporanImpor; hasil: HasilImpor; onLihatDaftar: () => void; onUlang: () => void }

/** Langkah 4 impor (SPEC §6.8): ringkasan dan laporan per baris. */
export function LangkahHasil({ laporan, hasil, onLihatDaftar, onUlang }: Props) {
  const ringkasan =
    `${formatAngka(hasil.penduduk)} penduduk dan ${formatAngka(hasil.keluarga)} KK ditambahkan` +
    (hasil.dilewati > 0 ? `; ${formatAngka(hasil.dilewati)} baris dilewati` : '')
  const unduhLaporan = () =>
    unduhBerkas(
      `laporan-impor-${laporan.namaBerkas.replace(/\.[^.]+$/, '')}.csv`,
      keCsv([
        ['Baris', 'Status', 'Keterangan'],
        ...hasil.laporan.map((b) => [b.nomor, b.status === 'ditambahkan' ? 'Ditambahkan' : 'Dilewati', b.keterangan]),
      ]),
    )
  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <Banner nada="berhasil" judul="Impor selesai">
        {ringkasan}.
      </Banner>
      <div className="flex flex-wrap gap-2">
        <Tombol varian="utama" onPress={onLihatDaftar}>
          Lihat daftar penduduk
        </Tombol>
        <Tombol ikon={<DownloadSimple aria-hidden size={16} />} onPress={unduhLaporan}>
          Unduh laporan
        </Tombol>
        <Tombol varian="teks" onPress={onUlang}>
          Impor berkas lain
        </Tombol>
      </div>
    </div>
  )
}
