import { useQuery } from '@tanstack/react-query'
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { opsiAlamat } from '@/api/alamat'
import { GalatApi, pesanGalat } from '@/api/galat'
import { keAlamat } from '@/app/alamat'
import { Tautan } from '@/ui/navigasi/Tautan'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'

/**
 * Website desa gagal dibuka (fokus review 4): desa Persiapan mendapat halaman "sedang disiapkan" tanpa data (SPEC-V0.2 §4.1),
 * alamat lain yang tidak dikenal mendapat jalan ke Cari desa, dan koneksi gagal bisa dicoba lagi.
 */
export function GalatPublik({ error }: ErrorComponentProps) {
  const router = useRouter()
  const tidakDitemukan = error instanceof GalatApi && error.kode === 'NOT_FOUND'
  // Alamat biasanya sudah tersimpan sejak halaman dibuka; galat di sini berarti alamatnya tidak dikenal.
  const alamat = useQuery({ ...opsiAlamat(), enabled: tidakDitemukan })
  if (tidakDitemukan) {
    if (alamat.isPending) return <main aria-busy className="skala-publik mx-auto max-w-xl px-4 py-16" />
    const desa = alamat.data?.jenis === 'desa' ? alamat.data.desa : null
    if (desa?.status === 'Persiapan') {
      return (
        <main className="skala-publik mx-auto max-w-xl px-4 py-16">
          <p className="text-label font-medium text-tinta-2 uppercase">
            Kecamatan {desa.kecamatan} · Kabupaten {desa.kabupaten}
          </p>
          <h1 className="mt-1 font-serif text-judul-halaman font-medium">Website Desa {desa.nama} sedang disiapkan</h1>
          <p className="mt-2 text-tinta-2">Desa sedang menyiapkan data dan tampilan websitenya. Silakan kembali lagi nanti.</p>
        </main>
      )
    }
    return (
      <main className="skala-publik mx-auto max-w-xl px-4 py-16">
        <p className="text-label font-medium text-tinta-2 uppercase">Galat 404</p>
        <h1 className="mt-1 font-serif text-judul-halaman font-medium">Website desa tidak ditemukan</h1>
        <p className="mt-2 text-tinta-2">Alamatnya mungkin salah, atau website desa ini belum dibuka untuk umum.</p>
        <p className="mt-6">
          <Tautan href={keAlamat({ jenis: 'induk' }, '/#cari-desa')}>Cari desa di halaman utama Sinfodes</Tautan>
        </p>
      </main>
    )
  }
  return (
    <main className="skala-publik mx-auto max-w-xl px-4 py-12">
      <ErrorState judul="Website desa belum bisa dibuka" pesan={pesanGalat(error)} onCobaLagi={() => void router.invalidate()} />
    </main>
  )
}
