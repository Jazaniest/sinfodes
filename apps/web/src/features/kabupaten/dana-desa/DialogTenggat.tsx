import { useMutation } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { tambahTenggat, ubahTenggat } from '@/api/kabupaten'
import { galatDariZod } from '@/domain/format/galat-isian'
import { isianTenggatSchema, type RingkasTenggat } from '@/domain/kabupaten/tenggat'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { DatePicker } from '@/ui/isian/DatePicker'
import { TextField } from '@/ui/isian/TextField'
import { Dialog } from '@/ui/lapisan/Dialog'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'

type Props = {
  /** Tenggat yang diubah; tanpa ini dialog menambah tenggat baru. */
  awal?: Pick<RingkasTenggat, 'id' | 'nama' | 'tanggal'>
  onTutup: () => void
  onBerhasil: (t: RingkasTenggat) => void
}

/** Tambah atau ubah tenggat laporan (SPEC-V0.2 §8.3 butir 4, Admin Kabupaten). Galat dari server ditandai di isiannya. */
export function DialogTenggat({ awal, onTutup, onBerhasil }: Props) {
  const [nama, setNama] = useState(awal?.nama ?? '')
  const [tanggal, setTanggal] = useState<string | null>(awal?.tanggal ?? null)
  const [galat, setGalat] = useState<Record<string, string>>({})
  const mengirim = useRef(false)
  const wadah = useRef<HTMLDivElement>(null)
  const tandai = (g: Record<string, string>) => {
    setGalat(g)
    fokusIsianSalah(wadah.current)
  }
  const kirim = useMutation({
    mutationFn: (isian: { nama: string; tanggal: string }) => (awal ? ubahTenggat(awal.id, isian) : tambahTenggat(isian)),
    onSuccess: (t) => {
      onBerhasil(t)
      tampilkanToast({
        pesan: awal ? 'Tenggat diubah.' : 'Tenggat ditambahkan. Desa melihat pengingatnya mulai 14 hari sebelum tanggal itu.',
        nada: 'berhasil',
      })
      onTutup()
    },
    onError: (e) => {
      if (e instanceof GalatApi && Object.keys(e.fields).length > 0) tandai(e.fields)
      else tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' })
    },
    onSettled: () => {
      mengirim.current = false
    },
  })
  const tekan = () => {
    if (mengirim.current) return
    const hasil = isianTenggatSchema.safeParse({ nama, tanggal: tanggal ?? '' })
    if (!hasil.success || tanggal === null) {
      tandai({ ...(hasil.success ? {} : galatDariZod(hasil.error)), ...(tanggal === null ? { tanggal: 'Pilih tanggal tenggat' } : {}) })
      return
    }
    mengirim.current = true
    kirim.mutate(hasil.data)
  }
  return (
    <Dialog
      isOpen
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
      judul={awal ? 'Ubah tenggat' : 'Tambah tenggat'}
      subjudul="Desa melihat pengingat di panelnya 14, 7, dan 1 hari sebelum tanggal tenggat."
      aksi={
        <>
          <Tombol onPress={onTutup}>Batal</Tombol>
          <Tombol varian="utama" memuat={kirim.isPending} onPress={tekan}>
            Simpan
          </Tombol>
        </>
      }
    >
      <div ref={wadah} className="flex flex-col gap-4">
        <TextField
          label="Nama laporan"
          keterangan="Mis. Laporan realisasi Dana Desa tahap II."
          value={nama}
          onChange={(v) => {
            setNama(v)
            setGalat((g) => ({ ...g, nama: '' }))
          }}
          galat={galat.nama || undefined}
          maxLength={120}
          isRequired
        />
        <DatePicker
          label="Tanggal tenggat"
          nilai={tanggal}
          onUbah={(v) => {
            setTanggal(v)
            setGalat((g) => ({ ...g, tanggal: '' }))
          }}
          galat={galat.tanggal || undefined}
          isRequired
        />
      </div>
    </Dialog>
  )
}
