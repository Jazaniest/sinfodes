import { useQuery } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { opsiAgenda } from '@/api/website'
import { formatTanggal } from '@/domain/format/tanggal'
import { teksJamAgenda, type Agenda } from '@/domain/website/schema'
import { DataTable, type KolomTabel } from '@/ui/data/DataTable'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { KepalaWebsite } from './TabWebsite'

const KOLOM: readonly KolomTabel<Agenda>[] = [
  { id: 'tanggal', judul: 'Tanggal', isi: (a) => <span className="whitespace-nowrap">{formatTanggal(a.tanggal, 'hari')}</span> },
  { id: 'jam', judul: 'Waktu', isi: (a) => <span className="whitespace-nowrap tabular-nums">{teksJamAgenda(a)}</span> },
  { id: 'kegiatan', judul: 'Kegiatan', wajib: true, isi: (a) => <span className="font-medium">{a.judul}</span> },
  { id: 'tempat', judul: 'Tempat', isi: (a) => a.tempat },
]

/** Agenda kegiatan desa (SPEC §8): yang terdekat dulu. */
export function DaftarAgenda() {
  const kueri = useQuery(opsiAgenda())
  return (
    <div className="flex flex-col gap-6">
      <KepalaWebsite aktif="agenda" />
      <DataTable
        label="Agenda"
        kolom={KOLOM}
        kolomUtama="kegiatan"
        baris={kueri.data?.data}
        memuat={kueri.isPending}
        galat={kueri.isError ? pesanGalat(kueri.error) : null}
        onCobaLagi={() => void kueri.refetch()}
        kosong={<EmptyState judul="Belum ada agenda" />}
        barisRingkas={(a) => (
          <span className="flex flex-col gap-1">
            <span className="font-medium">{a.judul}</span>
            <span className="text-teks-kecil text-tinta-2">
              {formatTanggal(a.tanggal, 'hari')} · {teksJamAgenda(a)} · {a.tempat}
            </span>
          </span>
        )}
      />
    </div>
  )
}
