import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-aria-components'
import { pesanGalat } from '@/api/galat'
import { opsiPengaduanWarga } from '@/api/warga'
import { formatTanggal } from '@/domain/format/tanggal'
import { Cap } from '@/ui/cap/Cap'
import { TautanTombol } from '@/ui/tombol/TautanTombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'

/** Pengaduan yang pernah disampaikan warga, terbaru dulu (SPEC §10). */
export function DaftarPengaduan() {
  const kueri = useQuery(opsiPengaduanWarga())
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-serif text-judul-halaman font-medium">Pengaduan saya</h1>
      <TautanTombol href="/warga/pengaduan/baru" varian="utama">
        Sampaikan pengaduan
      </TautanTombol>
      {kueri.isPending && <BarisKerangka jumlah={4} label="Memuat pengaduan…" />}
      {kueri.isError && <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />}
      {kueri.isSuccess && kueri.data.length === 0 && (
        <EmptyState judul="Belum ada pengaduan" keterangan="Pengaduan yang Anda sampaikan tampil di sini, beserta balasan dari desa." />
      )}
      {kueri.isSuccess && kueri.data.length > 0 && (
        <ul className="divide-y divide-garis border-y border-garis bg-lembar">
          {kueri.data.map((a) => (
            <li key={a.id}>
              <Link
                href={`/warga/pengaduan/${a.id}`}
                className="flex flex-col gap-1 px-4 py-3 outline-none hover:bg-kertas-2 data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:-outline-offset-2 data-[focus-visible]:outline-biru"
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{a.judul}</span>
                  <Cap varian={a.status} />
                </span>
                <span className="text-teks-kecil text-tinta-2">
                  {a.nomor} · {a.kategori} · masuk {formatTanggal(a.masukPada)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
