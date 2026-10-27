import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciWarga, ubahAkunWarga } from '@/api/warga'
import { bersihkanWhatsapp, formatWhatsapp, periksaPin, periksaPinBaru, periksaWhatsapp, samarkanNik } from '@/domain/warga/akun'
import { DescriptionList } from '@/ui/data/DescriptionList'
import { PinField } from '@/ui/isian/PinField'
import { TextField } from '@/ui/isian/TextField'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { useSesiWarga } from './sesi-konteks'

const judulBagian = 'text-label font-medium text-tinta-2 uppercase'

type GalatPin = { pinLama?: string; pinBaru?: string; ulang?: string; umum?: string }

function GantiPin() {
  const queryClient = useQueryClient()
  const [lama, setLama] = useState('')
  const [baru, setBaru] = useState('')
  const [ulang, setUlang] = useState('')
  const [galat, setGalat] = useState<GalatPin>({})
  const mengirim = useRef(false)
  const simpan = useMutation({
    mutationFn: () => ubahAkunWarga({ pinLama: lama, pinBaru: baru }),
    onSuccess: (sesi) => {
      queryClient.setQueryData(kunciWarga.sesi, sesi)
      setLama('')
      setBaru('')
      setUlang('')
      setGalat({})
      tampilkanToast({ pesan: 'PIN diganti. Pakai PIN baru saat masuk berikutnya.', nada: 'berhasil' })
    },
    onError: (e) => {
      if (e instanceof GalatApi && e.kode === 'VALIDATION' && Object.keys(e.fields).length > 0) {
        setGalat({ pinLama: e.fields.pinLama, pinBaru: e.fields.pinBaru })
      } else setGalat({ umum: pesanGalat(e) })
    },
    onSettled: () => {
      mengirim.current = false
    },
  })
  const kirim = () => {
    if (mengirim.current) return
    const periksa: GalatPin = {
      pinLama: periksaPin(lama) ?? undefined,
      pinBaru: periksaPinBaru(baru, lama) ?? undefined,
      ulang: ulang === baru ? undefined : 'Ulangan PIN baru tidak sama.',
    }
    if (periksa.pinLama || periksa.pinBaru || periksa.ulang) {
      setGalat(periksa)
      return
    }
    mengirim.current = true
    setGalat({})
    simpan.mutate()
  }
  return (
    <section aria-labelledby="akun-pin" className="flex flex-col gap-4">
      <h2 id="akun-pin" className={judulBagian}>
        Ganti PIN
      </h2>
      {galat.umum && <Banner nada="galat">{galat.umum}</Banner>}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          kirim()
        }}
        className="flex flex-col gap-4"
      >
        <PinField label="PIN lama" nilai={lama} onUbah={setLama} galat={galat.pinLama} />
        <PinField
          label="PIN baru"
          nilai={baru}
          onUbah={setBaru}
          galat={galat.pinBaru}
          autoComplete="new-password"
          keterangan="Hindari angka berurutan atau 6 angka yang sama."
        />
        <PinField label="Ulangi PIN baru" nilai={ulang} onUbah={setUlang} galat={galat.ulang} autoComplete="new-password" />
        <Tombol type="submit" varian="utama" memuat={simpan.isPending}>
          Simpan PIN baru
        </Tombol>
      </form>
    </section>
  )
}

function GantiWhatsapp() {
  const sesi = useSesiWarga()
  const queryClient = useQueryClient()
  const [nomor, setNomor] = useState('')
  const [galat, setGalat] = useState<string | undefined>()
  const mengirim = useRef(false)
  const simpan = useMutation({
    mutationFn: (bersih: string) => ubahAkunWarga({ whatsapp: bersih }),
    onSuccess: (baru) => {
      queryClient.setQueryData(kunciWarga.sesi, baru)
      setNomor('')
      setGalat(undefined)
      tampilkanToast({ pesan: `Nomor WhatsApp diganti menjadi ${formatWhatsapp(baru.whatsapp)}.`, nada: 'berhasil' })
    },
    onError: (e) => setGalat(e instanceof GalatApi && e.fields.whatsapp ? e.fields.whatsapp : pesanGalat(e)),
    onSettled: () => {
      mengirim.current = false
    },
  })
  const kirim = () => {
    if (mengirim.current) return
    const bersih = bersihkanWhatsapp(nomor)
    const g = periksaWhatsapp(bersih)
    if (g) {
      setGalat(g)
      return
    }
    mengirim.current = true
    simpan.mutate(bersih)
  }
  return (
    <section aria-labelledby="akun-wa" className="flex flex-col gap-4">
      <h2 id="akun-wa" className={judulBagian}>
        Ganti nomor WhatsApp
      </h2>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          kirim()
        }}
        className="flex flex-col gap-4"
      >
        <TextField
          label="Nomor WhatsApp baru"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={nomor}
          onChange={setNomor}
          galat={galat}
          keterangan={`Sekarang ${formatWhatsapp(sesi.whatsapp)}. Kabar permohonan dikirim ke nomor ini.`}
        />
        <Tombol type="submit" varian="utama" memuat={simpan.isPending}>
          Simpan nomor
        </Tombol>
      </form>
    </section>
  )
}

/** Akun layanan warga (SPEC §10): data akun, ganti PIN, ganti nomor WhatsApp, dan keluar. */
export function Akun({ onKeluar }: { onKeluar: () => void }) {
  const sesi = useSesiWarga()
  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-judul-halaman font-medium">Akun</h1>
      <DescriptionList
        judul="Data akun"
        items={[
          { label: 'Nama', nilai: sesi.penduduk.nama },
          { label: 'NIK', nilai: <span className="font-mono">{samarkanNik(sesi.penduduk.nik)}</span> },
          { label: 'Nomor WhatsApp', nilai: formatWhatsapp(sesi.whatsapp) },
          { label: 'Desa', nilai: `Desa ${sesi.desa.nama}` },
        ]}
      />
      <GantiPin />
      <GantiWhatsapp />
      <section aria-labelledby="akun-keluar" className="flex flex-col gap-3">
        <h2 id="akun-keluar" className={judulBagian}>
          Keluar
        </h2>
        <p className="text-tinta-2">Keluar dari layanan warga di HP ini. Untuk masuk lagi, pakai NIK dan PIN.</p>
        <Tombol onPress={onKeluar}>Keluar</Tombol>
      </section>
    </div>
  )
}
