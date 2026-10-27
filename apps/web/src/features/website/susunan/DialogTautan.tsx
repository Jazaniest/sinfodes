import { useState } from 'react'
import { PESAN_TAUTAN } from '@/domain/website/blok'
import { Dialog } from '@/ui/lapisan/Dialog'
import { TextField } from '@/ui/isian/TextField'
import { Tombol } from '@/ui/tombol/Tombol'

type Props = {
  isOpen: boolean
  onOpenChange: (buka: boolean) => void
  /** Kembalikan galat untuk ditampilkan, atau null bila berhasil dan dialog ditutup. */
  onTambah: (label: string, url: string) => string | null
}

/** Dialog tautan luar (keputusan 10): label dan alamat http(s). */
export function DialogTautan({ isOpen, onOpenChange, onTambah }: Props) {
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [galat, setGalat] = useState<{ label?: string; url?: string }>({})

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(buka) => {
        if (!buka) {
          setLabel('')
          setUrl('')
          setGalat({})
        }
        onOpenChange(buka)
      }}
      judul="Tambah tautan luar"
      aksi={
        <>
          <Tombol onPress={() => onOpenChange(false)}>Batal</Tombol>
          <Tombol
            varian="utama"
            onPress={() => {
              const galatLabel = label.trim() === '' ? 'Label tautan wajib diisi.' : label.trim().length > 30 ? 'Paling banyak 30 karakter.' : undefined
              const galatUrl = /^https?:\/\//.test(url.trim()) ? undefined : PESAN_TAUTAN
              if (galatLabel || galatUrl) {
                setGalat({ label: galatLabel, url: galatUrl })
                return
              }
              const sisa = onTambah(label, url)
              if (sisa) {
                setGalat({ url: sisa })
                return
              }
              setLabel('')
              setUrl('')
              setGalat({})
              onOpenChange(false)
            }}
          >
            Tambah tautan luar
          </Tombol>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField label="Label tautan" value={label} onChange={setLabel} galat={galat.label} keterangan="Tampil di menu website, paling banyak 30 karakter." />
        <TextField label="Alamat tautan" value={url} onChange={setUrl} galat={galat.url} keterangan="Diawali http:// atau https://." />
      </div>
    </Dialog>
  )
}
