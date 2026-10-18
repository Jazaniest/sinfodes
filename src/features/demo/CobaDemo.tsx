import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { keAlamat } from '@/app/alamat'
import type { TujuanAlamat } from '@/domain/alamat/alamat'
import { formatAngka } from '@/domain/format/angka'
import { formatTanggal } from '@/domain/format/tanggal'
import { LABEL_PERAN_KABUPATEN } from '@/domain/kabupaten/schema'
import { LABEL_PERAN_KONSOL } from '@/domain/konsol/schema'
import { LABEL_PERAN } from '@/domain/pengguna/schema'
import { kelasTombol } from '@/ui/tombol/gaya-tombol'
import { Tombol } from '@/ui/tombol/Tombol'
import { Skeleton } from '@/ui/umpan-balik/Skeleton'
import { tautanMasukCepat } from './masuk-cepat'
import { tautanSkenario, type TombolSkenario } from './skenario'
import { SkenarioDemo } from './SkenarioDemo'
import { useKendaliDemo } from './useKendaliDemo'

const SUNGAI_SIALANG: TujuanAlamat = { jenis: 'desa', label: 'sungaisialang' }
const KAB_PELALAWAN: TujuanAlamat = { jenis: 'kabupaten', label: 'kab-pelalawan' }

/**
 * Bagian Coba demo di halaman utama, hanya di build demo (SPEC §3.6, SPEC-V0.2 §4.4): akun demo per bagian aplikasi dan
 * skenario terpandu. Hanya menampilkan bagian yang sudah dibangun (tidak ada tombol mati).
 */
export function CobaDemo() {
  const kendali = useKendaliDemo()
  const info = useQuery({
    queryKey: ['demo', 'info'],
    queryFn: () => kendali!.infoDataDemo(),
    enabled: kendali !== null,
    // Akun yang baru dibuat di Konsol (Tambah desa, undangan Sekretaris Desa) langsung tampil saat halaman ini dibuka lagi.
    staleTime: 0,
  })
  const [sedangMasuk, setSedangMasuk] = useState<string | null>(null)
  /** Sesi terpisah per alamat: tombol membuka alamat tujuan, dan halaman di sana yang masuk (SPEC-V0.2 §4.6). */
  const buka = (tautan: string, kunci: string) => {
    setSedangMasuk(kunci)
    window.location.assign(tautan)
  }
  const jalankanSkenario = (t: TombolSkenario, kunci: string) => {
    if (!kendali) return
    buka(tautanSkenario(t, { admin: kendali.AKUN_DEMO_ADMIN, konsol: kendali.AKUN_DEMO_KONSOL }), kunci)
  }

  return (
    <section id="coba-demo" aria-labelledby="judul-coba-demo">
      <h2 id="judul-coba-demo" className="font-serif text-judul-halaman font-medium">
        Coba demo
      </h2>
      <p className="mt-2 max-w-2xl text-tinta-2">
        Masuk ke desa contoh dengan akun siap pakai, atau ikuti skenario terpandu. Data demo tersimpan di peramban ini saja.
      </p>

      <section className="mt-8" aria-labelledby="judul-desa-demo">
        <h3 id="judul-desa-demo" className="text-label font-medium text-tinta-2 uppercase">
          Desa demo
        </h3>
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
          Semua nama, NIK, dan angka di demo ini fiktif. Nomor urut NIK sengaja memakai rentang 8001-9999 agar tidak sama
          dengan NIK orang sungguhan.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="judul-akun-demo">
        <h3 id="judul-akun-demo" className="text-label font-medium text-tinta-2 uppercase">
          Akun demo
        </h3>
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
                  onPress={() => buka(tautanMasukCepat(SUNGAI_SIALANG, '/admin', a.id), a.id)}
                >
                  {a.nama} · {LABEL_PERAN[a.peran]}
                </Tombol>
              ))}
            </div>
            {info.data && info.data.desaBaru.length > 0 && (
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-teks-kecil text-tinta-2">
                Desa baru berstatus Persiapan:
                {info.data.desaBaru.map((a) => (
                  <Tombol
                    key={a.id}
                    ukuran="kecil"
                    varian="sekunder"
                    memuat={sedangMasuk === a.id}
                    onPress={() => buka(tautanMasukCepat({ jenis: 'desa', label: a.labelDesa }, '/admin', a.id), a.id)}
                  >
                    {`${a.nama} · ${a.jabatan} ${a.namaDesa}`}
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
                    onPress={() => buka(tautanMasukCepat(SUNGAI_SIALANG, '/warga', a.pendudukId), a.pendudukId)}
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
            <a
              href={keAlamat(SUNGAI_SIALANG)}
              className="inline-flex h-9 items-center rounded-1 bg-biru px-4 font-medium text-putih hover:bg-biru-tua"
            >
              Buka website
            </a>
          </li>
          <li className="flex flex-col gap-3 py-4">
            <div>
              <p className="font-medium">Konsol Sinfodes</p>
              <p className="text-tinta-2">
                Untuk Tim Sinfodes: langganan dan keaktifan semua desa pelanggan, serta kabupaten mitra, tanpa isi data desa.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {kendali?.AKUN_DEMO_KONSOL.map((a) => (
                <Tombol
                  key={a.id}
                  ukuran="kecil"
                  varian="utama"
                  memuat={sedangMasuk === a.id}
                  onPress={() => buka(tautanMasukCepat({ jenis: 'konsol' }, '/', a.id), a.id)}
                >
                  {a.nama} · {LABEL_PERAN_KONSOL[a.peran]}
                </Tombol>
              ))}
            </div>
          </li>
          <li className="flex flex-col gap-3 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="font-medium">Dasbor kabupaten</p>
                <p className="text-tinta-2">
                  Untuk pemerintah kabupaten mitra: adopsi dan angka layanan desa di wilayahnya sendiri, tanpa data pribadi warga.
                  Pelalawan tidak bisa melihat desa Siak, dan sebaliknya.
                </p>
              </div>
              <a href={keAlamat(KAB_PELALAWAN)} className={kelasTombol('sekunder', 'kecil')}>
                Buka portal Pelalawan
              </a>
            </div>
            {info.data ? (
              <div className="flex flex-wrap gap-2">
                {info.data.akunKabupaten.map((a) => (
                  <Tombol
                    key={a.id}
                    ukuran="kecil"
                    varian={a.peran === 'admin' ? 'utama' : 'sekunder'}
                    memuat={sedangMasuk === a.id}
                    onPress={() => buka(tautanMasukCepat({ jenis: 'kabupaten', label: a.label }, '/admin', a.id), a.id)}
                  >
                    {a.nama} · {LABEL_PERAN_KABUPATEN[a.peran]} · {a.namaKabupaten}
                  </Tombol>
                ))}
              </div>
            ) : (
              <Skeleton className="h-8 w-96 max-w-full" />
            )}
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

      <SkenarioDemo sedang={sedangMasuk} onJalankan={jalankanSkenario} />
    </section>
  )
}
