import { useQuery } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { opsiSuratPenduduk } from '@/api/surat'
import { formatAngka } from '@/domain/format/angka'
import { formatTanggal } from '@/domain/format/tanggal'
import { Tautan } from '@/ui/navigasi/Tautan'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { CapPermohonan } from './CapPermohonan'

type Props = { pendudukId: string; batas?: number }

/**
 * Surat seorang penduduk, sebagai pemohon atau sebagai yang diterangkan (bayi, almarhum); terbaru dulu. Dipakai tab
 * Surat di profil (SPEC §6.3) dan laci daftar penduduk dengan batas tiga (SPEC §6.2).
 */
export function DaftarSuratPenduduk({ pendudukId, batas }: Props) {
  const kueri = useQuery(opsiSuratPenduduk(pendudukId))
  if (kueri.isPending) return <BarisKerangka jumlah={3} label="Memuat surat…" />
  if (kueri.isError) return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />

  const semua = kueri.data.data
  if (semua.length === 0) return <p className="text-tinta-2">Belum ada surat untuk orang ini.</p>
  const tampil = batas === undefined ? semua : semua.slice(0, batas)
  const sisa = semua.length - tampil.length
  return (
    <div className="flex flex-col gap-2">
      <ul aria-label="Surat untuk penduduk ini" className="divide-y divide-garis">
        {tampil.map((b) => (
          <li key={b.id} className="flex flex-col gap-1 py-2.5">
            <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <Tautan href={`/admin/surat/${b.id}`}>{b.jenis.nama}</Tautan>
              <CapPermohonan p={b} />
            </span>
            <span className="text-teks-kecil text-tinta-2">
              {[b.nomor ?? 'Belum bernomor', formatTanggal(b.masukPada, 'pendek'), b.pemohon.id === pendudukId ? null : `Pemohon: ${b.pemohon.nama}`]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </li>
        ))}
      </ul>
      {sisa > 0 && <p className="text-teks-kecil text-tinta-2">dan {formatAngka(sisa)} surat lainnya, lihat di profil.</p>}
    </div>
  )
}
