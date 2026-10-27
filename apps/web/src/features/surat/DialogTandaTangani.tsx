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
  /** Tumpukan tanda tangan: tanda tangani lalu langsung ke surat berikutnya. Bila ada, ini aksi utama dan aksi Enter. */
  onSetujuLanjut?: (passphrase: string) => void
  onTutup: () => void
}

/** Tanda tangan elektronik dengan passphrase (SPEC §7.4). Di demo, TTE disimulasikan. */
export function DialogTandaTangani({ judulSurat, pemohon, atasNama, memuat, galat, onSetuju, onSetujuLanjut, onTutup }: Props) {
  const [passphrase, setPassphrase] = useState('')
  const [kosong, setKosong] = useState(false)
  const kirim = (setuju: (passphrase: string) => void) => {
    if (passphrase === '') {
      setKosong(true)
      return
    }
    setuju(passphrase)
  }
  const utama = onSetujuLanjut ?? onSetuju
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
          {onSetujuLanjut ? (
            <>
              <Tombol memuat={memuat} onPress={() => kirim(onSetuju)}>
                Tanda tangani
              </Tombol>
              <Tombol varian="utama" memuat={memuat} onPress={() => kirim(onSetujuLanjut)}>
                Tanda tangani &amp; lanjut
              </Tombol>
            </>
          ) : (
            <Tombol varian="utama" memuat={memuat} onPress={() => kirim(onSetuju)}>
              Tanda tangani
            </Tombol>
          )}
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
            if (e.key === 'Enter') kirim(utama)
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
