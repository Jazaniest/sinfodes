import { PenNib, Plus } from '@phosphor-icons/react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { pesanGalat } from '@/api/galat'
import { cariPermohonan, daftarPermohonan, kunciSurat, opsiJenisSurat, opsiJumlahPermohonan } from '@/api/surat'
import { formatAngka } from '@/domain/format/angka'
import { formatWaktuRelatif } from '@/domain/format/tanggal'
import { kataCukup } from '@/domain/penduduk/cari'
import { boleh } from '@/domain/pengguna/hak-akses'
import {
  LABEL_KANAL, LABEL_PERIODE, LABEL_STATUS, PERIODE_PERMOHONAN, STATUS_PERMOHONAN, STATUS_TERBUKA,
  type BarisPermohonan, type FilterPermohonan, type StatusPermohonan,
} from '@/domain/surat/permohonan'
import { lamaMenunggu, type NadaTunggu } from '@/domain/surat/waktu'
import { DataTable, type KolomTabel } from '@/ui/data/DataTable'
import { Pagination } from '@/ui/data/Pagination'
import { Nik } from '@/ui/domain/Nik'
import { useTunda } from '@/ui/hooks/useTunda'
import { SearchField } from '@/ui/isian/SearchField'
import { Select } from '@/ui/isian/Select'
import { TabNav } from '@/ui/navigasi/TabNav'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { TautanTombol } from '@/ui/tombol/TautanTombol'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { Skeleton } from '@/ui/umpan-balik/Skeleton'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { CapPermohonan } from './CapPermohonan'
import { hrefPermohonan } from './filter-url'
import { TabSurat } from './TabSurat'

type Props = {
  filter: FilterPermohonan
  onUbahFilter: (ubah: Partial<FilterPermohonan>) => void
  onBuka: (id: string) => void
  sekarang?: Date
}

const SEMUA = 'semua'
/** Lama menunggu: warna hanya penegas, jumlah harinya tetap tertulis (SPEC §4.4). */
const WARNA_TUNGGU: Readonly<Record<NadaTunggu, string>> = {
  biasa: 'text-tinta-2',
  oker: 'font-medium text-oker',
  merah: 'font-medium text-merah',
}
const KOSONG_TERBUKA: Partial<Record<StatusPermohonan, { judul: string; keterangan: string }>> = {
  menunggu: { judul: 'Tidak ada permohonan yang menunggu', keterangan: 'Permohonan dari layanan warga masuk ke sini.' },
  diproses: { judul: 'Tidak ada permohonan yang sedang diproses', keterangan: 'Permohonan yang mulai dikerjakan tampil di sini.' },
  'perlu-ttd': { judul: 'Tidak ada surat yang menunggu paraf atau tanda tangan', keterangan: 'Surat yang diajukan untuk ditandatangani tampil di sini.' },
}
const noUrut = (n: number) => String(n).padStart(3, '0')

/** Permohonan surat (SPEC §7.4 layar 1). Status, periode, dan jenis di URL; kata cari hanya di memori dan dikirim lewat POST. */
export function DaftarPermohonan({ filter, onUbahFilter, onBuka, sekarang }: Props) {
  const { pengguna } = useSesiAdmin()
  const hariIni = useMemo(() => sekarang ?? new Date(), [sekarang])
  const [kata, setKata] = useState('')
  const kataTunda = useTunda(kata.trim(), 300)
  const cariAktif = kataTunda !== '' && (kataTunda.includes('/') || kataCukup(kataTunda))
  const kodeJenis = filter.jenis ?? null
  const terbuka = STATUS_TERBUKA.includes(filter.status)

  const jenis = useQuery(opsiJenisSurat())
  const jumlah = useQuery(opsiJumlahPermohonan(filter.periode, kodeJenis))
  const daftar = useQuery({
    queryKey: cariAktif ? kunciSurat.cari(kataTunda, kodeJenis) : kunciSurat.daftar(filter),
    queryFn: ({ signal }) => (cariAktif ? cariPermohonan(kataTunda, kodeJenis, signal) : daftarPermohonan(filter, signal)),
    placeholderData: keepPreviousData,
  })
  const total = daftar.data?.meta.total ?? 0

  const kolom: KolomTabel<BarisPermohonan>[] = [
    { id: 'no', judul: 'No.', lebar: 'w-16', isi: (b) => <span className="font-mono text-tinta-2">{noUrut(b.noUrut)}</span> },
    {
      id: 'pemohon',
      judul: 'Pemohon',
      isi: (b) => (
        <span className="flex flex-col">
          <span className="font-medium">{b.pemohon.nama}</span>
          <Nik nik={b.pemohon.nik} className="text-teks-kecil text-tinta-2" />
        </span>
      ),
    },
    { id: 'jenis', judul: 'Jenis surat', isi: (b) => b.jenis.nama },
    { id: 'masuk', judul: 'Masuk', lebar: 'w-36', isi: (b) => `${formatWaktuRelatif(b.masukPada, hariIni)} · ${LABEL_KANAL[b.kanal]}` },
    {
      id: 'lama',
      judul: 'Lama menunggu',
      lebar: 'w-36',
      isi: (b) => {
        const lama = lamaMenunggu(b, hariIni)
        return <span className={WARNA_TUNGGU[lama.nada]}>{lama.teks}</span>
      },
    },
    { id: 'status', judul: 'Status', lebar: 'w-48', isi: (b) => <CapPermohonan p={b} /> },
  ]

  const kosongTerbuka = KOSONG_TERBUKA[filter.status]
  const kosong = cariAktif ? (
    <EmptyState
      judul={`Tidak ada permohonan yang cocok dengan “${kataTunda}”`}
      keterangan="Cari dengan nama pemohon, minimal 4 angka NIK, atau nomor surat lengkap dengan garis miringnya."
      aksi={<Tombol onPress={() => setKata('')}>Hapus pencarian</Tombol>}
    />
  ) : total > 0 ? (
    <EmptyState
      judul={`Halaman ${formatAngka(filter.page)} tidak ada`}
      aksi={<Tombol onPress={() => onUbahFilter({ page: 1 })}>Ke halaman pertama</Tombol>}
    />
  ) : filter.jenis ? (
    <EmptyState
      judul={`Tidak ada permohonan ${LABEL_STATUS[filter.status].toLowerCase()} untuk jenis surat ini`}
      aksi={<Tombol onPress={() => onUbahFilter({ jenis: undefined, page: 1 })}>Tampilkan semua jenis</Tombol>}
    />
  ) : kosongTerbuka ? (
    <EmptyState judul={kosongTerbuka.judul} keterangan={kosongTerbuka.keterangan} />
  ) : (
    <EmptyState
      judul={`Tidak ada permohonan ${LABEL_STATUS[filter.status].toLowerCase()} dalam ${LABEL_PERIODE[filter.periode]}`}
      aksi={
        filter.periode < 365 ? <Tombol onPress={() => onUbahFilter({ periode: 365, page: 1 })}>Tampilkan 12 bulan terakhir</Tombol> : undefined
      }
    />
  )

  const meta = jumlah.data ? (
    `${formatAngka(jumlah.data.status.menunggu)} menunggu · ${formatAngka(jumlah.data.status.diproses)} diproses · ${formatAngka(jumlah.data.status['perlu-ttd'])} perlu tanda tangan`
  ) : jumlah.isError ? null : (
    <Skeleton className="h-4 w-72 max-w-full" />
  )

  return (
    <div>
      <PageHeader
        jejak={[{ label: 'Layanan Surat' }]}
        judul="Permohonan"
        meta={meta}
        aksi={
          <>
            {boleh(pengguna.peran, 'surat.tandatangani') && (
              <TautanTombol href="/admin/surat/tanda-tangan" ikon={<PenNib aria-hidden size={16} />}>
                Tanda tangani
              </TautanTombol>
            )}
            {boleh(pengguna.peran, 'surat.proses') && (
              <TautanTombol varian="utama" href="/admin/surat/baru" ikon={<Plus aria-hidden size={16} />}>
                Buat surat
              </TautanTombol>
            )}
          </>
        }
        tab={<TabSurat aktif="permohonan" />}
      />
      <div className="border-b border-garis pt-4">
        <TabNav
          label="Status permohonan"
          items={STATUS_PERMOHONAN.map((s) => ({
            label: LABEL_STATUS[s],
            href: hrefPermohonan({ ...filter, status: s, page: 1 }),
            aktif: !cariAktif && filter.status === s,
            hitungan: jumlah.data ? { nilai: jumlah.data.status[s], label: 'permohonan' } : undefined,
          }))}
        />
      </div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 py-4">
        <SearchField
          label="Cari permohonan"
          placeholder="Nama, NIK, atau nomor surat"
          value={kata}
          onChange={(baru) => {
            setKata(baru)
            if (filter.page !== 1) onUbahFilter({ page: 1 })
          }}
          className="w-full sm:w-80"
        />
        <Select
          label="Jenis surat"
          pilihan={[{ id: SEMUA, label: 'Semua jenis' }, ...(jenis.data?.data ?? []).map((j) => ({ id: j.kode, label: j.nama }))]}
          nilai={filter.jenis ?? SEMUA}
          onUbah={(id) => onUbahFilter({ jenis: id && id !== SEMUA ? id : undefined, page: 1 })}
          className="w-full sm:w-72"
        />
        {!terbuka && !cariAktif && (
          <Select
            label="Periode"
            pilihan={PERIODE_PERMOHONAN.map((p) => ({ id: String(p), label: LABEL_PERIODE[p] }))}
            nilai={String(filter.periode)}
            onUbah={(id) => {
              const periode = PERIODE_PERMOHONAN.find((p) => String(p) === id)
              if (periode) onUbahFilter({ periode, page: 1 })
            }}
            className="w-full sm:w-52"
          />
        )}
      </div>
      {cariAktif && <p className="pb-3 text-tinta-2">Hasil pencarian di semua status, terbaru dulu.</p>}
      <div aria-busy={daftar.isPlaceholderData} className={daftar.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
        <DataTable
          label="Daftar permohonan surat"
          kolom={kolom}
          kolomUtama="pemohon"
          baris={daftar.data?.data}
          memuat={daftar.isPending}
          galat={daftar.isError ? pesanGalat(daftar.error) : null}
          onCobaLagi={() => void daftar.refetch()}
          kosong={kosong}
          onBukaBaris={(b) => onBuka(b.id)}
          barisRingkas={(b) => (
            <span className="flex flex-col gap-1">
              <span className="font-medium">{b.pemohon.nama}</span>
              <span className="text-teks-kecil text-tinta-2">
                {b.jenis.nama} · {formatWaktuRelatif(b.masukPada, hariIni)}
              </span>
              <CapPermohonan p={b} />
            </span>
          )}
        />
      </div>
      {!cariAktif && daftar.data && total > 0 && !daftar.isError && (
        <Pagination
          page={filter.page}
          pageSize={filter.pageSize}
          total={total}
          onPage={(page) => onUbahFilter({ page })}
          onPageSize={(pageSize) => onUbahFilter({ pageSize, page: 1 })}
        />
      )}
    </div>
  )
}
