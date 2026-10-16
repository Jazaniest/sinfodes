import { useState } from 'react'
import logoMark from '@/assets/brand/sinfodes-mark.svg'
import { GalatApi, pesanGalat } from '@/api/galat'
import { masuk } from '@/api/sesi'
import { DOMAIN_INDUK, keAlamat } from '@/app/alamat'
import type { DesaAlamat } from '@/domain/alamat/schema'
import { LambangDesa } from '@/ui/domain/LambangDesa'
import { TextField } from '@/ui/isian/TextField'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'

type Galat = { email?: string; sandi?: string; umum?: string; alamatDesa?: string }
type Props = { desa: DesaAlamat | null; onBerhasil: (token: string) => void; modeDemo?: boolean }

/**
 * Halaman masuk panel desa (SPEC §5.6). Desa sudah diketahui dari alamat (SPEC-V0.2 §4.3), jadi email dan kata sandi
 * diisi dalam satu langkah. Akun desa lain diberi tautan ke alamat desanya, hanya setelah kata sandinya benar.
 */
export function HalamanMasuk({ desa, onBerhasil, modeDemo = false }: Props) {
  const [lupa, setLupa] = useState(false)
  const [email, setEmail] = useState('')
  const [sandi, setSandi] = useState('')
  const [galat, setGalat] = useState<Galat>({})
  const [memuat, setMemuat] = useState(false)

  const kirim = async () => {
    const kosong: Galat = {}
    if (!email.trim()) kosong.email = 'Email atau nama pengguna wajib diisi.'
    if (!sandi) kosong.sandi = 'Kata sandi wajib diisi.'
    if (kosong.email || kosong.sandi) {
      setGalat(kosong)
      return
    }
    setMemuat(true)
    setGalat({})
    try {
      onBerhasil((await masuk(email, sandi)).token)
    } catch (e) {
      if (e instanceof GalatApi && e.fields.kataSandi) setGalat({ sandi: e.fields.kataSandi })
      else if (e instanceof GalatApi && e.fields.alamatDesa) setGalat({ umum: e.message, alamatDesa: e.fields.alamatDesa })
      else setGalat({ umum: pesanGalat(e) })
    } finally {
      setMemuat(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2 border border-garis bg-lembar p-6 sm:p-8">
        <img src={logoMark} alt="Sinfodes" className="h-9 w-auto" />
        {desa && (
          <div className="mt-5 flex items-center gap-3 rounded-1 bg-kertas px-3 py-2">
            <LambangDesa nama={desa.nama} />
            <div>
              <p className="font-medium">Desa {desa.nama}</p>
              <p className="text-teks-kecil text-tinta-2">
                {desa.kecamatan} · {desa.kabupaten}
              </p>
            </div>
          </div>
        )}
        <h1 className="mt-4 font-serif text-judul-halaman font-medium">Masuk panel desa</h1>
        {lupa ? (
          <div className="mt-5 flex flex-col gap-3">
            <p>
              Kata sandi diatur ulang oleh Sekretaris Desa, sebagai pengelola pengguna di desa Anda. Hubungi beliau untuk
              mendapatkan kata sandi sementara, lalu masuk lagi.
            </p>
            <p className="text-teks-kecil text-tinta-2">
              Kalau Sekretaris Desa juga tidak bisa masuk, hubungi tim dukungan Sinfodes melalui kantor kecamatan.
            </p>
            <Tombol onPress={() => setLupa(false)}>Kembali ke halaman masuk</Tombol>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              void kirim()
            }}
            className="mt-5 flex flex-col gap-4"
          >
            {galat.umum && (
              <Banner nada="galat">
                {galat.umum}
                {galat.alamatDesa && (
                  <>
                    {' '}
                    Masuk lewat{' '}
                    <a href={keAlamat({ jenis: 'desa', label: galat.alamatDesa }, '/admin/masuk')} className="font-medium underline">
                      {`${galat.alamatDesa}.${DOMAIN_INDUK}`}
                    </a>
                    .
                  </>
                )}
              </Banner>
            )}
            <TextField
              label="Email atau nama pengguna"
              value={email}
              onChange={setEmail}
              autoComplete="username"
              galat={galat.email}
            />
            <TextField
              label="Kata sandi"
              type="password"
              value={sandi}
              onChange={setSandi}
              autoComplete="current-password"
              galat={galat.sandi}
            />
            <Tombol type="submit" varian="utama" memuat={memuat}>
              Masuk
            </Tombol>
            <Tombol varian="teks" className="self-start" onPress={() => setLupa(true)}>
              Lupa kata sandi
            </Tombol>
          </form>
        )}
        {modeDemo && (
          <p className="mt-6 border-t border-garis pt-4 text-teks-kecil text-tinta-2">
            Mode demo: semua akun memakai kata sandi <span className="font-mono">demo</span>. Daftar akun ada di{' '}
            <a href={keAlamat({ jenis: 'induk' })} className="underline">
              halaman demo
            </a>
            .
          </p>
        )}
      </div>
    </main>
  )
}
