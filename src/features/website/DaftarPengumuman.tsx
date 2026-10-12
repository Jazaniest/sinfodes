import { useQuery } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { opsiPengumuman } from '@/api/website'
import { formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { LABEL_STATUS_PENGUMUMAN, statusPengumuman, type Pengumuman } from '@/domain/website/schema'
import { cn } from '@/ui/cn'
import { DataTable, type KolomTabel } from '@/ui/data/DataTable'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { KepalaWebsite } from './TabWebsite'

const masa = (p: Pengumuman) => `${formatTanggal(p.mulai, 'pendek')} – ${formatTanggal(p.sampai, 'pendek')}`

/** Pengumuman desa (SPEC §8): masa berlaku dan statusnya hari ini. */
export function DaftarPengumuman({ sekarang }: { sekarang?: Date }) {
  const kueri = useQuery(opsiPengumuman())
  const hariIni = tanggalIsoWib(sekarang ?? new Date())
  const status = (p: Pengumuman) => {
    const s = statusPengumuman(p, hariIni)
    return <span className={cn(s === 'berakhir' && 'text-tinta-2', s === 'berlaku' && 'font-medium')}>{LABEL_STATUS_PENGUMUMAN[s]}</span>
  }
  const kolom: KolomTabel<Pengumuman>[] = [
    {
      id: 'judul',
      judul: 'Pengumuman',
      wajib: true,
      isi: (p) => (
        <span className="flex flex-col">
          <span className="font-medium">{p.judul}</span>
          <span className="text-teks-kecil text-tinta-2">{p.isi}</span>
        </span>
      ),
    },
    { id: 'masa', judul: 'Berlaku', isi: (p) => <span className="whitespace-nowrap">{masa(p)}</span> },
    { id: 'status', judul: 'Status', isi: status },
  ]
  return (
    <div className="flex flex-col gap-6">
      <KepalaWebsite aktif="pengumuman" />
      <DataTable
        label="Pengumuman"
        kolom={kolom}
        kolomUtama="judul"
        baris={kueri.data?.data}
        memuat={kueri.isPending}
        galat={kueri.isError ? pesanGalat(kueri.error) : null}
        onCobaLagi={() => void kueri.refetch()}
        kosong={<EmptyState judul="Belum ada pengumuman" />}
        barisRingkas={(p) => (
          <span className="flex flex-col gap-1">
            <span className="font-medium">{p.judul}</span>
            <span className="text-teks-kecil text-tinta-2">{masa(p)}</span>
            {status(p)}
          </span>
        )}
      />
    </div>
  )
}
