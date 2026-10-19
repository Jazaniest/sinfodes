import { useQuery } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { opsiDaftarLaporan } from '@/api/kabupaten'
import { formatBulan } from '@/domain/format/tanggal'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'

/** Daftar laporan bulanan kabupaten (SPEC-V0.2 §8.3 butir 7): satu tautan per bulan yang sudah tutup. */
export function DaftarLaporan() {
  const kueri = useQuery(opsiDaftarLaporan())
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader judul="Laporan bulanan" meta="Laporan tersedia untuk bulan yang sudah tutup." />
      {kueri.isPending ? (
        <BarisKerangka jumlah={4} label="Memuat laporan…" />
      ) : kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : kueri.data.bulan.length === 0 ? (
        <EmptyState judul="Belum ada bulan yang tutup" keterangan="Laporan pertama tersedia setelah bulan bergabung kabupaten berakhir." />
      ) : (
        <ul aria-label="Bulan laporan" className="divide-y divide-garis border-y border-garis bg-lembar">
          {kueri.data.bulan.map((b) => (
            <li key={b} className="px-4 py-3">
              <Tautan href={`/kabupaten/admin/laporan/${b}`} className="font-medium">
                {formatBulan(b)}
              </Tautan>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
