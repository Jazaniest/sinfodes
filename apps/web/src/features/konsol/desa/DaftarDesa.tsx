import { Plus } from '@phosphor-icons/react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { opsiDaftarDesaKonsol } from '@/api/konsol'
import { DOMAIN_INDUK, keAlamat } from '@/app/alamat'
import { formatAngka } from '@/domain/format/angka'
import { formatWaktuRelatif } from '@/domain/format/tanggal'
import { PAKET, type BarisDesaKonsol, type FilterDesaKonsol } from '@/domain/konsol/schema'
import { STATUS_DESA } from '@/domain/wilayah/schema'
import { DataTable, type KolomTabel } from '@/ui/data/DataTable'
import { Select } from '@/ui/isian/Select'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { TautanTombol } from '@/ui/tombol/TautanTombol'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'

type Props = {
  filter: FilterDesaKonsol
  onUbahFilter: (ubah: Partial<FilterDesaKonsol>) => void
  onBukaDesa: (id: string) => void
  sekarang?: Date
}

const SEMUA = 'semua'
const redup = 'text-tinta-2'

function kolomDesa(sekarang: Date): KolomTabel<BarisDesaKonsol>[] {
  return [
    {
      id: 'desa',
      judul: 'Desa',
      wajib: true,
      isi: (d) => (
        <span className="flex flex-col">
          <span className="font-medium">{d.nama}</span>
          <span className="font-mono text-teks-kecil text-tinta-2">{d.kodeDesa}</span>
        </span>
      ),
    },
    {
      id: 'alamat',
      judul: 'Alamat',
      // Tautan ke website desa; kliknya tidak ikut membuka detail desa dari baris tabel.
      isi: (d) => (
        <a
          href={keAlamat({ jenis: 'desa', label: d.slug })}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="font-mono text-teks-kecil text-biru underline underline-offset-2"
        >
          {`${d.slug}.${DOMAIN_INDUK}`}
        </a>
      ),
    },
    { id: 'wilayah', judul: 'Kecamatan · Kabupaten', isi: (d) => `${d.kecamatan.nama} · ${d.kabupaten.nama}` },
    { id: 'status', judul: 'Status', isi: (d) => d.status },
    { id: 'paket', judul: 'Paket', isi: (d) => d.paket },
    { id: 'pengguna', judul: 'Pengguna aktif', rataKanan: true, isi: (d) => <span className="tabular-nums">{formatAngka(d.penggunaAktif)}</span> },
    {
      id: 'aktivitas',
      judul: 'Aktivitas terakhir',
      isi: (d) => (d.aktivitasTerakhir ? formatWaktuRelatif(d.aktivitasTerakhir, sekarang) : <span className={redup}>Belum ada</span>),
    },
  ]
}

const unik = (daftar: readonly { kode: string; nama: string }[]) =>
  [...new Map(daftar.map((w) => [w.kode, w])).values()].sort((a, b) => a.nama.localeCompare(b.nama, 'id'))

/** Daftar desa pelanggan (SPEC §11): filter provinsi, kabupaten, status, dan paket disimpan di alamat halaman. */
export function DaftarDesa({ filter, onUbahFilter, onBukaDesa, sekarang = new Date() }: Props) {
  const daftar = useQuery({ ...opsiDaftarDesaKonsol(filter), placeholderData: keepPreviousData })
  const semua = useQuery(opsiDaftarDesaKonsol({}))
  const provinsi = unik((semua.data ?? []).map((d) => d.provinsi))
  const kabupaten = unik((semua.data ?? []).filter((d) => !filter.provinsi || d.provinsi.kode === filter.provinsi).map((d) => d.kabupaten))
  const adaFilter = Object.values(filter).some((v) => v !== undefined)
  const pilih = (id: string | null) => (id === null || id === SEMUA ? undefined : id)

  return (
    <div>
      <PageHeader
        judul="Desa"
        meta={semua.data && `${formatAngka(semua.data.length)} desa pelanggan`}
        aksi={
          <TautanTombol href="/konsol/desa/baru" varian="utama" ikon={<Plus aria-hidden size={16} />}>
            Tambah desa
          </TautanTombol>
        }
      />
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 py-4">
        <Select
          label="Provinsi"
          className="w-48"
          pilihan={[{ id: SEMUA, label: 'Semua provinsi' }, ...provinsi.map((p) => ({ id: p.kode, label: p.nama }))]}
          nilai={filter.provinsi ?? SEMUA}
          onUbah={(id) => onUbahFilter({ provinsi: pilih(id), kabupaten: undefined })}
        />
        <Select
          label="Kabupaten"
          className="w-56"
          pilihan={[{ id: SEMUA, label: 'Semua kabupaten' }, ...kabupaten.map((k) => ({ id: k.kode, label: k.nama }))]}
          nilai={filter.kabupaten ?? SEMUA}
          onUbah={(id) => onUbahFilter({ kabupaten: pilih(id) })}
        />
        <Select
          label="Status"
          className="w-40"
          pilihan={[{ id: SEMUA, label: 'Semua status' }, ...STATUS_DESA.map((s) => ({ id: s, label: s }))]}
          nilai={filter.status ?? SEMUA}
          onUbah={(id) => onUbahFilter({ status: STATUS_DESA.find((s) => s === id) })}
        />
        <Select
          label="Paket"
          className="w-36"
          pilihan={[{ id: SEMUA, label: 'Semua paket' }, ...PAKET.map((p) => ({ id: p, label: p }))]}
          nilai={filter.paket ?? SEMUA}
          onUbah={(id) => onUbahFilter({ paket: PAKET.find((p) => p === id) })}
        />
      </div>
      <div aria-busy={daftar.isPlaceholderData} className={daftar.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
        <DataTable
          label="Daftar desa"
          kolom={kolomDesa(sekarang)}
          kolomUtama="desa"
          baris={daftar.data}
          memuat={daftar.isPending}
          galat={daftar.isError ? pesanGalat(daftar.error) : null}
          onCobaLagi={() => void daftar.refetch()}
          onBukaBaris={(d) => onBukaDesa(d.id)}
          kosong={
            <EmptyState
              judul="Tidak ada desa yang cocok"
              keterangan="Tidak ada desa pelanggan dengan filter ini."
              aksi={
                adaFilter && (
                  <Tombol onPress={() => onUbahFilter({ provinsi: undefined, kabupaten: undefined, status: undefined, paket: undefined })}>
                    Hapus filter
                  </Tombol>
                )
              }
            />
          }
          barisRingkas={(d) => (
            <span className="flex flex-col gap-1">
              <span className="font-medium">{d.nama}</span>
              <span className="text-teks-kecil text-tinta-2">
                {d.kecamatan.nama} · {d.status} · {d.paket}
              </span>
            </span>
          )}
        />
      </div>
    </div>
  )
}
