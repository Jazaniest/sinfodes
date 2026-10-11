import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { pesanGalat } from '@/api/galat'
import { opsiBalita, opsiPosyandu } from '@/api/kesehatan'
import { formatAngka } from '@/domain/format/angka'
import { formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import {
  LABEL_STATUS_GIZI, STATUS_GIZI, teksJadwal, type BarisBalita, type FilterBalita, type RingkasPosyandu,
} from '@/domain/kesehatan/schema'
import { namaDusun } from '@/domain/wilayah/alamat'
import { Cap } from '@/ui/cap/Cap'
import { ChipFilter } from '@/ui/data/ChipFilter'
import { DataTable, type KolomTabel } from '@/ui/data/DataTable'
import { Pagination } from '@/ui/data/Pagination'
import { Select } from '@/ui/isian/Select'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { LaciBalita } from './LaciBalita'

type Props = { filter: FilterBalita; onUbahFilter: (ubah: Partial<FilterBalita>) => void; sekarang?: Date }

const SEMUA = 'semua'
const judulBagian = 'text-label font-medium text-tinta-2 uppercase'
const belumDiukur = <span className="text-tinta-2">Belum diukur</span>

/** Kesehatan (SPEC §8): posyandu dengan jadwal bulan ini, dan pemantauan balita. Hanya lihat. */
export function Kesehatan({ filter, onUbahFilter, sekarang }: Props) {
  const { desa, dusun } = useSesiAdmin()
  const hariIni = useMemo(() => tanggalIsoWib(sekarang ?? new Date()), [sekarang])
  const posyandu = useQuery(opsiPosyandu())
  const balita = useQuery({ ...opsiBalita(filter), placeholderData: keepPreviousData })
  const [terpilih, setTerpilih] = useState<BarisBalita | null>(null)
  const daftarPosyandu = useMemo(() => posyandu.data?.data ?? [], [posyandu.data])
  const namaPosyandu = useMemo(() => new Map(daftarPosyandu.map((p) => [p.id, p.nama])), [daftarPosyandu])
  const jumlahBalita = daftarPosyandu.reduce((n, p) => n + p.jumlahBalita, 0)

  const kolomPosyandu = useMemo(
    (): KolomTabel<RingkasPosyandu>[] => [
      {
        id: 'posyandu',
        judul: 'Posyandu',
        wajib: true,
        isi: (p) => {
          const d = dusun.find((x) => x.id === p.dusunId)
          return (
            <span className="flex flex-col">
              <span className="font-medium">{p.nama}</span>
              <span className="text-teks-kecil text-tinta-2">{d ? namaDusun(d, desa.istilahWilayah) : p.tempat}</span>
            </span>
          )
        },
      },
      {
        id: 'jadwal',
        judul: 'Jadwal bulan ini',
        isi: (p) => (
          <span className="flex flex-col">
            <span>{formatTanggal(p.jadwalBulanIni, 'hari')}</span>
            <span className="text-teks-kecil text-tinta-2">
              {teksJadwal(p.jadwal)}
              {p.jadwalBulanIni < hariIni && ` · berikutnya ${formatTanggal(p.jadwalBerikut, 'pendek')}`}
            </span>
          </span>
        ),
      },
      { id: 'tempat', judul: 'Tempat', isi: (p) => p.tempat },
      { id: 'balita', judul: 'Balita', rataKanan: true, isi: (p) => formatAngka(p.jumlahBalita) },
      { id: 'pantau', judul: 'Perlu pemantauan', rataKanan: true, isi: (p) => formatAngka(p.perluPemantauan) },
      { id: 'pendek', judul: 'Pendek', rataKanan: true, isi: (p) => formatAngka(p.pendek) },
    ],
    [dusun, desa.istilahWilayah, hariIni],
  )
  const kolomBalita = useMemo(
    (): KolomTabel<BarisBalita>[] => [
      {
        id: 'nama',
        judul: 'Nama',
        wajib: true,
        isi: (b) => (
          <span className="flex flex-col">
            <span className="font-medium">{b.nama}</span>
            <span className="text-teks-kecil text-tinta-2">{b.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
          </span>
        ),
      },
      { id: 'umur', judul: 'Umur', rataKanan: true, isi: (b) => <span className="whitespace-nowrap">{formatAngka(b.umurBulan)} bulan</span> },
      { id: 'ibu', judul: 'Ibu', isi: (b) => b.ibu.nama },
      { id: 'posyandu', judul: 'Posyandu', isi: (b) => namaPosyandu.get(b.posyanduId) ?? '—' },
      {
        id: 'ukur',
        judul: 'Pengukuran terakhir',
        isi: (b) => {
          const u = b.pengukuran.at(-1)
          return u ? (
            <span className="whitespace-nowrap tabular-nums">
              {formatTanggal(u.tanggal, 'pendek')} · {formatAngka(u.beratKg, 1)} kg · {formatAngka(u.tinggiCm, 1)} cm
            </span>
          ) : (
            belumDiukur
          )
        },
      },
      { id: 'status', judul: 'Status', isi: (b) => (b.status ? <Cap varian={b.status} /> : belumDiukur) },
    ],
    [namaPosyandu],
  )

  const total = balita.data?.meta.total
  const kosong =
    (total ?? 0) > 0 ? (
      <EmptyState judul={`Halaman ${formatAngka(filter.page)} tidak ada`} aksi={<Tombol onPress={() => onUbahFilter({ page: 1 })}>Ke halaman pertama</Tombol>} />
    ) : (
      <EmptyState
        judul="Tidak ada balita dengan saringan ini"
        aksi={<Tombol onPress={() => onUbahFilter({ posyandu: undefined, status: undefined, page: 1 })}>Hapus saringan</Tombol>}
      />
    )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        jejak={[{ label: 'Data desa' }]}
        judul="Kesehatan"
        meta={posyandu.data ? `${formatAngka(jumlahBalita)} balita · ${formatAngka(daftarPosyandu.length)} posyandu` : null}
      />
      <section aria-labelledby="judul-posyandu" className="flex flex-col gap-2">
        <h2 id="judul-posyandu" className={judulBagian}>
          Posyandu
        </h2>
        <DataTable
          label="Posyandu"
          kolom={kolomPosyandu}
          kolomUtama="posyandu"
          baris={posyandu.data?.data}
          memuat={posyandu.isPending}
          galat={posyandu.isError ? pesanGalat(posyandu.error) : null}
          onCobaLagi={() => void posyandu.refetch()}
          kosong={<EmptyState judul="Belum ada posyandu" />}
          onBukaBaris={(p) => onUbahFilter({ posyandu: p.id, page: 1 })}
          barisRingkas={(p) => (
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{p.nama}</span>
              <span className="text-teks-kecil text-tinta-2">
                {formatTanggal(p.jadwalBulanIni, 'pendek')} · {formatAngka(p.jumlahBalita)} balita · {formatAngka(p.perluPemantauan + p.pendek)} perlu
                perhatian
              </span>
            </span>
          )}
        />
      </section>
      <section aria-labelledby="judul-balita" className="flex flex-col gap-4">
        <h2 id="judul-balita" className={judulBagian}>
          Pemantauan balita
        </h2>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          {daftarPosyandu.length > 1 && (
            <Select
              label="Posyandu"
              pilihan={[{ id: SEMUA, label: 'Semua posyandu' }, ...daftarPosyandu.map((p) => ({ id: p.id, label: p.nama }))]}
              nilai={filter.posyandu ?? SEMUA}
              onUbah={(id) => onUbahFilter({ posyandu: id && id !== SEMUA ? id : undefined, page: 1 })}
              className="w-full sm:w-60"
            />
          )}
          <ChipFilter
            label="Status gizi"
            pilihan={[{ id: SEMUA, label: 'Semua status' }, ...STATUS_GIZI.map((s) => ({ id: s, label: LABEL_STATUS_GIZI[s] }))]}
            nilai={filter.status ?? SEMUA}
            onUbah={(id) => onUbahFilter({ status: STATUS_GIZI.find((s) => s === id), page: 1 })}
          />
        </div>
        <div aria-busy={balita.isPlaceholderData} className={balita.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
          <DataTable
            label="Pemantauan balita"
            kolom={kolomBalita}
            kolomUtama="nama"
            baris={balita.data?.data}
            memuat={balita.isPending}
            galat={balita.isError ? pesanGalat(balita.error) : null}
            onCobaLagi={() => void balita.refetch()}
            kosong={kosong}
            onBukaBaris={setTerpilih}
            barisRingkas={(b) => (
              <span className="flex flex-col gap-1">
                <span className="font-medium">{b.nama}</span>
                <span className="text-teks-kecil text-tinta-2">
                  {formatAngka(b.umurBulan)} bulan · ibu {b.ibu.nama}
                </span>
                <span>{b.status ? <Cap varian={b.status} /> : belumDiukur}</span>
              </span>
            )}
          />
        </div>
        {balita.data && balita.data.meta.total > 0 && !balita.isError && (
          <Pagination
            page={filter.page}
            pageSize={filter.pageSize}
            total={balita.data.meta.total}
            onPage={(page) => onUbahFilter({ page })}
            onPageSize={(pageSize) => onUbahFilter({ pageSize, page: 1 })}
          />
        )}
      </section>
      <LaciBalita balita={terpilih} posyandu={daftarPosyandu} onTutup={() => setTerpilih(null)} />
    </div>
  )
}
