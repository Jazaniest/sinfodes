import { useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { galatDariZod } from '@/domain/format/galat-isian'
import { aturPassphraseSchema, type AturPassphrase } from '@/domain/surat/passphrase'
import { TextField } from '@/ui/isian/TextField'
import { Dialog } from '@/ui/lapisan/Dialog'
import { Tombol } from '@/ui/tombol/Tombol'
import { tampilkanToast } from '@/ui/toast/antrean'

type Props = {
  /** Mengganti passphrase yang sudah ada (tautan "Ubah passphrase"), bukan menetapkan yang pertama. */
  ganti: boolean
  memuat: boolean
  onAtur: (masukan: AturPassphrase) => Promise<void>
  onTutup: () => void
}

type Galat = Partial<Record<'kataSandi' | 'passphrase' | 'ulang', string>>

/**
 * Formulir menetapkan atau mengganti passphrase tanda tangan (Ruling 1 tahap 8F2b). Skema yang sama dengan server memeriksa isian
 * lebih dulu; kata sandi akun diperiksa ulang di server. Galat server tampil di isian asalnya, dan 429 (terkunci) di kolom
 * kata sandi karena penetapan dijaga oleh kata sandi itu.
 */
export function DialogAturPassphrase({ ganti, memuat, onAtur, onTutup }: Props) {
  const [kataSandi, setKataSandi] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [ulang, setUlang] = useState('')
  const [galat, setGalat] = useState<Galat>({})

  const kirim = async () => {
    const cek = aturPassphraseSchema.safeParse({ kataSandi, passphrase })
    const salah: Galat = cek.success ? {} : (galatDariZod(cek.error) as Galat)
    if (ulang !== passphrase) salah.ulang = 'Passphrase tidak sama.'
    setGalat(salah)
    if (!cek.success || salah.ulang) return
    try {
      await onAtur(cek.data)
    } catch (e) {
      if (e instanceof GalatApi && (e.fields.kataSandi || e.fields.passphrase)) {
        setGalat({ kataSandi: e.fields.kataSandi, passphrase: e.fields.passphrase })
      } else if (e instanceof GalatApi && e.kode === 'RATE_LIMITED') {
        setGalat({ kataSandi: e.message })
      } else {
        tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' })
      }
    }
  }

  return (
    <Dialog
      isOpen
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
      judul={ganti ? 'Ubah passphrase tanda tangan' : 'Tetapkan passphrase tanda tangan'}
      aksi={
        <>
          <Tombol onPress={onTutup}>Batal</Tombol>
          <Tombol varian="utama" memuat={memuat} onPress={() => void kirim()}>
            Tetapkan passphrase
          </Tombol>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p>
          Passphrase diminta setiap menandatangani surat. Passphrase tidak bisa dipulihkan: bila lupa, tetapkan lagi di sini dengan
          kata sandi akun Anda.
        </p>
        <TextField label="Kata sandi akun" type="password" value={kataSandi} onChange={setKataSandi} galat={galat.kataSandi} autoComplete="current-password" autoFocus />
        <TextField
          label="Passphrase baru"
          type="password"
          value={passphrase}
          onChange={setPassphrase}
          galat={galat.passphrase}
          keterangan="8-128 karakter, tidak boleh sama dengan kata sandi akun."
          autoComplete="new-password"
        />
        <TextField
          label="Ulangi passphrase"
          type="password"
          value={ulang}
          onChange={setUlang}
          galat={galat.ulang}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void kirim()
          }}
          autoComplete="new-password"
        />
      </div>
    </Dialog>
  )
}
