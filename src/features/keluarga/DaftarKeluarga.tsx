import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { pesanGalat } from '@/api/galat'
import { cariKeluarga, daftarKeluarga, kunciKeluarga } from '@/api/keluarga'
import { opsiRingkasanPenduduk } from '@/api/penduduk'
import { formatAngka } from '@/domain/format/angka'
import type { BarisKeluarga, FilterKeluarga } from '@/domain/keluarga/schema'
import { kelompokkanNik } from '@/domain/penduduk/nik'
import { alamatPendek, namaDusun } from '@/domain/wilayah/alamat'
import { DataTable, type KolomTabel } from '@/ui/data/DataTable'
import { Pagination } from '@/ui/data/Pagination'
import { Tanggal } from '@/ui/domain/Tanggal'
import { useTunda } from '@/ui/hooks/useTunda'
import { SearchField } from '@/ui/isian/SearchField'
import { Select } from '@/ui/isian/Select'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { Skeleton } from '@/ui/umpan-balik/Skeleton'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { TabKependudukan } from '../penduduk/TabKependudukan'

type Props = {
  filter: FilterKeluarga
  onUbahFilter: (ubah: Partial<FilterKeluarga>) => void
  onBukaKeluarga: (id: string) => void
  sekarang?: Date
}

const SEMUA = 'semua'

/** Daftar KK (SPEC §6.5): kotak cari (POST) dan filter dusun. */
export function DaftarKeluarga({ filter, onUbahFilter, onBukaKeluarga, sekarang }: Props) {
  const { pengguna, desa, dusun } = useSesiAdmin()
  const hariIni = useMemo(() => sekarang ?? new Date(), [sekarang])
  const [kata, setKata] = useState('')
  const kataTunda = useTunda(kata.trim(), 300)
  const cariAktif = kataTunda !== ''
  const daftar = useQuery({
    queryKey: cariAktif ? kunciKeluarga.cari(kataTunda, filter) : kunciKeluarga.daftar(filter),
    queryFn: ({ signal }) => (cariAktif ? cariKeluarga(kataTunda, filter, signal) : daftarKeluarga(filter, signal)),
    placeholderData: keepPreviousData,
  })
  const ringkasan = useQuery(opsiRingkasanPenduduk())

  const kolom = useMemo(
    (): KolomTabel<BarisKeluarga>[] => [
      { id: 'nomorKk', judul: 'Nomor KK', lebar: 'w-48', isi: (k) => <span className="font-mono">{kelompokkanNik(k.nomorKk)}</span> },
      { id: 'kepala', judul: 'Kepala keluarga', isi: (k) => <span className="font-medium">{k.namaKepala}</span> },
      { id: 'alamat', judul: 'Alamat', isi: (k) => alamatPendek(k, dusun, desa.istilahWilayah) },
      { id: 'anggota', judul: 'Anggota', rataKanan: true, isi: (k) => formatAngka(k.jumlahAnggota) },
      { id: 'diperbarui', judul: 'Terakhir diperbarui', isi: (k) => <Tanggal iso={k.diperbaruiPada} gaya="relatif" sekarang={hariIni} /> },
    ],
    [dusun, desa, hariIni],
  )

  const ubahKata = (baru: string) => {
    setKata(baru)
    if (filter.page !== 1) onUbahFilter({ page: 1 })
  }
  const hapusDusun = () => onUbahFilter({ dusun: undefined, page: 1 })

  const kosong =
    cariAktif && filter.dusun !== undefined ? (
      <EmptyState
        judul={`Tidak ada KK yang cocok dengan “${kataTunda}”`}
        keterangan={`Pencarian hanya di dalam ${desa.istilahWilayah.dusun.toLowerCase()} yang sedang dipilih. Hapus filter untuk mencari di seluruh desa.`}
        aksi={<Tombol onPress={hapusDusun}>Hapus filter</Tombol>}
      />
    ) : cariAktif ? (
      <EmptyState
        judul={`Tidak ada KK yang cocok dengan “${kataTunda}”`}
        keterangan="Ketik minimal 4 angka nomor KK, atau nama kepala keluarga."
        aksi={<Tombol onPress={() => setKata('')}>Hapus pencarian</Tombol>}
      />
    ) : (daftar.data?.meta.total ?? 0) > 0 ? (
      <EmptyState
        judul={`Halaman ${formatAngka(filter.page)} tidak ada`}
        aksi={<Tombol onPress={() => onUbahFilter({ page: 1 })}>Ke halaman pertama</Tombol>}
      />
    ) : filter.dusun !== undefined ? (
      <EmptyState judul="Tidak ada KK di dusun ini" aksi={<Tombol onPress={hapusDusun}>Hapus filter</Tombol>} />
    ) : (
      <EmptyState judul="Belum ada data keluarga" keterangan="Data KK desa ini masih kosong." />
    )

  return (
    <div>
      <PageHeader
        jejak={[{ label: 'Kependudukan' }]}
        judul="Keluarga"
        meta={ringkasan.data ? `${formatAngka(ringkasan.data.kk)} KK` : ringkasan.isError ? null : <Skeleton className="h-4 w-24" />}
        tab={<TabKependudukan aktif="keluarga" />}
      />
      <div className="flex flex-wrap items-end gap-3 py-4">
        <SearchField
          label="Cari keluarga"
          placeholder="Nomor KK atau nama kepala keluarga"
          value={kata}
          onChange={ubahKata}
          className="w-full sm:w-80"
        />
        {pengguna.peran !== 'kadus' && (
          <Select
            label={desa.istilahWilayah.dusun}
            pilihan={[
              { id: SEMUA, label: `Semua ${desa.istilahWilayah.dusun.toLowerCase()}` },
              ...dusun.map((d) => ({ id: String(d.nomor), label: namaDusun(d, desa.istilahWilayah) })),
            ]}
            nilai={filter.dusun === undefined ? SEMUA : String(filter.dusun)}
            onUbah={(id) => onUbahFilter({ dusun: id && id !== SEMUA ? Number(id) : undefined, page: 1 })}
            className="w-56"
          />
        )}
      </div>
      <div aria-busy={daftar.isPlaceholderData} className={daftar.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
        <DataTable
          label="Daftar keluarga"
          kolom={kolom}
          kolomUtama="kepala"
          baris={daftar.data?.data}
          memuat={daftar.isPending}
          galat={daftar.isError ? pesanGalat(daftar.error) : null}
          onCobaLagi={() => void daftar.refetch()}
          kosong={kosong}
          onBukaBaris={(k) => onBukaKeluarga(k.id)}
          barisRingkas={(k) => (
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{k.namaKepala}</span>
              <span className="font-mono text-teks-kecil text-tinta-2">{kelompokkanNik(k.nomorKk)}</span>
              <span className="text-teks-kecil text-tinta-2">
                {alamatPendek(k, dusun, desa.istilahWilayah)} · {formatAngka(k.jumlahAnggota)} anggota
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
