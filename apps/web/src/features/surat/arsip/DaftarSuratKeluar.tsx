import { DownloadSimple } from '@phosphor-icons/react'
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { opsiSuratKeluar, semuaSuratKeluar } from '@/api/arsip'
import { pesanGalat } from '@/api/galat'
import { opsiJenisSurat } from '@/api/surat'
import { formatAngka } from '@/domain/format/angka'
import { keCsv } from '@/domain/format/csv'
import { daftarBulanTerakhir, formatBulan, formatTanggal } from '@/domain/format/tanggal'
import { barisCsvBukuAgenda, labelPenandatangan, type BarisSuratKeluar, type FilterSuratKeluar } from '@/domain/surat/arsip'
import { LABEL_KANAL } from '@/domain/surat/permohonan'
import { Cap } from '@/ui/cap/Cap'
import { DataTable, type KolomTabel } from '@/ui/data/DataTable'
import { Pagination } from '@/ui/data/Pagination'
import { Select } from '@/ui/isian/Select'
import { MenuAksi } from '@/ui/lapisan/Menu'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { Skeleton } from '@/ui/umpan-balik/Skeleton'
import { unduhBerkas } from '@/ui/unduh'
import { TabSurat } from '../TabSurat'
import { LembarBukuAgenda } from './LembarBukuAgenda'
import { TabArsip } from './TabArsip'

type Props = {
  filter: FilterSuratKeluar
  onUbahFilter: (ubah: Partial<FilterSuratKeluar>) => void
  onBuka: (id: string) => void
  sekarang?: Date
}

const SEMUA = 'semua'
const PILIHAN_PENANDATANGAN = [
  { id: SEMUA, label: 'Semua penanda tangan' },
  { id: 'kades', label: 'Kepala Desa' },
  { id: 'sekdes', label: 'Sekretaris Desa (a.n.)' },
]

/** Arsip surat keluar (SPEC §7.4 layar 5): surat yang pernah terbit per bulan, urut nomor seperti Buku Agenda. */
export function DaftarSuratKeluar({ filter, onUbahFilter, onBuka, sekarang }: Props) {
  const hariIni = useMemo(() => sekarang ?? new Date(), [sekarang])
  const bulanPilihan = useMemo(() => daftarBulanTerakhir(hariIni, 12), [hariIni])
  const bulan = filter.bulan ?? bulanPilihan[0]
  const daftar = useQuery({ ...opsiSuratKeluar({ ...filter, bulan }), placeholderData: keepPreviousData })
  const jenis = useQuery(opsiJenisSurat())
  const total = daftar.data?.meta.total
  const adaFilter = filter.jenis !== undefined || filter.penandatangan !== undefined
  const [lembar, setLembar] = useState<readonly BarisSuratKeluar[] | null>(null)
  // Buku Agenda memuat semua baris sesuai filter, bukan hanya halaman yang tampil.
  const bahan = useMutation<readonly BarisSuratKeluar[], Error, 'csv' | 'cetak'>({
    mutationFn: () => semuaSuratKeluar({ bulan, jenis: filter.jenis, penandatangan: filter.penandatangan }),
    onSuccess: (baris, untuk) => {
      if (untuk === 'cetak') setLembar(baris)
      else unduhBerkas(`buku-agenda-surat-keluar-${bulan}.csv`, keCsv(barisCsvBukuAgenda(baris)))
    },
    onError: (galat) => tampilkanToast({ pesan: pesanGalat(galat), nada: 'galat' }),
  })
  const tanpaIsi = !total || bahan.isPending

  const kolom = useMemo(
    (): KolomTabel<BarisSuratKeluar>[] => [
      { id: 'nomor', judul: 'Nomor', wajib: true, isi: (b) => <span className="font-mono whitespace-nowrap">{b.nomor}</span> },
      { id: 'tanggal', judul: 'Tanggal', isi: (b) => <span className="whitespace-nowrap">{formatTanggal(b.tanggal, 'pendek')}</span> },
      { id: 'jenis', judul: 'Jenis surat', isi: (b) => b.jenis.nama },
      { id: 'untuk', judul: 'Untuk', isi: (b) => <span className="font-medium">{b.untuk}</span> },
      { id: 'penandatangan', judul: 'Penanda tangan', isi: (b) => labelPenandatangan(b.penandatangan) },
      { id: 'kanal', judul: 'Kanal', isi: (b) => LABEL_KANAL[b.kanal] },
      { id: 'status', judul: 'Status', isi: (b) => <Cap varian={b.status} /> },
    ],
    [],
  )

  const hapusFilter = () => onUbahFilter({ jenis: undefined, penandatangan: undefined, page: 1 })
  const kosong = adaFilter ? (
    <EmptyState
      judul="Tidak ada surat keluar yang cocok dengan filter ini"
      keterangan={`Bulan ${formatBulan(bulan)}.`}
      aksi={<Tombol onPress={hapusFilter}>Hapus filter</Tombol>}
    />
  ) : (total ?? 0) > 0 ? (
    <EmptyState judul={`Halaman ${formatAngka(filter.page)} tidak ada`} aksi={<Tombol onPress={() => onUbahFilter({ page: 1 })}>Ke halaman pertama</Tombol>} />
  ) : (
    <EmptyState judul={`Belum ada surat keluar di ${formatBulan(bulan)}`} keterangan="Surat masuk ke arsip saat ditandatangani." />
  )
  const meta =
    total !== undefined ? `${formatBulan(bulan)} · ${formatAngka(total)} surat keluar` : daftar.isError ? null : <Skeleton className="h-4 w-56 max-w-full" />

  return (
    <div>
      <div className={lembar ? 'print:hidden' : undefined}>
        <PageHeader
          jejak={[{ label: 'Layanan Surat', href: '/admin/surat' }]}
          judul="Arsip surat"
          meta={meta}
          aksi={
            <MenuAksi
              pemicu={<Tombol ikon={<DownloadSimple aria-hidden size={16} />} memuat={bahan.isPending}>Unduh</Tombol>}
              placement="bottom end"
              items={[
                { id: 'csv', label: 'Unduh CSV', nonaktif: tanpaIsi, onAction: () => bahan.mutate('csv') },
                { id: 'cetak', label: 'Cetak Buku Agenda Surat Keluar', nonaktif: tanpaIsi, onAction: () => bahan.mutate('cetak') },
              ]}
            />
          }
          tab={<TabSurat aktif="arsip" />}
        />
        <div className="pt-4">
          <TabArsip aktif="keluar" />
        </div>
        <div className="flex flex-wrap items-end gap-3 py-4">
          <Select
            label="Bulan"
            pilihan={bulanPilihan.map((b) => ({ id: b, label: formatBulan(b) }))}
            nilai={bulan}
            // Bulan berjalan tidak ditulis di URL, supaya tautan arsip selalu membuka bulan terbaru.
            onUbah={(id) => onUbahFilter({ bulan: id && id !== bulanPilihan[0] ? id : undefined, page: 1 })}
            className="w-48"
          />
          <Select
            label="Jenis surat"
            pilihan={[{ id: SEMUA, label: 'Semua jenis' }, ...(jenis.data?.data ?? []).map((j) => ({ id: j.kode, label: j.nama }))]}
            nilai={filter.jenis ?? SEMUA}
            onUbah={(id) => onUbahFilter({ jenis: id && id !== SEMUA ? id : undefined, page: 1 })}
            className="w-72 max-w-full"
          />
          <Select
            label="Penanda tangan"
            pilihan={PILIHAN_PENANDATANGAN}
            nilai={filter.penandatangan ?? SEMUA}
            onUbah={(id) => onUbahFilter({ penandatangan: id === 'kades' || id === 'sekdes' ? id : undefined, page: 1 })}
            className="w-56"
          />
        </div>
        <div aria-busy={daftar.isPlaceholderData} className={daftar.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
          <DataTable
            label="Arsip surat keluar"
            kolom={kolom}
            kolomUtama="nomor"
            baris={daftar.data?.data}
            memuat={daftar.isPending}
            galat={daftar.isError ? pesanGalat(daftar.error) : null}
            onCobaLagi={() => void daftar.refetch()}
            kosong={kosong}
            onBukaBaris={(b) => onBuka(b.id)}
            barisRingkas={(b) => (
              <span className="flex flex-col gap-0.5">
                <span className="font-mono text-teks-kecil">{b.nomor}</span>
                <span className="font-medium">{b.untuk}</span>
                <span className="text-teks-kecil text-tinta-2">
                  {b.jenis.nama} · {formatTanggal(b.tanggal, 'pendek')}
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
      {lembar && <LembarBukuAgenda baris={lembar} bulan={bulan} hariIni={hariIni} onSelesai={() => setLembar(null)} />}
    </div>
  )
}
