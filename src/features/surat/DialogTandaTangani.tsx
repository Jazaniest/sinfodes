import { useState } from 'react'
import { TextField } from '@/ui/isian/TextField'
import { Dialog } from '@/ui/lapisan/Dialog'
import { Tombol } from '@/ui/tombol/Tombol'
import { MODE_DEMO } from './lembar'

type Props = {
  judulSurat: string
  pemohon: string
  /** Sekretaris Desa menandatangani atas nama Kepala Desa. */
  atasNama: boolean
  memuat: boolean
  galat?: string
  onSetuju: (passphrase: string) => void
  onTutup: () => void
}

/** Tanda tangan elektronik dengan passphrase (SPEC §7.4). Di demo, TTE disimulasikan. */
export function DialogTandaTangani({ judulSurat, pemohon, atasNama, memuat, galat, onSetuju, onTutup }: Props) {
  const [passphrase, setPassphrase] = useState('')
  const [kosong, setKosong] = useState(false)
  const kirim = () => {
    if (passphrase === '') {
      setKosong(true)
      return
    }
    onSetuju(passphrase)
  }
  return (
    <Dialog
      isOpen
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
      judul="Tanda tangani surat?"
      subjudul={`${judulSurat} · ${pemohon}`}
      aksi={
        <>
          <Tombol onPress={onTutup}>Batal</Tombol>
          <Tombol varian="utama" memuat={memuat} onPress={kirim}>
            Tanda tangani
          </Tombol>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p>
          {atasNama && 'Anda menandatangani atas nama Kepala Desa. '}
          Nomor surat diberikan saat ditandatangani dan tidak bisa diubah.
        </p>
        <TextField
          label="Passphrase tanda tangan elektronik"
          type="password"
          value={passphrase}
          onChange={(baru) => {
            setPassphrase(baru)
            setKosong(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') kirim()
          }}
          galat={kosong ? 'Passphrase wajib diisi' : galat}
          keterangan={MODE_DEMO ? 'Simulasi TTE: passphrase demo tertulis di halaman demo.' : undefined}
          autoComplete="off"
          autoFocus
        />
      </div>
    </Dialog>
  )
}
