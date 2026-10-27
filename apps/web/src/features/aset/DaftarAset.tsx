import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { opsiAset } from '@/api/tata-kelola'
import { KATEGORI_ASET, ringkasAset, type Aset, type FilterAset } from '@/domain/aset/schema'
import { formatAngka } from '@/domain/format/angka'
import { Cap } from '@/ui/cap/Cap'
import { ChipFilter } from '@/ui/data/ChipFilter'
import { DataTable, type KolomTabel } from '@/ui/data/DataTable'
import { Rupiah } from '@/ui/domain/Rupiah'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'

type Props = { filter: FilterAset; onUbahFilter: (ubah: Partial<FilterAset>) => void }

const SEMUA = 'semua'

const KOLOM: readonly KolomTabel<Aset>[] = [
  { id: 'kode', judul: 'Kode', isi: (a) => <span className="font-mono text-teks-kecil whitespace-nowrap">{a.kode}</span> },
  {
    id: 'nama',
    judul: 'Nama',
    wajib: true,
    isi: (a) => (
      <span className="flex flex-col">
        <span className="font-medium">{a.nama}</span>
        {a.keterangan && <span className="text-teks-kecil text-tinta-2">{a.keterangan}</span>}
      </span>
    ),
  },
  { id: 'kategori', judul: 'Kategori', isi: (a) => a.kategori },
  { id: 'tahun', judul: 'Tahun', rataKanan: true, isi: (a) => <span className="tabular-nums">{a.tahunPerolehan}</span> },
  { id: 'asal', judul: 'Asal', isi: (a) => a.asal },
  { id: 'nilai', judul: 'Nilai perolehan', rataKanan: true, isi: (a) => <Rupiah nilai={a.nilaiPerolehan} /> },
  { id: 'kondisi', judul: 'Kondisi', isi: (a) => <Cap varian={a.kondisi} /> },
]

/** Inventaris aset desa (SPEC §8): hanya lihat, dengan jumlah nilai perolehan baris yang tampil. */
export function DaftarAset({ filter, onUbahFilter }: Props) {
  const daftar = useQuery({ ...opsiAset(filter), placeholderData: keepPreviousData })
  const semua = useQuery(opsiAset({}))
  const ringkas = daftar.data ? ringkasAset(daftar.data.data) : null
  const total = semua.data ? ringkasAset(semua.data.data) : null

  return (
    <div>
      <PageHeader
        jejak={[{ label: 'Tata kelola' }]}
        judul="Aset Desa"
        meta={
          total && (
            <>
              {formatAngka(total.jumlah)} aset · nilai perolehan <Rupiah nilai={total.nilai} ringkas />
            </>
          )
        }
      />
      <div className="py-4">
        <ChipFilter
          label="Kategori aset"
          pilihan={[{ id: SEMUA, label: 'Semua kategori' }, ...KATEGORI_ASET.map((k) => ({ id: k, label: k }))]}
          nilai={filter.kategori ?? SEMUA}
          onUbah={(id) => onUbahFilter({ kategori: KATEGORI_ASET.find((k) => k === id) })}
        />
      </div>
      <div aria-busy={daftar.isPlaceholderData} className={daftar.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
        <DataTable
          label="Inventaris aset desa"
          kolom={KOLOM}
          kolomUtama="nama"
          baris={daftar.data?.data}
          memuat={daftar.isPending}
          galat={daftar.isError ? pesanGalat(daftar.error) : null}
          onCobaLagi={() => void daftar.refetch()}
          kosong={<EmptyState judul="Belum ada aset di kategori ini" />}
          barisRingkas={(a) => (
            <span className="flex flex-col gap-1">
              <span className="font-medium">{a.nama}</span>
              <span className="text-teks-kecil text-tinta-2">
                <span className="font-mono">{a.kode}</span> · {a.tahunPerolehan} · <Rupiah nilai={a.nilaiPerolehan} ringkas />
              </span>
              <span>
                <Cap varian={a.kondisi} />
              </span>
            </span>
          )}
        />
      </div>
      {ringkas && (
        <p className="mt-3 text-right font-medium tabular-nums">
          Jumlah: {formatAngka(ringkas.jumlah)} aset · nilai perolehan <Rupiah nilai={ringkas.nilai} />
        </p>
      )}
    </div>
  )
}
