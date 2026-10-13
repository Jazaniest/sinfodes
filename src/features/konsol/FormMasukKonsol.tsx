import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciKonsol, masukKonsol } from '@/api/konsol'
import { simpanSesi } from '@/app/sesi'
import type { SesiKonsol } from '@/domain/konsol/schema'
import { TextField } from '@/ui/isian/TextField'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'

/** Isian masuk Konsol: token disimpan sebagai sesi konsol, dan cache konsol lama dibuang. */
export function FormMasukKonsol({ onBerhasil }: { onBerhasil: (sesi: SesiKonsol) => void }) {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [kataSandi, setKataSandi] = useState('')
  const [galat, setGalat] = useState<{ sandi?: string; umum?: string }>({})
  const [memuat, setMemuat] = useState(false)
  const kirim = async (e: FormEvent) => {
    e.preventDefault()
    setMemuat(true)
    setGalat({})
    try {
      const { token, sesi } = await masukKonsol(email, kataSandi)
      simpanSesi(token, 'konsol')
      queryClient.removeQueries({ queryKey: kunciKonsol.semua })
      queryClient.setQueryData(kunciKonsol.sesi, sesi)
      onBerhasil(sesi)
    } catch (e) {
      setGalat(e instanceof GalatApi && e.fields.kataSandi ? { sandi: e.fields.kataSandi } : { umum: pesanGalat(e) })
    } finally {
      setMemuat(false)
    }
  }
  return (
    <form onSubmit={(e) => void kirim(e)} noValidate className="flex flex-col gap-4">
      {galat.umum && <Banner nada="galat">{galat.umum}</Banner>}
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
