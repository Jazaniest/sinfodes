import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { pesanGalat } from '@/api/galat'
import logoMark from '@/assets/brand/sinfodes-mark.svg'
import { formatAngka } from '@/domain/format/angka'
import { formatTanggal } from '@/domain/format/tanggal'
import { LABEL_PERAN } from '@/domain/pengguna/schema'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { Skeleton } from '@/ui/umpan-balik/Skeleton'
import { masukDemo } from './masuk-demo'
import { useKendaliDemo } from './useKendaliDemo'

/** Halaman `/`: pintu masuk demo. Hanya menampilkan bagian yang sudah dibangun (tidak ada tombol mati). */
export function HalamanDemo() {
  const kendali = useKendaliDemo()
  const info = useQuery({
    queryKey: ['demo', 'info'],
    queryFn: () => kendali!.infoDataDemo(),
    enabled: kendali !== null,
  })
  const queryClient = useQueryClient()
  const router = useRouter()
  const [sedangMasuk, setSedangMasuk] = useState<string | null>(null)
  const masukPanel = async (akun: { id: string; email: string }) => {
    if (!kendali) return
    setSedangMasuk(akun.id)
    try {
      await masukDemo(akun.email, kendali.KATA_SANDI_DEMO, queryClient)
      await router.navigate({ to: '/admin' })
    } catch (e) {
      tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' })
    } finally {
      setSedangMasuk(null)
    }
  }

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
          <li className="flex flex-col gap-3 py-4">
            <div>
              <p className="font-medium">Panel admin desa</p>
              <p className="text-tinta-2">
                Masuk sebagai salah satu perangkat desa. Kata sandi semua akun: <span className="font-mono">demo</span>.
                {kendali && (
                  <>
                    {' '}
                    Passphrase tanda tangan elektronik (simulasi): <span className="font-mono">{kendali.PASSPHRASE_TTE_DEMO}</span>.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {kendali?.AKUN_DEMO_ADMIN.map((a) => (
                <Tombol
                  key={a.id}
                  ukuran="kecil"
                  varian={a.peran === 'operator' ? 'utama' : 'sekunder'}
                  memuat={sedangMasuk === a.id}
                  onPress={() => void masukPanel(a)}
                >
                  {a.nama} · {LABEL_PERAN[a.peran]}
                </Tombol>
              ))}
            </div>
          </li>
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
