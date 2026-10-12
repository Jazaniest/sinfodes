import { DownloadSimple, Printer } from '@phosphor-icons/react'
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { ambilIsiBuku, opsiIsiBuku, type HalamanBuku } from '@/api/buku'
import { GalatApi, pesanGalat } from '@/api/galat'
import { UKURAN_SEMUA_BARIS, type IsiBuku as DataIsiBuku } from '@/domain/buku/schema'
import { formatAngka } from '@/domain/format/angka'
import { keCsv } from '@/domain/format/csv'
import { formatWaktuLog, tanggalIsoWib } from '@/domain/format/tanggal'
import { DataTable, type KolomTabel } from '@/ui/data/DataTable'
import { Pagination } from '@/ui/data/Pagination'
import type { UkuranHalaman } from '@/ui/data/ukuran-halaman'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { unduhBerkas } from '@/ui/unduh'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { LembarBuku } from './LembarBuku'

type Baris = { id: string; sel: string[] }
type Tujuan = 'unduh' | 'cetak'
/** Perubahan halaman dari tombol halaman; ukuran halaman hanya 25, 50, atau 100 seperti di URL. */
type UbahHalaman = { page?: number; pageSize?: UkuranHalaman }
type Props = { kode: string; halaman: HalamanBuku; onUbahHalaman: (ubah: UbahHalaman) => void; sekarang?: Date }

const JEJAK = [{ label: 'Tata kelola' }, { label: 'Buku Administrasi', href: '/admin/buku' }]

/** Isi satu buku administrasi (SPEC §8): tabel per halaman, Unduh CSV, dan Cetak semua baris. */
export function IsiBuku({ kode, halaman, onUbahHalaman, sekarang }: Props) {
  const kueri = useQuery({ ...opsiIsiBuku(kode, halaman), placeholderData: keepPreviousData })
  const [cetak, setCetak] = useState<DataIsiBuku | null>(null)
  const [tujuan, setTujuan] = useState<Tujuan | null>(null)
  const mengambil = useRef(false)
  const hariIni = tanggalIsoWib(sekarang ?? new Date())
  // Unduh dan Cetak mengambil semua baris sekaligus, bukan hanya halaman yang tampil.
  const semua = useMutation<DataIsiBuku, Error, Tujuan>({
    mutationFn: () => ambilIsiBuku(kode, { page: 1, pageSize: UKURAN_SEMUA_BARIS }),
    onMutate: (t) => setTujuan(t),
    onSuccess: (isi, t) => {
      if (t === 'unduh') unduhBerkas(`buku-${kode}-${hariIni}.csv`, keCsv([isi.kolom, ...isi.baris]))
      else setCetak(isi)
    },
    onError: (e) => tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' }),
    onSettled: () => {
      mengambil.current = false
      setTujuan(null)
    },
  })
  const ambilSemua = (t: Tujuan) => {
    if (mengambil.current) return
    mengambil.current = true
    semua.mutate(t)
  }

  if (kueri.isPending) return <BarisKerangka jumlah={8} label="Memuat buku…" />
  if (kueri.isError) {
    const e = kueri.error
    if (e instanceof GalatApi && (e.kode === 'NOT_FOUND' || e.kode === 'FORBIDDEN')) {
      return (
        <EmptyState
          judul={e.kode === 'FORBIDDEN' ? 'Buku ini tidak bisa dibuka' : 'Buku tidak tersedia'}
          keterangan={e.message}
          aksi={<Tautan href="/admin/buku">Kembali ke Buku Administrasi</Tautan>}
        />
      )
    }
    return <ErrorState pesan={pesanGalat(e)} onCobaLagi={() => void kueri.refetch()} />
  }

  const isi = kueri.data
  const kolom: KolomTabel<Baris>[] = isi.kolom.map((judul, i) => ({
    id: `k${i}`,
    judul,
    isi: (b) => b.sel[i],
    rataKanan: judul.includes('(Rp)'),
    wajib: i <= 1,
  }))
  const awal = (isi.meta.page - 1) * isi.meta.pageSize
  const baris: Baris[] = isi.baris.map((sel, i) => ({ id: String(awal + i), sel }))
  const meta = [
    isi.buku.sumber ? `Terisi otomatis dari ${isi.buku.sumber}` : 'Diisi manual',
    `${formatAngka(isi.meta.total)} baris`,
    isi.buku.diperbarui && `diperbarui ${formatWaktuLog(isi.buku.diperbarui)}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div>
      <PageHeader
        jejak={JEJAK}
        judul={isi.buku.nama}
        meta={meta}
        aksi={
          <>
            <Tombol ikon={<DownloadSimple aria-hidden size={16} />} memuat={tujuan === 'unduh'} onPress={() => ambilSemua('unduh')}>
              Unduh CSV
            </Tombol>
            <Tombol ikon={<Printer aria-hidden size={16} />} memuat={tujuan === 'cetak'} onPress={() => ambilSemua('cetak')}>
              Cetak
            </Tombol>
          </>
        }
      />
      <div className="pt-6">
        <DataTable
          label={isi.buku.nama}
          kolom={kolom}
          kolomUtama="k1"
          baris={baris}
          memuat={false}
          galat={null}
          kosong={<EmptyState judul="Buku ini belum berisi data" />}
          barisRingkas={(b) => (
            <span className="flex flex-col gap-1">
              <span className="font-medium">{b.sel[1]}</span>
              <span className="text-teks-kecil text-tinta-2">{b.sel.slice(2, 5).filter(Boolean).join(' · ')}</span>
            </span>
          )}
        />
        <Pagination
          page={isi.meta.page}
          pageSize={isi.meta.pageSize}
          total={isi.meta.total}
          onPage={(page) => onUbahHalaman({ page })}
          onPageSize={(pageSize) => onUbahHalaman({ pageSize, page: 1 })}
        />
      </div>
      {cetak && <LembarBuku isi={cetak} hariIni={hariIni} onSelesai={() => setCetak(null)} />}
    </div>
  )
}
