import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { pesanGalat } from '@/api/galat'
import { opsiDaftarPengaduan, opsiJumlahPengaduan } from '@/api/pengaduan'
import { formatAngka } from '@/domain/format/angka'
import { formatWaktuRelatif } from '@/domain/format/tanggal'
import {
  KATEGORI_PENGADUAN, LABEL_STATUS_PENGADUAN, STATUS_PENGADUAN, teksTanggapanPertama, type BarisPengaduan, type FilterPengaduan,
  type StatusPengaduan,
} from '@/domain/pengaduan/schema'
import { cakupanDusun } from '@/domain/pengguna/hak-akses'
import { namaDusun, namaDusunPendek } from '@/domain/wilayah/alamat'
import { Cap } from '@/ui/cap/Cap'
import { DataTable, type KolomTabel } from '@/ui/data/DataTable'
import { Pagination } from '@/ui/data/Pagination'
import { Select } from '@/ui/isian/Select'
import { TabNav } from '@/ui/navigasi/TabNav'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { Skeleton } from '@/ui/umpan-balik/Skeleton'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { hrefPengaduan } from './filter-url'

type Props = {
  filter: FilterPengaduan
  onUbahFilter: (ubah: Partial<FilterPengaduan>) => void
  onBuka: (id: string) => void
  sekarang?: Date
}

const SEMUA = 'semua'
const KOSONG: Readonly<Record<StatusPengaduan, { judul: string; keterangan?: string }>> = {
  baru: { judul: 'Semua pengaduan sudah dibalas', keterangan: 'Pengaduan baru dari warga muncul di sini.' },
  ditanggapi: { judul: 'Tidak ada pengaduan yang sedang ditanggapi' },
  selesai: { judul: 'Belum ada pengaduan yang selesai' },
}

/** Kotak masuk pengaduan (SPEC §8): tab status, filter kategori dan dusun. Kepala Dusun hanya melihat dusunnya. */
export function DaftarPengaduan({ filter, onUbahFilter, onBuka, sekarang }: Props) {
  const { pengguna, desa, dusun } = useSesiAdmin()
  const kini = useMemo(() => sekarang ?? new Date(), [sekarang])
  const daftar = useQuery({ ...opsiDaftarPengaduan(filter), placeholderData: keepPreviousData })
  const jumlah = useQuery(opsiJumlahPengaduan())
  const satuDusun = cakupanDusun(pengguna) !== null
  const istilah = desa.istilahWilayah
  const namaPendek = useMemo(() => new Map(dusun.map((d) => [d.id, namaDusunPendek(d, istilah)])), [dusun, istilah])
  const total = daftar.data?.meta.total

  const kolom = useMemo(
    (): KolomTabel<BarisPengaduan>[] => [
      { id: 'nomor', judul: 'Nomor', isi: (a) => <span className="font-mono text-teks-kecil whitespace-nowrap">{a.nomor}</span> },
      {
        id: 'pengaduan',
        judul: 'Pengaduan',
        wajib: true,
        isi: (a) => (
          <span className="flex flex-col">
            <span className="font-medium">{a.judul}</span>
            <span className="text-teks-kecil text-tinta-2">{a.pelapor.nama}</span>
          </span>
        ),
      },
      { id: 'kategori', judul: 'Kategori', isi: (a) => a.kategori },
      { id: 'dusun', judul: istilah.dusun, isi: (a) => namaPendek.get(a.dusunId) ?? '—' },
      {
        id: 'masuk',
        judul: 'Masuk',
        isi: (a) => (
          <time dateTime={a.masukPada} className="whitespace-nowrap">
            {formatWaktuRelatif(a.masukPada, kini)}
          </time>
        ),
      },
      {
        id: 'tanggapan',
        judul: 'Tanggapan pertama',
        isi: (a) => {
          const t = teksTanggapanPertama(a, kini)
          return <span className={t.menunggu ? 'text-oker' : undefined}>{t.teks}</span>
        },
      },
      { id: 'status', judul: 'Status', isi: (a) => <Cap varian={a.status} /> },
    ],
    [istilah, namaPendek, kini],
  )

  const tersaring = filter.kategori !== undefined || filter.dusun !== undefined
  const kosong =
    (total ?? 0) > 0 ? (
      <EmptyState
        judul={`Halaman ${formatAngka(filter.page)} tidak ada`}
        aksi={<Tombol onPress={() => onUbahFilter({ page: 1 })}>Ke halaman pertama</Tombol>}
      />
    ) : tersaring ? (
      <EmptyState
        judul={`Tidak ada pengaduan ${LABEL_STATUS_PENGADUAN[filter.status].toLowerCase()} dengan saringan ini`}
        aksi={<Tombol onPress={() => onUbahFilter({ kategori: undefined, dusun: undefined, page: 1 })}>Hapus saringan</Tombol>}
      />
    ) : (
      <EmptyState judul={KOSONG[filter.status].judul} keterangan={KOSONG[filter.status].keterangan} />
    )
  const meta = jumlah.data ? (
    `${formatAngka(jumlah.data.status.baru)} baru · ${formatAngka(jumlah.data.status.ditanggapi)} ditanggapi · ${formatAngka(jumlah.data.status.selesai)} selesai`
  ) : jumlah.isError ? null : (
    <Skeleton className="h-4 w-64 max-w-full" />
  )

  return (
    <div>
      <PageHeader jejak={[{ label: 'Pelayanan' }]} judul="Pengaduan" meta={meta} />
      <div className="border-b border-garis pt-4">
        <TabNav
          label="Status pengaduan"
          items={STATUS_PENGADUAN.map((s) => ({
            label: LABEL_STATUS_PENGADUAN[s],
            href: hrefPengaduan({ ...filter, status: s, page: 1 }),
            aktif: filter.status === s,
            hitungan: jumlah.data ? { nilai: jumlah.data.status[s], label: 'pengaduan' } : undefined,
          }))}
        />
      </div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 py-4">
        <Select
          label="Kategori"
          pilihan={[{ id: SEMUA, label: 'Semua kategori' }, ...KATEGORI_PENGADUAN.map((k) => ({ id: k, label: k }))]}
          nilai={filter.kategori ?? SEMUA}
          onUbah={(id) => onUbahFilter({ kategori: KATEGORI_PENGADUAN.find((k) => k === id), page: 1 })}
          className="w-full sm:w-56"
        />
        {!satuDusun && (
          <Select
            label={istilah.dusun}
            pilihan={[{ id: SEMUA, label: `Semua ${istilah.dusun.toLowerCase()}` }, ...dusun.map((d) => ({ id: String(d.nomor), label: namaDusun(d, istilah) }))]}
            nilai={filter.dusun === undefined ? SEMUA : String(filter.dusun)}
            onUbah={(id) => onUbahFilter({ dusun: dusun.find((d) => String(d.nomor) === id)?.nomor, page: 1 })}
            className="w-full sm:w-64"
          />
        )}
      </div>
      <div aria-busy={daftar.isPlaceholderData} className={daftar.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
        <DataTable
          label="Kotak masuk pengaduan"
          kolom={kolom}
          kolomUtama="pengaduan"
          baris={daftar.data?.data}
          memuat={daftar.isPending}
          galat={daftar.isError ? pesanGalat(daftar.error) : null}
          onCobaLagi={() => void daftar.refetch()}
          kosong={kosong}
          onBukaBaris={(a) => onBuka(a.id)}
          barisRingkas={(a) => (
            <span className="flex flex-col gap-1">
              <span className="font-medium">{a.judul}</span>
              <span className="text-teks-kecil text-tinta-2">
                {a.pelapor.nama} · {namaPendek.get(a.dusunId) ?? '—'} · {formatWaktuRelatif(a.masukPada, kini)}
              </span>
              <span>
                <Cap varian={a.status} />
              </span>
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
