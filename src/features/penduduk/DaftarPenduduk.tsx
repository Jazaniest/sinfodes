import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { pesanGalat } from '@/api/galat'
import { cariPenduduk, daftarPenduduk, kunciPenduduk, opsiRingkasanPenduduk } from '@/api/penduduk'
import { formatAngka } from '@/domain/format/angka'
import { formatDiperbarui } from '@/domain/format/tanggal'
import { URUTAN_PENDUDUK, type FilterPenduduk as Filter } from '@/domain/penduduk/filter'
import { penandaPenduduk } from '@/domain/penduduk/penanda'
import type { BarisPenduduk } from '@/domain/penduduk/schema'
import { kodeWilayahNik } from '@/domain/wilayah/alamat'
import { AturKolom } from '@/ui/data/AturKolom'
import { DataTable } from '@/ui/data/DataTable'
import { Pagination } from '@/ui/data/Pagination'
import { useKolomTampil } from '@/ui/data/useKolomTampil'
import { Nik } from '@/ui/domain/Nik'
import { useTunda } from '@/ui/hooks/useTunda'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { Skeleton } from '@/ui/umpan-balik/Skeleton'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { daftarFilterAktif, HAPUS_SEMUA_FILTER } from './filter-url'
import { FilterPenduduk } from './FilterPenduduk'
import { buatKolomPenduduk, KOLOM_BAWAAN_PENDUDUK } from './kolom'
import { LaciPenduduk } from './LaciPenduduk'
import { PenandaCap } from './PenandaCap'
import { TabKependudukan } from './TabKependudukan'

type Props = {
  filter: Filter
  onUbahFilter: (ubah: Partial<Filter>) => void
  onBukaProfil: (id: string) => void
  sekarang?: Date
}

/** Daftar penduduk (SPEC §6.2). Filter terstruktur di URL; kata cari hanya di memori dan dikirim lewat POST. */
export function DaftarPenduduk({ filter, onUbahFilter, onBukaProfil, sekarang }: Props) {
  const { pengguna, desa, dusun } = useSesiAdmin()
  const hariIni = useMemo(() => sekarang ?? new Date(), [sekarang])
  const [kata, setKata] = useState('')
  const [terpilih, setTerpilih] = useState<BarisPenduduk | null>(null)
  const kataTunda = useTunda(kata.trim(), 300)
  const cariAktif = kataTunda !== ''

  const daftar = useQuery({
    queryKey: cariAktif ? kunciPenduduk.cari(kataTunda, filter) : kunciPenduduk.daftar(filter),
    queryFn: ({ signal }) => (cariAktif ? cariPenduduk(kataTunda, filter, signal) : daftarPenduduk(filter, signal)),
    placeholderData: keepPreviousData,
  })
  const ringkasan = useQuery(opsiRingkasanPenduduk())

  const ctx = useMemo(
    () => ({ dusun, istilah: desa.istilahWilayah, kodeWilayahDesa: kodeWilayahNik(desa), hariIni }),
    [dusun, desa, hariIni],
  )
  const kolom = useMemo(() => buatKolomPenduduk(ctx), [ctx])
  const [kolomTampil, ubahKolomTampil] = useKolomTampil('penduduk', KOLOM_BAWAAN_PENDUDUK)
  const kolomAktif = useMemo(() => kolom.filter((k) => k.wajib || kolomTampil.has(k.id)), [kolom, kolomTampil])
  const adaFilter = daftarFilterAktif(filter, dusun, desa.istilahWilayah).length > 0

  const ubahKata = (baru: string) => {
    setKata(baru)
    if (filter.page !== 1) onUbahFilter({ page: 1 })
  }

  const kosong = cariAktif && adaFilter ? (
    <EmptyState
      judul={`Tidak ada penduduk yang cocok dengan “${kataTunda}”`}
      keterangan="Pencarian hanya di dalam filter yang sedang aktif. Hapus filter untuk mencari di seluruh penduduk."
      aksi={<Tombol onPress={() => onUbahFilter(HAPUS_SEMUA_FILTER)}>Hapus filter</Tombol>}
    />
  ) : cariAktif ? (
    <EmptyState
      judul={`Tidak ada penduduk yang cocok dengan “${kataTunda}”`}
      keterangan="Periksa ejaan nama, atau ketik minimal 4 angka NIK atau nomor KK."
      aksi={<Tombol onPress={() => setKata('')}>Hapus pencarian</Tombol>}
    />
  ) : (daftar.data?.meta.total ?? 0) > 0 ? (
    <EmptyState
      judul={`Halaman ${formatAngka(filter.page)} tidak ada`}
      keterangan="Daftar ini lebih pendek dari halaman yang dibuka."
      aksi={<Tombol onPress={() => onUbahFilter({ page: 1 })}>Ke halaman pertama</Tombol>}
    />
  ) : adaFilter ? (
    <EmptyState
      judul="Tidak ada penduduk yang cocok dengan filter ini"
      aksi={<Tombol onPress={() => onUbahFilter(HAPUS_SEMUA_FILTER)}>Hapus filter</Tombol>}
    />
  ) : (
    <EmptyState judul="Belum ada data penduduk" keterangan="Data penduduk desa ini masih kosong." />
  )

  const meta = ringkasan.data ? (
    `${formatAngka(ringkasan.data.jiwa)} jiwa${
      ringkasan.data.diperbaruiPada ? ` · diperbarui ${formatDiperbarui(ringkasan.data.diperbaruiPada, hariIni)}` : ''
    }`
  ) : ringkasan.isError ? null : (
    <Skeleton className="h-4 w-48" />
  )

  return (
    <div>
      <PageHeader jejak={[{ label: 'Kependudukan' }]} judul="Penduduk" meta={meta} tab={<TabKependudukan aktif="penduduk" />} />
      <FilterPenduduk
        filter={filter}
        onUbah={onUbahFilter}
        kata={kata}
        onKata={ubahKata}
        dusun={dusun}
        istilah={desa.istilahWilayah}
        tampilkanDusun={pengguna.peran !== 'kadus'}
        aturKolom={<AturKolom kolom={kolom} tampil={kolomTampil} onUbah={ubahKolomTampil} />}
      />
      <div aria-busy={daftar.isPlaceholderData} className={daftar.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
        <DataTable
          label="Daftar penduduk"
          kolom={kolomAktif}
          kolomUtama="nama"
          baris={daftar.data?.data}
          memuat={daftar.isPending}
          galat={daftar.isError ? pesanGalat(daftar.error) : null}
          onCobaLagi={() => void daftar.refetch()}
          kosong={kosong}
          urutAktif={filter.urut}
          onUrut={(u) => {
            const urut = URUTAN_PENDUDUK.find((x) => x === u)
            if (urut) onUbahFilter({ urut, page: 1 })
          }}
          onBukaBaris={setTerpilih}
          barisRingkas={(p) => (
            <span className="flex flex-col gap-1">
              <span className="font-medium">{p.nama}</span>
              <Nik nik={p.nik} />
              <PenandaCap penanda={penandaPenduduk(p, ctx).filter((x) => x !== 'belum-ada-nik')} />
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
      <LaciPenduduk penduduk={terpilih} hariIni={hariIni} onTutup={() => setTerpilih(null)} onBukaProfil={onBukaProfil} />
    </div>
  )
}
