import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciKonsol, undangSekdes } from '@/api/konsol'
import { galatDariZod } from '@/domain/format/galat-isian'
import { undangSekdesSchema } from '@/domain/konsol/schema'
import { TextField } from '@/ui/isian/TextField'
import { Dialog } from '@/ui/lapisan/Dialog'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'

type Props = { desaId: string; namaDesa: string; onTutup: () => void }

/**
 * Undang Sekretaris Desa dari Konsol (tahap 6C) untuk desa yang belum punya: hanya peran itu yang bisa menambah pengguna desa
 * (SPEC §5.1). Di demo akunnya langsung aktif dengan kata sandi demo, sama dengan undangan di Pengaturan › Pengguna.
 */
export function DialogUndangSekdes({ desaId, namaDesa, onTutup }: Props) {
  const queryClient = useQueryClient()
  const [isian, setIsian] = useState({ nama: '', email: '' })
  const [galat, setGalat] = useState<Record<string, string>>({})
  const mengirim = useRef(false)
  const ubah = (kunci: 'nama' | 'email', nilai: string) => {
    setIsian((l) => ({ ...l, [kunci]: nilai }))
    setGalat((g) => ({ ...g, [kunci]: '' }))
  }
  const kirim = useMutation({
    mutationFn: () => undangSekdes(desaId, isian),
    onSuccess: async (hasil) => {
      tampilkanToast({ pesan: `Undangan terkirim ke ${hasil.email} (tiruan). Di demo, akunnya langsung aktif dengan kata sandi demo.`, nada: 'berhasil' })
      await queryClient.invalidateQueries({ queryKey: kunciKonsol.semua })
      onTutup()
    },
    onError: (e) => {
      if (e instanceof GalatApi && Object.keys(e.fields).length > 0) setGalat(e.fields)
      else tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' })
    },
    onSettled: () => {
      mengirim.current = false
    },
  })
  const tekan = () => {
    if (mengirim.current) return
    const hasil = undangSekdesSchema.safeParse(isian)
    if (!hasil.success) {
      setGalat(galatDariZod(hasil.error))
      return
    }
    mengirim.current = true
    kirim.mutate()
  }
  return (
    <Dialog
      isOpen
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
      judul="Undang Sekretaris Desa"
      subjudul={`Sekretaris Desa ${namaDesa} bisa menambah pengguna desanya sendiri. Undangan dikirim ke surelnya.`}
      aksi={
        <>
          <Tombol onPress={onTutup}>Batal</Tombol>
          <Tombol varian="utama" memuat={kirim.isPending} onPress={tekan}>
            Kirim undangan
          </Tombol>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField label="Nama" value={isian.nama} onChange={(v) => ubah('nama', v)} galat={galat.nama || undefined} isRequired />
        <TextField label="Email" type="email" value={isian.email} onChange={(v) => ubah('email', v)} galat={galat.email || undefined} isRequired />
      </div>
    </Dialog>
  )
}
