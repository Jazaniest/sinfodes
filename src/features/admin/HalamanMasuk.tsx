import { useState } from 'react'
import logoMark from '@/assets/brand/sinfodes-mark.svg'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kenali, masuk } from '@/api/sesi'
import { LambangDesa } from '@/ui/domain/LambangDesa'
import { TextField } from '@/ui/isian/TextField'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'

type DesaDikenal = { nama: string; kecamatan: string; kabupaten: string }
type Galat = { email?: string; sandi?: string; umum?: string }
type Props = { onBerhasil: (token: string) => void; modeDemo?: boolean }

/** Halaman masuk panel desa (SPEC §5.6): email dulu → desa tampil → kata sandi. */
export function HalamanMasuk({ onBerhasil, modeDemo = false }: Props) {
  const [langkah, setLangkah] = useState<'email' | 'sandi' | 'lupa'>('email')
  const [email, setEmail] = useState('')
  const [sandi, setSandi] = useState('')
  const [desa, setDesa] = useState<DesaDikenal | null>(null)
  const [galat, setGalat] = useState<Galat>({})
  const [memuat, setMemuat] = useState(false)

  const lanjut = async () => {
    if (!email.trim()) {
      setGalat({ email: 'Email atau nama pengguna wajib diisi.' })
      return
    }
    setMemuat(true)
    setGalat({})
    try {
      setDesa((await kenali(email)).desa)
      setLangkah('sandi')
    } catch (e) {
      setGalat({ umum: pesanGalat(e) })
    } finally {
      setMemuat(false)
    }
  }
  const kirim = async () => {
    if (!sandi) {
      setGalat({ sandi: 'Kata sandi wajib diisi.' })
      return
    }
    setMemuat(true)
    setGalat({})
    try {
      onBerhasil((await masuk(email, sandi)).token)
    } catch (e) {
      setGalat(e instanceof GalatApi && e.fields.kataSandi ? { sandi: e.fields.kataSandi } : { umum: pesanGalat(e) })
    } finally {
      setMemuat(false)
    }
  }
  const gantiAkun = () => {
    setLangkah('email')
    setSandi('')
    setDesa(null)
    setGalat({})
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2 border border-garis bg-lembar p-6 sm:p-8">
        <img src={logoMark} alt="Sinfodes" className="h-9 w-auto" />
        <h1 className="mt-4 font-serif text-judul-halaman font-medium">Masuk panel desa</h1>
        {langkah === 'lupa' ? (
          <div className="mt-5 flex flex-col gap-3">
            <p>
              Kata sandi diatur ulang oleh Sekretaris Desa, sebagai pengelola pengguna di desa Anda. Hubungi beliau untuk
              mendapatkan kata sandi sementara, lalu masuk lagi.
            </p>
            <p className="text-teks-kecil text-tinta-2">
              Kalau Sekretaris Desa juga tidak bisa masuk, hubungi tim dukungan Sinfodes melalui kantor kecamatan.
            </p>
            <Tombol onPress={() => setLangkah('email')}>Kembali ke halaman masuk</Tombol>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              void (langkah === 'email' ? lanjut() : kirim())
            }}
            className="mt-5 flex flex-col gap-4"
          >
            {galat.umum && <Banner nada="galat">{galat.umum}</Banner>}
            {langkah === 'sandi' && desa && (
              <div className="flex items-center gap-3 rounded-1 bg-kertas px-3 py-2">
                <LambangDesa nama={desa.nama} />
                <div>
                  <p className="font-medium">Desa {desa.nama}</p>
                  <p className="text-teks-kecil text-tinta-2">
                    {desa.kecamatan} · {desa.kabupaten}
                  </p>
                </div>
              </div>
            )}
            <TextField
              label="Email atau nama pengguna"
              value={email}
              onChange={setEmail}
              isReadOnly={langkah === 'sandi'}
              autoComplete="username"
              galat={galat.email}
            />
            {langkah === 'sandi' && (
              <TextField
                label="Kata sandi"
                type="password"
                value={sandi}
                onChange={setSandi}
                autoComplete="current-password"
                autoFocus
                galat={galat.sandi}
              />
            )}
            <Tombol type="submit" varian="utama" memuat={memuat}>
              {langkah === 'email' ? 'Lanjut' : 'Masuk'}
            </Tombol>
            <div className="flex flex-wrap justify-between gap-2">
              {langkah === 'sandi' && (
                <Tombol varian="teks" onPress={gantiAkun}>
                  Ganti akun
                </Tombol>
              )}
              <Tombol varian="teks" onPress={() => setLangkah('lupa')}>
                Lupa kata sandi
              </Tombol>
            </div>
          </form>
        )}
        {modeDemo && (
          <p className="mt-6 border-t border-garis pt-4 text-teks-kecil text-tinta-2">
            Mode demo: semua akun memakai kata sandi <span className="font-mono">demo</span>. Daftar akun ada di halaman demo.
          </p>
        )}
      </div>
    </main>
  )
}
