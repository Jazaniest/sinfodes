import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciKonsol, ubahAlamatDesa } from '@/api/konsol'
import { DOMAIN_INDUK } from '@/app/alamat'
import { galatDariZod } from '@/domain/format/galat-isian'
import { ubahAlamatSchema } from '@/domain/konsol/schema'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { TextField } from '@/ui/isian/TextField'
import { Dialog } from '@/ui/lapisan/Dialog'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { StatusAlamat } from './StatusAlamat'

type Props = { desaId: string; alamatSekarang: string; onTutup: () => void }

/**
 * Ubah alamat website desa dari Konsol (SPEC-V0.2 §4.2). Alamat lama disimpan sebagai alias selamanya, jadi tautan dan QR pada
 * surat lama tetap sampai ke desa ini.
 */
export function DialogUbahAlamat({ desaId, alamatSekarang, onTutup }: Props) {
  const queryClient = useQueryClient()
  const [alamat, setAlamat] = useState('')
  const [galat, setGalat] = useState<Record<string, string>>({})
  const mengirim = useRef(false)
  const wadah = useRef<HTMLDivElement>(null)
  const tandai = (g: Record<string, string>) => {
    setGalat(g)
    fokusIsianSalah(wadah.current)
  }
  const kirim = useMutation({
    mutationFn: (isian: { alamat: string }) => ubahAlamatDesa(desaId, isian.alamat),
    onSuccess: async (hasil) => {
      tampilkanToast({ pesan: `Alamat desa diubah menjadi ${hasil.slug}.`, nada: 'berhasil' })
      await queryClient.invalidateQueries({ queryKey: kunciKonsol.semua })
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
    const hasil = ubahAlamatSchema.safeParse({ alamat })
    if (!hasil.success) {
      tandai(galatDariZod(hasil.error))
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
      judul="Ubah alamat desa"
      subjudul={`Alamat lama ${alamatSekarang} tetap mengarah ke desa ini dan tidak bisa dipakai desa lain. QR pada surat lama tetap berlaku.`}
      aksi={
        <>
          <Tombol onPress={onTutup}>Batal</Tombol>
          <Tombol varian="utama" memuat={kirim.isPending} onPress={tekan}>
            Simpan alamat baru
          </Tombol>
        </>
      }
    >
      <div ref={wadah} className="flex flex-col gap-1.5">
        <TextField
          label="Alamat baru"
          value={alamat}
          onChange={(v) => {
            setAlamat(v)
            setGalat({})
          }}
          inputClassName="font-mono"
          galat={galat.alamat || undefined}
          isRequired
        />
        <p className="text-teks-kecil text-tinta-2">
          Alamat lengkap: <span className="font-mono">{alamat.trim().toLowerCase() || alamatSekarang}</span>
          <span className="font-mono">.{DOMAIN_INDUK}</span>
        </p>
        <StatusAlamat label={alamat} desaId={desaId} />
      </div>
    </Dialog>
  )
}
