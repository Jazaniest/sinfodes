import { useState } from 'react'
import { useSesiAdmin } from '../../admin/sesi-konteks'
import { Dialog } from '@/ui/lapisan/Dialog'
import { TextArea } from '@/ui/isian/TextArea'
import { Tombol } from '@/ui/tombol/Tombol'
import { useDrafSitus } from './useDrafSitus'

type Props = {
  isOpen: boolean
  onOpenChange: (buka: boolean) => void
  onTerbit: () => void
}

const MAKS_CATATAN = 200

/** Dialog Terbitkan (keputusan 5): catatan opsional 0-200 karakter dan ringkasan yang akan berubah. */
export function DialogTerbitkan({ isOpen, onOpenChange, onTerbit }: Props) {
  const { desa } = useSesiAdmin()
  const { terbitkan } = useDrafSitus()
  const [catatan, setCatatan] = useState('')
  const [memuat, setMemuat] = useState(false)

  const tutup = () => {
    setCatatan('')
    onOpenChange(false)
  }
  const setuju = () => {
    if (memuat) return
    setMemuat(true)
    void terbitkan(catatan.trim() === '' ? null : catatan.trim())
      .then(() => {
        tutup()
        onTerbit()
      })
      .finally(() => setMemuat(false))
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(buka) => {
        if (!buka && !memuat) tutup()
      }}
      judul="Terbitkan website?"
      aksi={
        <>
          <Tombol onPress={tutup} isDisabled={memuat}>
            Batal
          </Tombol>
          <Tombol varian="utama" memuat={memuat} onPress={setuju}>
            Terbitkan
          </Tombol>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p>Website Desa {desa.nama} akan berubah sesuai draf.</p>
        <TextArea
          label="Catatan terbitan"
          value={catatan}
          onChange={setCatatan}
          baris={2}
          keterangan={`Opsional, paling banyak ${MAKS_CATATAN} karakter. Terbaca di Riwayat.`}
        />
      </div>
    </Dialog>
  )
}
