import { useQuery } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { opsiArtikel } from '@/api/website'
import { formatAngka } from '@/domain/format/angka'
import { formatTanggal } from '@/domain/format/tanggal'
import type { Artikel } from '@/domain/website/schema'
import { Cap } from '@/ui/cap/Cap'
import { DataTable, type KolomTabel } from '@/ui/data/DataTable'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { KepalaWebsite } from './TabWebsite'

const KOLOM: readonly KolomTabel<Artikel>[] = [
  { id: 'judul', judul: 'Judul', wajib: true, isi: (a) => <span className="font-medium">{a.judul}</span> },
  { id: 'kategori', judul: 'Kategori', isi: (a) => a.kategori },
  { id: 'status', judul: 'Status', isi: (a) => <Cap varian={a.status} /> },
  { id: 'penulis', judul: 'Penulis', isi: (a) => a.penulis },
  { id: 'tanggal', judul: 'Tanggal', isi: (a) => <span className="whitespace-nowrap">{formatTanggal(a.tanggal, 'pendek')}</span> },
  {
    id: 'dibaca',
    judul: 'Dibaca',
    rataKanan: true,
    isi: (a) => (a.status === 'terbit' ? <span className="tabular-nums">{formatAngka(a.dibaca)}</span> : <span className="text-tinta-2">—</span>),
  },
]

/** Artikel kabar desa (SPEC §8): hanya lihat; penyunting artikel belum ada. */
export function DaftarArtikel() {
  const kueri = useQuery(opsiArtikel())
  const artikel = kueri.data?.data
  const terbit = artikel?.filter((a) => a.status === 'terbit').length ?? 0
  return (
    <div className="flex flex-col gap-6">
      <KepalaWebsite
        aktif="artikel"
        meta={artikel ? `${formatAngka(artikel.length)} artikel · ${formatAngka(terbit)} terbit, ${formatAngka(artikel.length - terbit)} draf` : undefined}
      />
      <DataTable
        label="Artikel"
        kolom={KOLOM}
        kolomUtama="judul"
        baris={artikel}
        memuat={kueri.isPending}
        galat={kueri.isError ? pesanGalat(kueri.error) : null}
        onCobaLagi={() => void kueri.refetch()}
        kosong={<EmptyState judul="Belum ada artikel" />}
        barisRingkas={(a) => (
          <span className="flex flex-col gap-1">
            <span className="font-medium">{a.judul}</span>
            <span className="text-teks-kecil text-tinta-2">
              {a.kategori} · {a.penulis} · {formatTanggal(a.tanggal, 'pendek')}
            </span>
            <span>
              <Cap varian={a.status} />
            </span>
          </span>
        )}
      />
    </div>
  )
}
