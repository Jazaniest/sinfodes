import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kirimPengaduanWarga, kunciWarga } from '@/api/warga'
import { galatDariZod } from '@/domain/format/galat-isian'
import { KATEGORI_PENGADUAN } from '@/domain/pengaduan/schema'
import { kirimPengaduanWargaSchema } from '@/domain/warga/pengaduan'
import { useDrafFormulir } from '@/features/admin/useDrafFormulir'
import { Select } from '@/ui/isian/Select'
import { TextArea } from '@/ui/isian/TextArea'
import { TextField } from '@/ui/isian/TextField'
import { Tautan } from '@/ui/navigasi/Tautan'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import type { FotoTerpilih } from '../foto'
import { kunciKirimBaru } from '../kirim'
import { PilihFoto } from '../PilihFoto'
import { useSesiWarga } from '../sesi-konteks'
import { DRAF_ADUAN_KOSONG, drafAduanSah, kunciDrafAduan, type DrafAduan } from './aduan'

type Props = { onTerkirim: (id: string, nomor: string) => void; kecilkan?: (berkas: File) => Promise<File> }
type Gagal = { pesan: string; bisaUlang: boolean }

/** Sampaikan pengaduan (SPEC §10): kategori, cerita, foto, dan lokasi (opsional). Isian tersimpan sebagai draf. */
export function FormPengaduan({ onTerkirim, kecilkan }: Props) {
  const sesi = useSesiWarga()
  const queryClient = useQueryClient()
  const { draf, simpan, buang } = useDrafFormulir(kunciDrafAduan(sesi.penduduk.id), drafAduanSah)
  const [form, setForm] = useState<DrafAduan>(() => draf?.isi ?? DRAF_ADUAN_KOSONG)
  const [dariDraf] = useState(() => draf !== null && draf.isi.cerita.trim() !== '')
  const [foto, setFoto] = useState<FotoTerpilih | null>(null)
  const [galat, setGalat] = useState<Record<string, string>>({})
  const [gagal, setGagal] = useState<Gagal | null>(null)
  const [kunci, setKunci] = useState(kunciKirimBaru)
  const [memuat, setMemuat] = useState(false)
  const mengirim = useRef(false)

  const ubah = (sebagian: Partial<DrafAduan>) => {
    const baru = { ...form, ...sebagian }
    setForm(baru)
    simpan(baru)
  }

  const kirim = async () => {
    if (mengirim.current) return
    const isian = kirimPengaduanWargaSchema.safeParse({
      kunci, kategori: form.kategori, cerita: form.cerita, lokasi: form.lokasi.trim() ? form.lokasi : null,
    })
    if (!isian.success) {
      const g = galatDariZod(isian.error)
      setGalat(form.kategori === null ? { ...g, kategori: 'Pilih kategori pengaduan.' } : g)
      return
    }
    mengirim.current = true
    setMemuat(true)
    setGalat({})
    setGagal(null)
    try {
      const hasil = await kirimPengaduanWarga(isian.data, foto?.berkas ?? null)
      buang()
      setKunci(kunciKirimBaru())
      void queryClient.invalidateQueries({ queryKey: kunciWarga.pengaduan, exact: true })
      onTerkirim(hasil.id, hasil.nomor)
    } catch (e) {
      if (e instanceof GalatApi && e.kode === 'VALIDATION' && Object.keys(e.fields).length > 0) setGalat({ ...e.fields })
      // Koneksi putus atau server sibuk: isian tetap, kirim ulang dengan kunci yang sama (fokus review 1).
      else setGagal({ pesan: pesanGalat(e), bisaUlang: !(e instanceof GalatApi && e.kode === 'VALIDATION') })
    } finally {
      mengirim.current = false
      setMemuat(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Tautan href="/warga/pengaduan" className="self-start">
        ← Pengaduan saya
      </Tautan>
      <header>
        <h1 className="font-serif text-judul-halaman font-medium">Sampaikan pengaduan</h1>
        <p className="mt-1 text-tinta-2">Ceritakan masalahnya. Petugas desa membalas di halaman ini.</p>
      </header>
      {dariDraf && <Banner nada="info" judul="Melanjutkan cerita yang tersimpan di HP ini">Foto perlu dipilih lagi bila ada.</Banner>}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void kirim()
        }}
        className="flex flex-col gap-5"
      >
        <Select
          label="Kategori"
          pilihan={KATEGORI_PENGADUAN.map((k) => ({ id: k, label: k }))}
          nilai={form.kategori}
          onUbah={(id) => ubah({ kategori: KATEGORI_PENGADUAN.find((k) => k === id) ?? null })}
          galat={galat.kategori}
        />
        <TextArea
          label="Cerita"
          value={form.cerita}
          onChange={(cerita) => ubah({ cerita })}
          galat={galat.cerita}
          keterangan="Apa yang terjadi, sejak kapan, dan siapa yang terdampak."
          baris={5}
        />
        <TextField
          label="Lokasi (tidak wajib)"
          value={form.lokasi}
          onChange={(lokasi) => ubah({ lokasi })}
          galat={galat.lokasi}
          keterangan="Mis. jalan lingkungan RT 004, dekat surau."
        />
        <PilihFoto label="Foto" foto={foto} onUbah={setFoto} kecilkan={kecilkan} />
        {gagal && (
          <Banner nada="galat" judul={gagal.bisaUlang ? 'Pengaduan belum terkirim' : 'Pengaduan tidak bisa dikirim'}>
            {gagal.pesan}
            {gagal.bisaUlang && ' Cerita Anda masih tersimpan.'}
          </Banner>
        )}
        <Tombol type="submit" varian="utama" memuat={memuat}>
          {gagal?.bisaUlang ? 'Kirim ulang' : 'Kirim pengaduan'}
        </Tombol>
      </form>
    </div>
  )
}
