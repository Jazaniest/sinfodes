import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciKabupaten, masukKabupaten } from '@/api/kabupaten'
import { keAlamat } from '@/app/alamat'
import { simpanSesi } from '@/app/sesi'
import type { SesiKabupaten } from '@/domain/kabupaten/schema'
import { TextField } from '@/ui/isian/TextField'
import { Tautan } from '@/ui/navigasi/Tautan'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { KabupatenBelumMitra } from './KabupatenBelumMitra'
import { LambangContoh } from './LambangContoh'

type Kabupaten = { label: string; nama: string; mitra: boolean }
type Galat = { sandi?: string; umum?: string; alamat?: string }

/** Isian masuk dasbor: token disimpan sebagai sesi kabupaten, dan cache kabupaten lama dibuang. */
function FormMasukKabupaten({ onBerhasil }: { onBerhasil: (sesi: SesiKabupaten) => void }) {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [kataSandi, setKataSandi] = useState('')
  const [galat, setGalat] = useState<Galat>({})
  const [memuat, setMemuat] = useState(false)
  const kirim = async (e: FormEvent) => {
    e.preventDefault()
    setMemuat(true)
    setGalat({})
    try {
      const { token, sesi } = await masukKabupaten(email, kataSandi)
      simpanSesi(token, 'kabupaten')
      queryClient.removeQueries({ queryKey: kunciKabupaten.semua })
      queryClient.setQueryData(kunciKabupaten.sesi, sesi)
      onBerhasil(sesi)
    } catch (e) {
      if (e instanceof GalatApi && e.fields.kataSandi) setGalat({ sandi: e.fields.kataSandi })
      else setGalat({ umum: pesanGalat(e), alamat: e instanceof GalatApi ? e.fields.alamatKabupaten : undefined })
    } finally {
      setMemuat(false)
    }
  }
  return (
    <form onSubmit={(e) => void kirim(e)} noValidate className="flex flex-col gap-4">
      {galat.umum && (
        <Banner nada="galat">
          <span className="block">{galat.umum}</span>
          {galat.alamat && (
            <Tautan href={keAlamat({ jenis: 'kabupaten', label: galat.alamat }, '/admin/masuk')} className="mt-1 inline-block">
              Masuk di alamat kabupaten akun ini
            </Tautan>
          )}
        </Banner>
      )}
      <TextField label="Email" type="email" autoComplete="username" value={email} onChange={setEmail} isRequired />
      <TextField
        label="Kata sandi"
        type="password"
        autoComplete="current-password"
        value={kataSandi}
        onChange={setKataSandi}
        galat={galat.sandi}
        isRequired
      />
      <Tombol type="submit" varian="utama" memuat={memuat}>
        Masuk
      </Tombol>
    </form>
  )
}

/**
 * Halaman masuk dasbor kabupaten (SPEC-V0.2 §8.1). Kabupaten dari alamatnya; alamat kabupaten yang belum mitra tidak punya
 * formulir masuk.
 */
export function MasukKabupaten({ kabupaten, onBerhasil }: { kabupaten: Kabupaten | null; onBerhasil: (sesi: SesiKabupaten) => void }) {
  if (kabupaten && !kabupaten.mitra) return <KabupatenBelumMitra nama={kabupaten.nama} />
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div className="flex items-center gap-3">
        <LambangContoh nama={kabupaten?.nama ?? 'Kabupaten'} className="h-12 w-auto shrink-0 text-tinta" />
        <div>
          <p className="text-label font-medium text-tinta-2 uppercase">Sinfodes</p>
          <h1 className="font-serif text-judul-halaman font-medium">{kabupaten ? `Dasbor Kabupaten ${kabupaten.nama}` : 'Dasbor kabupaten'}</h1>
        </div>
      </div>
      <FormMasukKabupaten onBerhasil={onBerhasil} />
    </main>
  )
}
