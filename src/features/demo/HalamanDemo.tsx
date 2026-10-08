import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import logoMark from '@/assets/brand/sinfodes-mark.svg'
import { formatAngka } from '@/domain/format/angka'
import { formatTanggal } from '@/domain/format/tanggal'
import { Skeleton } from '@/ui/umpan-balik/Skeleton'
import { useKendaliDemo } from './useKendaliDemo'

/** Halaman `/`: pintu masuk demo. Hanya menampilkan bagian yang sudah dibangun (tidak ada tombol mati). */
export function HalamanDemo() {
  const kendali = useKendaliDemo()
  const info = useQuery({
    queryKey: ['demo', 'info'],
    queryFn: () => kendali!.infoDataDemo(),
    enabled: kendali !== null,
  })

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex items-center gap-4 border-b-[1.5px] border-tinta pb-5">
        <img src={logoMark} alt="" className="h-12 w-auto" />
        <div>
          <p className="text-label font-medium text-tinta-2 uppercase">Sinfodes · mode demo</p>
          <h1 className="font-serif text-judul-halaman font-medium">Sistem Informasi Desa</h1>
        </div>
      </header>

      <section className="mt-8" aria-labelledby="judul-desa-demo">
        <h2 id="judul-desa-demo" className="text-label font-medium text-tinta-2 uppercase">
          Desa demo
        </h2>
        <p className="mt-2 font-serif text-judul-bagian font-medium">Desa Sungai Sialang</p>
        <p className="text-tinta-2">Kecamatan Teluk Meranti · Kabupaten Pelalawan · Riau</p>
        {info.data ? (
          <p className="mt-3">
            {formatAngka(info.data.jiwa)} jiwa dalam {formatAngka(info.data.kk)} KK, tersebar di {info.data.dusun} dusun.
            Data dibangkitkan pada {formatTanggal(info.data.tanggalAcuan, 'hari')}.
          </p>
        ) : (
          <Skeleton className="mt-3 h-4 w-80 max-w-full" />
        )}
        <p className="mt-2 text-teks-kecil text-tinta-2">
          Semua nama, NIK, dan angka di demo ini fiktif. Nomor urut NIK sengaja memakai rentang 8001–9999 agar tidak sama
          dengan NIK orang sungguhan.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="judul-bagian-aplikasi">
        <h2 id="judul-bagian-aplikasi" className="text-label font-medium text-tinta-2 uppercase">
          Bagian aplikasi
        </h2>
        <ul className="mt-3 divide-y divide-garis border-y border-garis">
          <li className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="font-medium">Katalog Register</p>
              <p className="text-tinta-2">Token warna, huruf, dan komponen dasar yang dipakai semua bagian aplikasi.</p>
            </div>
            <Link
              to="/katalog"
              className="inline-flex h-9 items-center rounded-1 bg-biru px-4 font-medium text-putih hover:bg-biru-tua"
            >
              Buka katalog
            </Link>
          </li>
        </ul>
      </section>
    </main>
  )
}
