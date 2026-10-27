import { useEffect, useRef, useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { lupaPin, masukWarga } from '@/api/warga'
import logoMark from '@/assets/brand/sinfodes-mark.svg'
import type { TampilanWarga } from '@/domain/alamat/schema'
import { periksaPin } from '@/domain/warga/akun'
import type { SesiWarga } from '@/domain/warga/sesi'
import { gayaWarga, PASANGAN_HURUF } from '@/domain/website/tema'
import { cn } from '@/ui/cn'
import { NikField } from '@/ui/domain/NikField'
import { PinField } from '@/ui/isian/PinField'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { muatPasanganHuruf } from '@/ui/website/huruf'

type Galat = { nik?: string; pin?: string; umum?: string }
/**
 * `namaDesa`: desa pemilik alamat ini (SPEC-V0.2 §4.3); kosong bila alamatnya tidak dikenali. `ditutup`: desa itu masih
 * Persiapan, layanan warganya belum dibuka (SPEC-V0.2 §4.1). `tampilan`: tema desa untuk halaman ini (warna utama, logo, foto
 * latar, sambutan, huruf judul); formulirnya sama di semua desa dan selalu berada di atas lembar putih.
 */
type Props = {
  onBerhasil: (token: string, sesi: SesiWarga) => void
  modeDemo?: boolean
  namaDesa?: string | null
  ditutup?: boolean
  tampilan?: TampilanWarga | null
}

const PESAN_NIK = 'NIK terdiri dari 16 angka.'

/** Masuk layanan warga dengan NIK dan PIN 6 angka (SPEC §10). */
export function FormMasukWarga({ onBerhasil, modeDemo = false, namaDesa = null, ditutup = false, tampilan = null }: Props) {
  const [nik, setNik] = useState('')
  const [pin, setPin] = useState('')
  const [galat, setGalat] = useState<Galat>({})
  const [konfirmasiLupa, setKonfirmasiLupa] = useState<string | null>(null)
  const [memuat, setMemuat] = useState(false)
  const mengirim = useRef(false)
  const huruf = tampilan?.huruf
  useEffect(() => {
    if (huruf) void muatPasanganHuruf(huruf)
  }, [huruf])

  const kirim = async () => {
    if (mengirim.current) return
    const periksa: Galat = { nik: nik.length === 16 ? undefined : PESAN_NIK, pin: periksaPin(pin) ?? undefined }
    if (periksa.nik || periksa.pin) {
      setGalat(periksa)
      return
    }
    mengirim.current = true
    setMemuat(true)
    setGalat({})
    setKonfirmasiLupa(null)
    try {
      const { token, sesi } = await masukWarga(nik, pin)
      onBerhasil(token, sesi)
    } catch (e) {
      if (e instanceof GalatApi && e.kode === 'RATE_LIMITED') setGalat({ umum: e.message })
      else if (e instanceof GalatApi && e.fields.pin) {
        setGalat({ pin: e.fields.pin })
        setPin('')
      } else setGalat({ umum: pesanGalat(e) })
    } finally {
      mengirim.current = false
      setMemuat(false)
    }
  }

  const mintaPinBaru = async () => {
    if (nik.length !== 16) {
      setGalat({ nik: 'Isi NIK lebih dulu, lalu ketuk Lupa PIN.' })
      return
    }
    setGalat({})
    try {
      setKonfirmasiLupa((await lupaPin(nik)).pesan)
    } catch (e) {
      setGalat({ umum: pesanGalat(e) })
    }
  }

  return (
    <main
      className={cn('skala-warga min-h-dvh bg-kertas text-teks text-tinta', tampilan?.fotoLatar && 'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]')}
      style={tampilan ? gayaWarga(tampilan.warnaUtama) : undefined}
    >
      {tampilan?.fotoLatar && (
        <div className="h-40 overflow-hidden lg:h-auto lg:min-h-dvh">
          <img src={tampilan.fotoLatar} alt="" className="size-full object-cover" />
        </div>
      )}
      <div data-lembar className={cn('px-4 py-8', tampilan && 'bg-lembar')}>
        <div className="mx-auto w-full max-w-sm">
          {tampilan?.logo ? (
            <img src={tampilan.logo} alt={`Logo Desa ${namaDesa ?? ''}`.trim()} className="h-12 w-auto max-w-full object-contain" />
          ) : (
            <img src={logoMark} alt="Sinfodes" className="h-9 w-auto" />
          )}
          <h1
            className="mt-4 font-serif text-judul-halaman font-medium"
            style={tampilan ? { fontFamily: PASANGAN_HURUF[tampilan.huruf].judul } : undefined}
          >
            Layanan warga
          </h1>
          {namaDesa && <p className="font-medium">Desa {namaDesa}</p>}
          {tampilan?.sambutan && <p className="mt-1 break-words text-tinta-2">{tampilan.sambutan}</p>}
          {ditutup ? (
            <p className="mt-6 border-t border-garis pt-4">
              Layanan warga {namaDesa ? `Desa ${namaDesa}` : 'desa ini'} belum dibuka. Desa sedang menyiapkan datanya.
            </p>
          ) : (
            <>
              <p className="mt-1 text-tinta-2">Urus surat desa dan pantau perkembangannya dari HP.</p>
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault()
                  void kirim()
                }}
                className="mt-6 flex flex-col gap-5"
              >
                {galat.umum && <Banner nada="galat">{galat.umum}</Banner>}
                {konfirmasiLupa && (
                  <Banner nada="berhasil" judul="Permintaan PIN baru terkirim">
                    {konfirmasiLupa}
                  </Banner>
                )}
                <NikField nilai={nik} onUbah={(digit) => setNik(digit)} galat={galat.nik} />
                <PinField nilai={pin} onUbah={setPin} galat={galat.pin} keterangan="PIN 6 angka dari kantor desa." />
                <Tombol type="submit" varian="utama" memuat={memuat}>
                  Masuk
                </Tombol>
                <Tombol varian="teks" className="min-h-tombol self-start" onPress={() => void mintaPinBaru()}>
                  Lupa PIN?
                </Tombol>
              </form>
              {modeDemo && (
                <p className="mt-6 border-t border-garis pt-4 text-teks-kecil text-tinta-2">
                  Mode demo: NIK dan PIN warga demo ada di halaman demo.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
