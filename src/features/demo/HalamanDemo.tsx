import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { pesanGalat } from '@/api/galat'
import { masukWarga } from '@/api/warga'
import logoMark from '@/assets/brand/sinfodes-mark.svg'
import { formatAngka } from '@/domain/format/angka'
import { formatTanggal } from '@/domain/format/tanggal'
import { LABEL_PERAN_KONSOL } from '@/domain/konsol/schema'
import { LABEL_PERAN } from '@/domain/pengguna/schema'
import { pasangSesiWarga } from '@/features/warga/masuk-warga'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { Skeleton } from '@/ui/umpan-balik/Skeleton'
import { masukDemo, masukKonsolDemo } from './masuk-demo'
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
  const masukLayananWarga = async (akun: { pendudukId: string; nik: string; pin: string }) => {
    setSedangMasuk(akun.pendudukId)
    try {
      const { token, sesi } = await masukWarga(akun.nik, akun.pin)
      pasangSesiWarga(token, sesi, queryClient)
      await router.navigate({ to: '/warga' })
    } catch (e) {
      tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' })
    } finally {
      setSedangMasuk(null)
    }
  }
  const masukKonsolSebagai = async (akun: { id: string; email: string }) => {
    if (!kendali) return
    setSedangMasuk(akun.id)
    try {
      await masukKonsolDemo(akun.email, kendali.KATA_SANDI_DEMO, queryClient)
      await router.navigate({ to: '/konsol' })
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
            {kendali && kendali.AKUN_DEMO_DESA_BARU.length > 0 && (
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-teks-kecil text-tinta-2">
                Desa baru berstatus Persiapan:
                {kendali.AKUN_DEMO_DESA_BARU.map((a) => (
                  <Tombol key={a.id} ukuran="kecil" varian="sekunder" memuat={sedangMasuk === a.id} onPress={() => void masukPanel(a)}>
                    {a.nama} · Operator Desa Tanjung Lamo
                  </Tombol>
                ))}
              </p>
            )}
          </li>
          <li className="flex flex-col gap-3 py-4">
            <div>
              <p className="font-medium">Layanan mandiri warga</p>
              <p className="text-tinta-2">Untuk HP: urus surat dan pantau perkembangannya. Masuk dengan NIK dan PIN 6 angka.</p>
            </div>
            <ul className="flex flex-col gap-3">
              {kendali?.AKUN_DEMO_WARGA.map((a) => (
                <li key={a.pendudukId} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <Tombol
                    ukuran="kecil"
                    varian="sekunder"
                    memuat={sedangMasuk === a.pendudukId}
                    onPress={() => void masukLayananWarga(a)}
                  >
                    {a.nama}
                  </Tombol>
                  <span className="text-teks-kecil text-tinta-2">
                    NIK <span className="font-mono">{a.nik}</span> · PIN <span className="font-mono">{a.pin}</span> · {a.keterangan}
                  </span>
                </li>
              ))}
            </ul>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="font-medium">Website desa</p>
              <p className="text-tinta-2">
                Untuk warga dan publik: kabar, profil, transparansi APBDes, statistik, potensi desa, layanan, dan cek keaslian surat lewat
                kode atau QR.
              </p>
            </div>
            <Link
              to="/desa/$slug"
              params={{ slug: 'sungai-sialang' }}
              className="inline-flex h-9 items-center rounded-1 bg-biru px-4 font-medium text-putih hover:bg-biru-tua"
            >
              Buka website
            </Link>
          </li>
          <li className="flex flex-col gap-3 py-4">
            <div>
              <p className="font-medium">Konsol Sinfodes</p>
              <p className="text-tinta-2">
                Untuk tim Sinfodes dan pemantau wilayah: keadaan semua desa pelanggan. Pemantau hanya melihat angka gabungan desa di
                wilayahnya.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {kendali?.AKUN_DEMO_KONSOL.map((a) => (
                <Tombol
                  key={a.id}
                  ukuran="kecil"
                  varian={a.peran === 'tim' ? 'utama' : 'sekunder'}
                  memuat={sedangMasuk === a.id}
                  onPress={() => void masukKonsolSebagai(a)}
                >
                  {a.nama} · {a.wilayah ? 'Pemantau wilayah' : LABEL_PERAN_KONSOL[a.peran]}
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
