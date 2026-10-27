import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { kunciKonsol, tandaiLunas } from '@/api/konsol'
import { galatDariZod } from '@/domain/format/galat-isian'
import { formatRupiah } from '@/domain/format/angka'
import { lunasSchema, PESAN_DITERIMA_LEWAT, PESAN_DITERIMA_SEBELUM_TRANSFER, type BarisTagihanKonsol } from '@/domain/langganan/tagihan'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { DatePicker } from '@/ui/isian/DatePicker'
import { NumberField } from '@/ui/isian/NumberField'
import { Dialog } from '@/ui/lapisan/Dialog'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { tanganiGalatAksi } from './galat-aksi'

type Props = { tagihan: BarisTagihanKonsol; hariIni: string; onTutup: () => void }

/**
 * Tandai lunas (SPEC-V0.2 §10.4): tanggal diterima (bawaannya hari ini, tidak sesudah hari ini dan tidak sebelum tanggal transfer)
 * dan nominal diterima (bawaannya nominal yang ditransfer desa). Kwitansi terbit otomatis.
 */
export function DialogLunas({ tagihan: t, hariIni, onTutup }: Props) {
  const queryClient = useQueryClient()
  const [diterima, setDiterima] = useState<string | null>(hariIni)
  const [nominal, setNominal] = useState<number | null>(t.bukti?.nominalTransfer ?? t.nominal)
  const [galat, setGalat] = useState<Record<string, string>>({})
  const mengirim = useRef(false)
  const wadah = useRef<HTMLDivElement>(null)
  const tandai = (g: Record<string, string>) => {
    setGalat(g)
    fokusIsianSalah(wadah.current)
  }
  const batas = t.bukti?.tanggalTransfer
  const aksi = useMutation({
    mutationFn: () => tandaiLunas(t.id, { diterimaPada: diterima ?? '', nominalDiterima: nominal ?? 0 }),
    onSuccess: async () => {
      tampilkanToast({ pesan: 'Tagihan ditandai lunas. Kwitansi sudah terbit.', nada: 'berhasil' })
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
    const hasil = lunasSchema.safeParse({ diterimaPada: diterima ?? '', nominalDiterima: nominal ?? undefined })
    const g: Record<string, string> = hasil.success ? {} : galatDariZod(hasil.error)
    if (hasil.success && hasil.data.diterimaPada > hariIni) g.diterimaPada = PESAN_DITERIMA_LEWAT
    else if (hasil.success && batas && hasil.data.diterimaPada < batas) g.diterimaPada = PESAN_DITERIMA_SEBELUM_TRANSFER
    if (Object.keys(g).length > 0) {
      tandai(g)
      return
    }
    setGalat({})
    mengirim.current = true
    aksi.mutate()
  }
  const beda = nominal !== null && nominal > 0 && nominal !== t.nominal
  return (
    <Dialog
      isOpen
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
      judul="Tandai lunas"
      subjudul={`${t.nomor} · ${t.desa.nama}`}
      aksi={
        <>
          <Tombol onPress={onTutup}>Batal</Tombol>
          <Tombol varian="utama" memuat={aksi.isPending} onPress={tekan}>
            Tandai lunas
          </Tombol>
        </>
      }
    >
      <div ref={wadah} className="flex flex-col gap-4">
        <DatePicker
          label="Tanggal diterima"
          nilai={diterima}
          onUbah={(v) => {
            setDiterima(v)
            setGalat((g) => ({ ...g, diterimaPada: '' }))
          }}
          min={batas}
          maks={hariIni}
          galat={galat.diterimaPada || undefined}
          className="max-w-xs"
          isRequired
        />
        <NumberField
          label="Nominal diterima"
          nilai={nominal}
          onUbah={(v) => {
            setNominal(v)
            setGalat((g) => ({ ...g, nominalDiterima: '' }))
          }}
          min={0}
          satuan="Rupiah"
          galat={galat.nominalDiterima || undefined}
          className="max-w-xs"
          isRequired
        />
        {beda && <Banner nada="peringatan">{`Nominal diterima berbeda dengan tagihan (${formatRupiah(t.nominal)}). Periksa mutasi rekening dulu.`}</Banner>}
      </div>
    </Dialog>
  )
}
