import { CaretDown } from '@phosphor-icons/react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { pesanGalat } from '@/api/galat'
import { opsiDaftarMutasi, opsiRingkasanMutasi } from '@/api/mutasi'
import { formatAngka } from '@/domain/format/angka'
import { daftarBulanTerakhir, formatBulan, formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { kalimatRingkasanMutasi, rincianMutasi, type BarisMutasi, type FilterMutasi } from '@/domain/mutasi/buku'
import { JENIS_MUTASI, LABEL_MUTASI } from '@/domain/mutasi/schema'
import { boleh } from '@/domain/pengguna/hak-akses'
import { ChipFilter } from '@/ui/data/ChipFilter'
import { DataTable, type KolomTabel } from '@/ui/data/DataTable'
import { Pagination } from '@/ui/data/Pagination'
import { Select } from '@/ui/isian/Select'
import { MenuAksi } from '@/ui/lapisan/Menu'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { Skeleton } from '@/ui/umpan-balik/Skeleton'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { TabKependudukan } from '../penduduk/TabKependudukan'
import { MENU_CATAT_MUTASI } from './menu'

type Props = {
  filter: FilterMutasi
  onUbahFilter: (ubah: Partial<FilterMutasi>) => void
  onBukaPenduduk: (id: string) => void
  sekarang?: Date
}
type Baris = BarisMutasi & { id: string }

const SEMUA = 'semua'

function namaPenduduk(b: BarisMutasi): string {
  const [pertama, ...lain] = b.penduduk
  if (!pertama) return '—'
  return lain.length === 0 ? pertama.nama : `${pertama.nama} dan ${lain.length} lainnya`
}

/** Buku Mutasi (SPEC §6.6): ringkasan bulan berjalan, filter jenis dan bulan di URL, dan menu *Catat mutasi*. */
export function DaftarMutasi({ filter, onUbahFilter, onBukaPenduduk, sekarang }: Props) {
  const { pengguna } = useSesiAdmin()
  const hariIni = useMemo(() => sekarang ?? new Date(), [sekarang])
  const bulanIni = tanggalIsoWib(hariIni).slice(0, 7)
  const ringkasan = useQuery(opsiRingkasanMutasi(bulanIni))
  const daftar = useQuery({ ...opsiDaftarMutasi(filter), placeholderData: keepPreviousData })
  const baris: Baris[] | undefined = daftar.data?.data.map((b) => ({ ...b, id: b.mutasi.id }))

  const kolom: KolomTabel<Baris>[] = [
    { id: 'tanggal', judul: 'Tanggal', lebar: 'w-32', isi: (b) => formatTanggal(b.mutasi.tanggal, 'pendek') },
    { id: 'jenis', judul: 'Jenis', lebar: 'w-36', isi: (b) => LABEL_MUTASI[b.mutasi.jenis] },
    { id: 'penduduk', judul: 'Penduduk', isi: (b) => <span className="font-medium">{namaPenduduk(b)}</span> },
    { id: 'rincian', judul: 'Rincian', isi: (b) => rincianMutasi(b.mutasi) },
    {
      id: 'dicatat',
      judul: 'Dicatat',
      isi: (b) => (
        <span className="text-tinta-2">
          {b.mutasi.dicatatOleh.nama} · {formatTanggal(b.mutasi.dicatatPada, 'pendek')}
        </span>
      ),
    },
  ]

  const adaFilter = filter.jenis !== undefined || filter.bulan !== undefined
  const kosong =
    (daftar.data?.meta.total ?? 0) > 0 ? (
      <EmptyState
        judul={`Halaman ${formatAngka(filter.page)} tidak ada`}
        aksi={<Tombol onPress={() => onUbahFilter({ page: 1 })}>Ke halaman pertama</Tombol>}
      />
    ) : adaFilter ? (
      <EmptyState
        judul="Tidak ada mutasi yang cocok dengan filter ini"
        aksi={<Tombol onPress={() => onUbahFilter({ jenis: undefined, bulan: undefined, page: 1 })}>Hapus filter</Tombol>}
      />
    ) : (
      <EmptyState judul="Belum ada mutasi" keterangan="Kelahiran, kematian, kepindahan, dan kedatangan yang dicatat akan tampil di sini." />
    )

  const meta = ringkasan.data ? (
    kalimatRingkasanMutasi(ringkasan.data)
  ) : ringkasan.isError ? null : (
    <Skeleton className="h-4 w-80 max-w-full" />
  )

  return (
    <div>
      <PageHeader
        jejak={[{ label: 'Kependudukan' }]}
        judul="Mutasi"
        meta={meta}
        aksi={
          boleh(pengguna.peran, 'penduduk.ubah') && (
            <MenuAksi
              pemicu={
                <Tombol varian="utama" ikon={<CaretDown aria-hidden size={14} />}>
                  Catat mutasi
                </Tombol>
              }
              items={MENU_CATAT_MUTASI}
              placement="bottom end"
            />
          )
        }
        tab={<TabKependudukan aktif="mutasi" />}
      />
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 py-4">
        <ChipFilter
          label="Jenis mutasi"
          pilihan={[{ id: SEMUA, label: 'Semua' }, ...JENIS_MUTASI.map((j) => ({ id: j, label: LABEL_MUTASI[j] }))]}
          nilai={filter.jenis ?? SEMUA}
          onUbah={(id) => onUbahFilter({ jenis: JENIS_MUTASI.find((j) => j === id), page: 1 })}
        />
        <Select
          label="Bulan"
          pilihan={[{ id: SEMUA, label: 'Semua bulan' }, ...daftarBulanTerakhir(hariIni, 24).map((b) => ({ id: b, label: formatBulan(b) }))]}
          nilai={filter.bulan ?? SEMUA}
          onUbah={(id) => onUbahFilter({ bulan: id && id !== SEMUA ? id : undefined, page: 1 })}
          className="w-48"
        />
      </div>
      <div aria-busy={daftar.isPlaceholderData} className={daftar.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
        <DataTable
          label="Buku mutasi"
          kolom={kolom}
          kolomUtama="penduduk"
          baris={baris}
          memuat={daftar.isPending}
          galat={daftar.isError ? pesanGalat(daftar.error) : null}
          onCobaLagi={() => void daftar.refetch()}
          kosong={kosong}
          onBukaBaris={(b) => {
            const [pertama] = b.penduduk
            if (pertama) onBukaPenduduk(pertama.id)
          }}
          barisRingkas={(b) => (
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{namaPenduduk(b)}</span>
              <span className="text-teks-kecil text-tinta-2">
                {LABEL_MUTASI[b.mutasi.jenis]} · {formatTanggal(b.mutasi.tanggal, 'pendek')}
              </span>
              <span className="text-teks-kecil text-tinta-2">{rincianMutasi(b.mutasi)}</span>
            </span>
          )}
        />
      </div>
      {daftar.data && daftar.data.meta.total > 0 && !daftar.isError && (
        <Pagination
          page={filter.page}
          pageSize={filter.pageSize}
          total={daftar.data.meta.total}
          onPage={(page) => onUbahFilter({ page })}
          onPageSize={(pageSize) => onUbahFilter({ pageSize, page: 1 })}
        />
      )}
    </div>
  )
}
