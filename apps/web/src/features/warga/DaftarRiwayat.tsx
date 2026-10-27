import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-aria-components'
import { pesanGalat } from '@/api/galat'
import { opsiRiwayatWarga } from '@/api/warga'
import { formatTanggal } from '@/domain/format/tanggal'
import { kalimat, namaJenisLengkap } from '@/domain/warga/permohonan'
import { Cap } from '@/ui/cap/Cap'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiWarga } from './sesi-konteks'

/** Riwayat permohonan surat warga, terbaru dulu (SPEC §10). */
export function DaftarRiwayat() {
  const sesi = useSesiWarga()
  const kueri = useQuery(opsiRiwayatWarga())
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-serif text-judul-halaman font-medium">Riwayat permohonan</h1>
      {kueri.isPending && <BarisKerangka jumlah={4} label="Memuat riwayat…" />}
      {kueri.isError && <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />}
      {kueri.isSuccess && kueri.data.length === 0 && (
        <EmptyState
          judul="Belum ada permohonan surat"
          keterangan="Surat yang Anda ajukan, atau yang dibuat di kantor desa atas nama Anda, tampil di sini."
        />
      )}
      {kueri.isSuccess && kueri.data.length > 0 && (
        <ul className="divide-y divide-garis border-y border-garis bg-lembar">
          {kueri.data.map((p) => (
            <li key={p.id}>
              <Link
                href={`/warga/riwayat/${p.id}`}
                className="flex flex-col gap-1 px-4 py-3 outline-none hover:bg-kertas-2 data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:-outline-offset-2 data-[focus-visible]:outline-biru"
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{namaJenisLengkap(p.jenis)}</span>
                  <Cap varian={p.status} />
                </span>
                <span className="text-tinta-2">{kalimat(p.posisi)}</span>
                <span className="text-teks-kecil text-tinta-2">
                  Masuk {formatTanggal(p.masukPada)}
                  {p.untuk.id !== sesi.penduduk.id && ` · untuk ${p.untuk.nama}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
