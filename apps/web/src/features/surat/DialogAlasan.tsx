import { useState } from 'react'
import { TextArea } from '@/ui/isian/TextArea'
import { Dialog } from '@/ui/lapisan/Dialog'
import { Tombol } from '@/ui/tombol/Tombol'

type Props = {
  judul: string
  subjudul?: string
  label: string
  keterangan?: string
  labelSetuju: string
  bahaya?: boolean
  memuat: boolean
  /** Galat dari server untuk isian ini. */
  galat?: string
  onSetuju: (teks: string) => void
  onTutup: () => void
}

/** Aksi yang wajib disertai alasan atau catatan: tolak, kembalikan, batalkan (SPEC §7.1). */
export function DialogAlasan({ judul, subjudul, label, keterangan, labelSetuju, bahaya = false, memuat, galat, onSetuju, onTutup }: Props) {
  const [teks, setTeks] = useState('')
  const [kosong, setKosong] = useState(false)
  const kirim = () => {
    if (teks.trim() === '') {
      setKosong(true)
      return
    }
    onSetuju(teks.trim())
  }
  return (
    <Dialog
      isOpen
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
      judul={judul}
      subjudul={subjudul}
      aksi={
        <>
          <Tombol onPress={onTutup}>Batal</Tombol>
          <Tombol varian={bahaya ? 'bahaya' : 'utama'} memuat={memuat} onPress={kirim}>
            {labelSetuju}
          </Tombol>
        </>
      }
    >
      <TextArea
        label={label}
        value={teks}
        onChange={(baru) => {
          setTeks(baru)
          setKosong(false)
        }}
        maxLength={500}
        keterangan={keterangan}
        galat={kosong ? `${label} wajib diisi` : galat}
        autoFocus
      />
    </Dialog>
  )
}
