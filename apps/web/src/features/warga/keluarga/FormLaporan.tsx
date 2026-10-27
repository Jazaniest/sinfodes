import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kirimLaporanWarga, kunciWarga, opsiKeluargaWarga } from '@/api/warga'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { FIELD_LAPORAN, type FieldLaporan } from '@/domain/laporan/schema'
import { teksNilaiRiwayat } from '@/domain/penduduk/perubahan'
import { LABEL_FIELD } from '@/domain/penduduk/riwayat'
import { periksaNilaiLaporan, pilihanLaporan, type AnggotaKeluargaWarga } from '@/domain/warga/keluarga'
import { Select } from '@/ui/isian/Select'
import { TextArea } from '@/ui/isian/TextArea'
import { TextField } from '@/ui/isian/TextField'
import { Tautan } from '@/ui/navigasi/Tautan'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import type { FotoTerpilih } from '../foto'
import { kunciKirimBaru } from '../kirim'
import { PilihFoto } from '../PilihFoto'
import { useSesiWarga } from '../sesi-konteks'

type Props = {
  /** Anggota yang dipilih dari Keluarga saya (`?anggota=`); bawaannya warga sendiri. */
  anggotaAwal?: string
  onTerkirim: () => void
  kecilkan?: (berkas: File) => Promise<File>
}
type Gagal = { pesan: string; bisaUlang: boolean }

function IsianNilai({ field, nilai, onUbah, galat }: { field: FieldLaporan; nilai: string; onUbah: (v: string) => void; galat?: string }) {
  const pilihan = pilihanLaporan(field)
  if (pilihan) {
    return (
      <Select
        label="Seharusnya"
        pilihan={pilihan.map((p) => ({ id: p, label: p }))}
        nilai={nilai || null}
        onUbah={(v) => onUbah(v ?? '')}
        galat={galat}
      />
    )
  }
  if (field === 'tanggalLahir') return <TextField label="Seharusnya" type="date" value={nilai} onChange={onUbah} galat={galat} />
  if (field === 'telepon') {
    return <TextField label="Seharusnya" type="tel" inputMode="tel" value={nilai} onChange={onUbah} galat={galat} keterangan="Diawali 08, mis. 081277402231." />
  }
  return <TextField label="Seharusnya" value={nilai} onChange={onUbah} galat={galat} />
}

/** "Ada data yang salah? Laporkan" (SPEC §10): pilih anggota dan data, tulis nilai yang benar, lampirkan foto dokumen (opsional). */
export function FormLaporan({ anggotaAwal, onTerkirim, kecilkan }: Props) {
  const sesi = useSesiWarga()
  const queryClient = useQueryClient()
  const kueri = useQuery(opsiKeluargaWarga())
  const [pendudukId, setPendudukId] = useState(anggotaAwal ?? sesi.penduduk.id)
  const [field, setField] = useState<FieldLaporan | null>(null)
  const [nilai, setNilai] = useState('')
  const [catatan, setCatatan] = useState('')
  const [foto, setFoto] = useState<FotoTerpilih | null>(null)
  const [galat, setGalat] = useState<{ field?: string; nilai?: string }>({})
  const [gagal, setGagal] = useState<Gagal | null>(null)
  const [kunci, setKunci] = useState(kunciKirimBaru)
  const [memuat, setMemuat] = useState(false)
  const mengirim = useRef(false)

  if (kueri.isPending) return <BarisKerangka jumlah={4} label="Memuat data keluarga…" />
  if (kueri.isError) return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  const anggota = kueri.data.anggota
  const orang: AnggotaKeluargaWarga = anggota.find((a) => a.id === pendudukId) ?? anggota[0]
  const nilaiLama = field ? orang[field] : null

  const kirim = async () => {
    if (mengirim.current) return
    if (!field) {
      setGalat({ field: 'Pilih data yang salah.' })
      return
    }
    const g = periksaNilaiLaporan(field, nilai, nilaiLama, tanggalIsoWib(new Date()))
    if (g) {
      setGalat({ nilai: g })
      return
    }
    mengirim.current = true
    setMemuat(true)
    setGalat({})
    setGagal(null)
    try {
      await kirimLaporanWarga(
        { kunci, pendudukId: orang.id, field, nilaiBaru: nilai, catatan: catatan.trim() ? catatan.trim() : null },
        foto?.berkas ?? null,
      )
      setKunci(kunciKirimBaru())
      void queryClient.invalidateQueries({ queryKey: kunciWarga.keluarga })
      tampilkanToast({ pesan: 'Laporan terkirim. Kantor desa akan memeriksanya.', nada: 'berhasil' })
      onTerkirim()
    } catch (e) {
      if (e instanceof GalatApi && e.fields.nilaiBaru) setGalat({ nilai: e.fields.nilaiBaru })
      else if (e instanceof GalatApi && (e.kode === 'CONFLICT' || e.kode === 'VALIDATION')) setGagal({ pesan: e.message, bisaUlang: false })
      // Koneksi putus atau server sibuk: isian tetap, kirim ulang dengan kunci yang sama (fokus review 1).
      else setGagal({ pesan: pesanGalat(e), bisaUlang: true })
    } finally {
      mengirim.current = false
      setMemuat(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Tautan href="/warga/keluarga" className="self-start">
        ← Keluarga saya
      </Tautan>
      <header>
        <h1 className="font-serif text-judul-halaman font-medium">Laporkan data yang salah</h1>
        <p className="mt-1 text-tinta-2">Kantor desa memeriksa laporan Anda sebelum datanya diubah.</p>
      </header>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void kirim()
        }}
        className="flex flex-col gap-5"
      >
        <Select
          label="Anggota keluarga"
          pilihan={anggota.map((a) => ({ id: a.id, label: a.nama }))}
          nilai={orang.id}
          onUbah={(id) => {
            if (id) setPendudukId(id)
            setNilai('')
          }}
        />
        <Select
          label="Data yang salah"
          pilihan={FIELD_LAPORAN.map((f) => ({ id: f, label: LABEL_FIELD[f] }))}
          nilai={field}
          onUbah={(id) => {
            setField(FIELD_LAPORAN.find((f) => f === id) ?? null)
            setNilai('')
            setGalat({})
          }}
          galat={galat.field}
        />
        {field && (
          <>
            <p className="text-tinta-2">Tercatat sekarang: {teksNilaiRiwayat(field, nilaiLama) ?? 'belum diisi'}</p>
            <IsianNilai field={field} nilai={nilai} onUbah={setNilai} galat={galat.nilai} />
          </>
        )}
        <TextArea label="Keterangan (tidak wajib)" value={catatan} onChange={setCatatan} baris={3} />
        <PilihFoto label="Foto dokumen" foto={foto} onUbah={setFoto} kecilkan={kecilkan} />
        {gagal && (
          <Banner nada="galat" judul={gagal.bisaUlang ? 'Laporan belum terkirim' : 'Laporan tidak bisa dikirim'}>
            {gagal.pesan}
          </Banner>
        )}
        <Tombol type="submit" varian="utama" memuat={memuat}>
          {gagal?.bisaUlang ? 'Kirim ulang' : 'Kirim laporan'}
        </Tombol>
      </form>
    </div>
  )
}
