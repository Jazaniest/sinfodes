import { useQuery } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { opsiDaftarSiaranDesa } from '@/api/siaran'
import { formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { keteranganSiaranDesa, lewatTenggatSiaran } from '@/domain/kabupaten/siaran'
import { cn } from '@/ui/cn'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'

/** Siaran kabupaten (SPEC-V0.2 §8.4 Di panel desa): siaran yang diterima desa ini, terbaru dulu; yang belum dibuka ditebalkan. */
export function DaftarSiaranDesa({ sekarang = new Date() }: { sekarang?: Date }) {
  const kueri = useQuery(opsiDaftarSiaranDesa())
  const hariIni = tanggalIsoWib(sekarang)
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader judul="Siaran kabupaten" meta={kueri.data?.kabupaten ? `Dari Kabupaten ${kueri.data.kabupaten}.` : undefined} />
      {kueri.isPending ? (
        <BarisKerangka jumlah={4} label="Memuat siaran…" />
      ) : kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : kueri.data.data.length === 0 ? (
        <EmptyState judul="Belum ada siaran" keterangan="Siaran dari kabupaten tampil di sini." />
      ) : (
        <ul aria-label="Siaran" className="divide-y divide-garis border-y border-garis bg-lembar">
          {kueri.data.data.map((s) => {
            const lewat = !s.ditarik && lewatTenggatSiaran(s.tindakLanjut, s.status, hariIni)
            return (
              <li key={s.id} className="flex flex-col gap-0.5 px-4 py-3">
                <Tautan
                  href={`/admin/siaran/${s.id}`}
                  nada="tinta"
                  className={cn(s.status === 'belum-dibaca' && !s.ditarik ? 'font-semibold' : 'font-normal')}
                >
                  {s.judul}
                </Tautan>
                <span className={cn('text-teks-kecil', lewat ? 'font-medium text-merah' : 'text-tinta-2')}>
                  {`${formatTanggal(s.dikirimPada, 'pendek')} · ${keteranganSiaranDesa(s, hariIni)}`}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
