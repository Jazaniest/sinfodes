import { useState } from 'react'
import { TextField } from '@/ui/isian/TextField'
import { Dialog } from '@/ui/lapisan/Dialog'
import { Tombol } from '@/ui/tombol/Tombol'
import { DialogAturPassphrase } from './DialogAturPassphrase'
import { usePassphraseTtd } from './usePassphraseTtd'

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

/** Dibaca saat render (bukan konstanta modul) supaya uji bisa berganti mode. */
const modeDemo = (): boolean => import.meta.env.VITE_DEMO === 'true'

/**
 * Tanda tangan elektronik dengan passphrase (SPEC §7.4). Di demo, TTE disimulasikan dengan passphrase tetap. Di server nyata,
 * pengguna yang belum punya passphrase menetapkannya lebih dulu di dialog yang sama (Ruling 1 tahap 8F2b).
 */
export function DialogTandaTangani(props: Props) {
  return modeDemo() ? <DialogMasukkanPassphrase {...props} /> : <DialogDenganPassphraseServer {...props} />
}

function DialogDenganPassphraseServer(props: Props) {
  const { diatur, atur, memuat } = usePassphraseTtd()
  const [ubah, setUbah] = useState(false)
  if (diatur === false || ubah) {
    return (
      <DialogAturPassphrase
        ganti={diatur === true}
        memuat={memuat}
        onAtur={async (masukan) => {
          await atur(masukan)
          setUbah(false)
        }}
        onTutup={() => (diatur === false ? props.onTutup() : setUbah(false))}
      />
    )
  }
  return <DialogMasukkanPassphrase {...props} onUbahPassphrase={diatur === true ? () => setUbah(true) : undefined} />
}

function DialogMasukkanPassphrase({
  judulSurat, pemohon, atasNama, memuat, galat, onSetuju, onSetujuLanjut, onTutup, onUbahPassphrase,
}: Props & { onUbahPassphrase?: () => void }) {
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
          keterangan={modeDemo() ? 'Simulasi TTE: passphrase demo tertulis di halaman demo.' : undefined}
          autoComplete="off"
          autoFocus
        />
        {onUbahPassphrase && (
          <div>
            <Tombol varian="teks" onPress={onUbahPassphrase}>
              Ubah passphrase
            </Tombol>
          </div>
        )}
      </div>
    </Dialog>
  )
}
