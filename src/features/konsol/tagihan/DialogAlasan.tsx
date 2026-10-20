import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { kunciKonsol } from '@/api/konsol'
import { galatDariZod } from '@/domain/format/galat-isian'
import { alasanSchema, type IsianAlasan } from '@/domain/langganan/tagihan'
import { TextArea } from '@/ui/isian/TextArea'
import { Dialog } from '@/ui/lapisan/Dialog'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { tanganiGalatAksi } from './galat-aksi'

type Props = {
  judul: string
  subjudul?: string
  /** Label tombol kirim, juga nama aksesibelnya. */
  labelAksi: string
  keterangan?: string
  pesanSukses: string
  kirim: (isian: IsianAlasan) => Promise<unknown>
  onTutup: () => void
}

/** Dialog dengan satu alasan wajib 10-300 karakter: dipakai Tolak bukti dan Batalkan tagihan (rencana 7D-2 keputusan 4, 5). */
export function DialogAlasan({ judul, subjudul, labelAksi, keterangan, pesanSukses, kirim, onTutup }: Props) {
  const queryClient = useQueryClient()
  const [alasan, setAlasan] = useState('')
  const [galat, setGalat] = useState<Record<string, string>>({})
  const mengirim = useRef(false)
  const wadah = useRef<HTMLDivElement>(null)
  const tandai = (g: Record<string, string>) => {
    setGalat(g)
    fokusIsianSalah(wadah.current)
  }
  const aksi = useMutation({
    mutationFn: (isian: IsianAlasan) => kirim(isian),
    onSuccess: async () => {
      tampilkanToast({ pesan: pesanSukses, nada: 'berhasil' })
      await queryClient.invalidateQueries({ queryKey: kunciKonsol.semua })
      onTutup()
    },
    onError: (e) => tanganiGalatAksi(e, { queryClient, tandai, onTutup }),
    onSettled: () => {
      mengirim.current = false
    },
  })
  const tekan = () => {
    if (mengirim.current) return
    const hasil = alasanSchema.safeParse({ alasan })
    if (!hasil.success) {
      tandai(galatDariZod(hasil.error))
      return
    }
    mengirim.current = true
    aksi.mutate(hasil.data)
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
          <Tombol varian="utama" memuat={aksi.isPending} onPress={tekan}>
            {labelAksi}
          </Tombol>
        </>
      }
    >
      <div ref={wadah}>
        <TextArea
          label="Alasan"
          value={alasan}
          onChange={(v) => {
            setAlasan(v)
            setGalat({})
          }}
          keterangan={keterangan}
          galat={galat.alasan || undefined}
          baris={4}
          isRequired
        />
      </div>
    </Dialog>
  )
}
