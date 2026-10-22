import { useState } from 'react'
import { slugDesa } from '@/domain/konsol/aturan'
import { Dialog } from '@/ui/lapisan/Dialog'
import { TextField } from '@/ui/isian/TextField'
import { Tombol } from '@/ui/tombol/Tombol'

type Props = {
  isOpen: boolean
  onOpenChange: (buka: boolean) => void
  /** Nilai awal untuk ubah; null untuk halaman baru. */
  awal: { judul: string; nama: string } | null
  /** Kembalikan galat untuk ditampilkan, atau null bila berhasil dan dialog ditutup. */
  onSimpan: (judul: string, nama: string) => string | null
}

/** Dialog tambah/ubah halaman tambahan (keputusan 11): judul dan nama yang diusulkan dari judul. */
export function DialogHalaman({ isOpen, onOpenChange, awal, onSimpan }: Props) {
  const [judul, setJudul] = useState('')
  const [nama, setNama] = useState('')
  const [namaDiubah, setNamaDiubah] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)

  // Dialog dibuka kembali untuk halaman lain: isi ulang isian (pola penyesuaian saat render).
  const [tanda, setTanda] = useState({ isOpen, awal })
  if (tanda.isOpen !== isOpen || tanda.awal !== awal) {
    setTanda({ isOpen, awal })
    setJudul(awal?.judul ?? '')
    setNama(awal?.nama ?? '')
    setNamaDiubah(awal !== null)
    setGalat(null)
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      judul={awal ? 'Ubah halaman' : 'Tambah halaman'}
      aksi={
        <>
          <Tombol onPress={() => onOpenChange(false)}>Batal</Tombol>
          <Tombol
            varian="utama"
            onPress={() => {
              if (judul.trim() === '') {
                setGalat('Judul halaman wajib diisi.')
                return
              }
              const galatBaru = onSimpan(judul, nama)
              setGalat(galatBaru)
              if (!galatBaru) onOpenChange(false)
            }}
          >
            {awal ? 'Simpan' : 'Tambah halaman'}
          </Tombol>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField
          label="Judul halaman"
          value={judul}
          onChange={(v) => {
            setJudul(v)
            if (!namaDiubah) setNama(slugDesa(v))
          }}
          keterangan="Tampil di menu website."
        />
        <TextField
          label="Nama halaman"
          value={nama}
          onChange={(v) => {
            setNama(v)
            setNamaDiubah(true)
          }}
          galat={galat ?? undefined}
          keterangan="Dipakai di alamat halaman; huruf kecil, angka, dan tanda hubung."
        />
      </div>
    </Dialog>
  )
}
