import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciNotifikasi } from '@/api/notifikasi'
import { kunciTenggatDesa, tandaiDikirim } from '@/api/tenggat'
import { formatTanggal } from '@/domain/format/tanggal'
import type { ButirTenggatDesa } from '@/domain/kabupaten/tenggat'
import { DatePicker } from '@/ui/isian/DatePicker'
import { Dialog } from '@/ui/lapisan/Dialog'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'

type Props = { tenggat: ButirTenggatDesa; kabupaten: string; hariIni: string; onTutup: () => void }

/** Tandai laporan sudah dikirim ke kabupaten (SPEC-V0.2 §8.3 butir 4): tanggal kirimnya, bawaan hari ini. */
export function DialogTandaiDikirim({ tenggat, kabupaten, hariIni, onTutup }: Props) {
  const queryClient = useQueryClient()
  const [tanggal, setTanggal] = useState<string | null>(hariIni)
  const [galat, setGalat] = useState<string | undefined>()
  const mengirim = useRef(false)
  const kirim = useMutation({
    mutationFn: (t: string) => tandaiDikirim(tenggat.id, t),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: kunciTenggatDesa })
      void queryClient.invalidateQueries({ queryKey: ['beranda'] })
      void queryClient.invalidateQueries({ queryKey: kunciNotifikasi })
      tampilkanToast({ pesan: 'Ditandai sudah dikirim ke kabupaten.', nada: 'berhasil' })
      onTutup()
    },
    onError: (e) => {
      if (e instanceof GalatApi && e.fields.tanggal) setGalat(e.fields.tanggal)
      else tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' })
    },
    onSettled: () => {
      mengirim.current = false
    },
  })
  const tekan = () => {
    if (mengirim.current) return
    if (tanggal === null) {
      setGalat('Pilih tanggal dikirim')
      return
    }
    mengirim.current = true
    kirim.mutate(tanggal)
  }
  return (
    <Dialog
      isOpen
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
      judul="Tandai sudah dikirim"
      subjudul={`${tenggat.nama} · tenggat ${formatTanggal(tenggat.tanggal)}`}
      aksi={
        <>
          <Tombol onPress={onTutup}>Batal</Tombol>
          <Tombol varian="utama" memuat={kirim.isPending} onPress={tekan}>
            Simpan
          </Tombol>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-tinta-2">{`Kabupaten ${kabupaten} melihat tanggal ini di dasbornya.`}</p>
        <DatePicker
          label="Tanggal dikirim"
          nilai={tanggal}
          onUbah={(v) => {
            setTanggal(v)
            setGalat(undefined)
          }}
          maks={hariIni}
          galat={galat}
          isRequired
        />
      </div>
    </Dialog>
  )
}
