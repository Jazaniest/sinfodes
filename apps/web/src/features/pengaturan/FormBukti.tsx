import { Paperclip } from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type FormEvent } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kirimBukti, kunciLangganan } from '@/api/langganan'
import { formatUkuranKb } from '@/domain/format/angka'
import { galatDariZod } from '@/domain/format/galat-isian'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { galatBerkasBukti, MAKS_BUKTI_MB, PESAN_BUKTI_WAJIB, PESAN_JENIS_BUKTI, PESAN_UKURAN_BUKTI, peringatanNominal } from '@/domain/langganan/schema'
import { isianBuktiSchema, type Tagihan } from '@/domain/langganan/tagihan'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { DatePicker } from '@/ui/isian/DatePicker'
import { FileDrop } from '@/ui/isian/FileDrop'
import { gayaGalat } from '@/ui/isian/gaya'
import { NumberField } from '@/ui/isian/NumberField'
import { TextField } from '@/ui/isian/TextField'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'

const TERIMA = ['.png', '.jpg', '.jpeg', '.webp', '.pdf'] as const
const ukuranKb = (b: File) => Math.max(1, Math.ceil(b.size / 1024))

/**
 * Unggah bukti transfer untuk satu tagihan `terbit` (SPEC-V0.2 §10): berkas gambar atau PDF, tanggal transfer, nama rekening
 * pengirim, dan nominal yang ditransfer (bawaannya nominal tagihan).
 */
export function FormBukti({ tagihan }: { tagihan: Tagihan }) {
  const queryClient = useQueryClient()
  const [berkas, setBerkas] = useState<File | null>(null)
  const [tanggal, setTanggal] = useState<string | null>(null)
  const [pengirim, setPengirim] = useState('')
  const [nominal, setNominal] = useState<number | null>(tagihan.nominal)
  const [galat, setGalat] = useState<Record<string, string>>({})
  const wadah = useRef<HTMLFormElement>(null)
  const tandai = (g: Record<string, string>) => {
    setGalat(g)
    fokusIsianSalah(wadah.current)
  }
  const hapusGalat = (kunci: string) => setGalat((g) => ({ ...g, [kunci]: '' }))

  const kirim = useMutation({
    mutationFn: () => kirimBukti(tagihan.id, { tanggalTransfer: tanggal ?? '', namaPengirim: pengirim, nominalTransfer: nominal ?? 0 }, berkas),
    onSuccess: async () => {
      tampilkanToast({ pesan: 'Bukti terkirim. Tim Sinfodes akan memeriksanya.', nada: 'berhasil' })
      await queryClient.invalidateQueries({ queryKey: kunciLangganan })
    },
    onError: async (e) => {
      if (e instanceof GalatApi && e.status === 409) {
        // Tagihan sudah berubah (mis. dikirim dari tab lain): tampilkan pesan server dan muat ulang statusnya.
        tampilkanToast({ pesan: e.message, nada: 'galat' })
        await queryClient.invalidateQueries({ queryKey: kunciLangganan })
      } else if (e instanceof GalatApi && Object.keys(e.fields).length > 0) tandai(e.fields)
      else setGalat({ _: pesanGalat(e) })
    },
  })

  const periksa = (e: FormEvent) => {
    e.preventDefault()
    if (kirim.isPending) return
    const hasil = isianBuktiSchema.safeParse({ tanggalTransfer: tanggal ?? '', namaPengirim: pengirim, nominalTransfer: nominal ?? undefined })
    const g: Record<string, string> = hasil.success ? {} : galatDariZod(hasil.error)
    if (hasil.success && hasil.data.tanggalTransfer > tanggalIsoWib(new Date())) g.tanggalTransfer = 'Tanggal transfer tidak boleh sesudah hari ini.'
    if (!berkas) g.bukti = PESAN_BUKTI_WAJIB
    else {
      const galatBerkas = galatBerkasBukti(berkas)
      if (galatBerkas) g.bukti = galatBerkas
    }
    if (Object.keys(g).length > 0) {
      tandai(g)
      return
    }
    setGalat({})
    kirim.mutate()
  }

  const beda = nominal !== null && nominal > 0 && nominal !== tagihan.nominal
  return (
    <form ref={wadah} onSubmit={periksa} noValidate aria-label="Unggah bukti transfer" className="flex max-w-xl flex-col gap-5">
      {galat._ && <Banner nada="galat">{galat._}</Banner>}
      <div className="flex flex-col gap-1.5">
        {berkas ? (
          <div className="flex items-center gap-3 rounded-1 border border-garis bg-lembar px-3 py-2">
            <Paperclip aria-hidden size={18} className="shrink-0 text-tinta-2" />
            <span className="min-w-0 flex-1 truncate">{`${berkas.name} · ${formatUkuranKb(ukuranKb(berkas))}`}</span>
            <Tombol varian="teks" ukuran="kecil" onPress={() => setBerkas(null)}>
              Ganti berkas
            </Tombol>
          </div>
        ) : (
          <FileDrop
            label="Bukti transfer"
            terima={TERIMA}
            maksMb={MAKS_BUKTI_MB}
            pesan={{ jenis: PESAN_JENIS_BUKTI, ukuran: PESAN_UKURAN_BUKTI }}
            keterangan={`Gambar (PNG, JPG, WebP) atau PDF, paling besar ${MAKS_BUKTI_MB} MB.`}
            onPilih={(b) => {
              setBerkas(b)
              hapusGalat('bukti')
            }}
          />
        )}
        {galat.bukti && (
          <p role="alert" className={gayaGalat}>
            {galat.bukti}
          </p>
        )}
      </div>
      <DatePicker
        label="Tanggal transfer"
        nilai={tanggal}
        onUbah={(t) => {
          setTanggal(t)
          hapusGalat('tanggalTransfer')
        }}
        maks={tanggalIsoWib(new Date())}
        galat={galat.tanggalTransfer || undefined}
        className="max-w-xs"
        isRequired
      />
      <TextField
        label="Nama rekening pengirim"
        value={pengirim}
        onChange={(v) => {
          setPengirim(v)
          hapusGalat('namaPengirim')
        }}
        galat={galat.namaPengirim || undefined}
        isRequired
      />
      <div className="flex flex-col gap-1.5">
        <NumberField
          label="Nominal yang ditransfer"
          nilai={nominal}
          onUbah={(n) => {
            setNominal(n)
            hapusGalat('nominalTransfer')
          }}
          min={0}
          satuan="Rupiah"
          galat={galat.nominalTransfer || undefined}
          className="max-w-xs"
          isRequired
        />
        {beda && (
          <p role="status" className="text-teks-kecil text-oker">
            {peringatanNominal(nominal, tagihan.nominal)}
          </p>
        )}
      </div>
      <div>
        <Tombol type="submit" varian="utama" memuat={kirim.isPending}>
          Kirim bukti
        </Tombol>
      </div>
    </form>
  )
}
