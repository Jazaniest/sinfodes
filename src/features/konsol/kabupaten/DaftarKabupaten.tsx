import { Plus } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { opsiDaftarKabupatenKonsol } from '@/api/konsol'
import { DOMAIN_INDUK, keAlamat } from '@/app/alamat'
import { formatAngka } from '@/domain/format/angka'
import { formatTanggal } from '@/domain/format/tanggal'
import type { BarisKabupatenKonsol } from '@/domain/konsol/kabupaten'
import { DataTable, type KolomTabel } from '@/ui/data/DataTable'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { TautanTombol } from '@/ui/tombol/TautanTombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'

/** Tautan portal di dalam baris tabel; kliknya tidak ikut membuka detail dari baris. */
function TautanPortal({ label }: { label: string }) {
  return (
    <a
      href={keAlamat({ jenis: 'kabupaten', label })}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="font-mono text-teks-kecil whitespace-nowrap text-biru underline underline-offset-2"
    >
      {`${label}.${DOMAIN_INDUK}`}
    </a>
  )
}

/** Baris tabel butuh `id`; kode wilayah kabupaten unik. */
type Baris = BarisKabupatenKonsol & { id: string }

const KOLOM: KolomTabel<Baris>[] = [
  {
    id: 'kabupaten',
    judul: 'Kabupaten',
    wajib: true,
    isi: (k) => (
      <span className="flex flex-col">
        <span className="font-medium">{k.nama}</span>
        <span className="font-mono text-teks-kecil text-tinta-2">{k.kode}</span>
      </span>
    ),
  },
  { id: 'portal', judul: 'Portal', isi: (k) => <TautanPortal label={k.label} /> },
  {
    id: 'admin',
    judul: 'Admin',
    isi: (k) =>
      k.admin ? (
        <span className="flex flex-col">
          <span>{k.admin.nama}</span>
          <span className="text-teks-kecil text-tinta-2">{k.admin.email}</span>
        </span>
      ) : (
        <span className="text-merah">Tidak ada Admin aktif</span>
      ),
  },
  { id: 'desa', judul: 'Desa bergabung', rataKanan: true, isi: (k) => <span className="tabular-nums">{formatAngka(k.desaBergabung)}</span> },
  { id: 'bergabung', judul: 'Mitra sejak', isi: (k) => formatTanggal(k.bergabung, 'pendek') },
]

/** Konsol › Kabupaten (SPEC-V0.2 §7): kabupaten mitra beserta Admin dan jumlah desanya yang bergabung. */
export function DaftarKabupaten({ onBuka }: { onBuka: (kode: string) => void }) {
  const kueri = useQuery(opsiDaftarKabupatenKonsol())
  return (
    <div>
      <PageHeader
        judul="Kabupaten"
        meta={kueri.data && `${formatAngka(kueri.data.length)} kabupaten mitra`}
        aksi={
          <TautanTombol href="/konsol/kabupaten/baru" varian="utama" ikon={<Plus aria-hidden size={16} />}>
            Tambah kabupaten
          </TautanTombol>
        }
      />
      <p className="max-w-2xl py-4 text-tinta-2">
        Kabupaten mitra mendapat portal desa digital dan dasbor kabupaten. Kabupaten tidak membayar; yang berlangganan adalah desanya.
      </p>
      <DataTable
        label="Kabupaten mitra"
        kolom={KOLOM}
        kolomUtama="kabupaten"
        baris={kueri.data?.map((k): Baris => ({ ...k, id: k.kode }))}
        memuat={kueri.isPending}
        galat={kueri.isError ? pesanGalat(kueri.error) : null}
        onCobaLagi={() => void kueri.refetch()}
        onBukaBaris={(k) => onBuka(k.kode)}
        kosong={<EmptyState judul="Belum ada kabupaten mitra" keterangan="Tambahkan kabupaten setelah surat penunjukannya diterima." />}
        barisRingkas={(k) => (
          <span className="flex flex-col gap-1">
            <span className="font-medium">{k.nama}</span>
            <span className="text-teks-kecil text-tinta-2">
              {formatAngka(k.desaBergabung)} desa bergabung · {k.admin?.nama ?? 'Tidak ada Admin aktif'}
            </span>
          </span>
        )}
      />
    </div>
  )
}
