import { ArrowLeft, ArrowRight, X } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciPengaturan, opsiPenomoran, simpanPenomoran } from '@/api/pengaturan'
import { kunciSesi } from '@/api/sesi'
import { galatDariZod } from '@/domain/format/galat-isian'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import {
  contohNomor, KEPING_NOMOR, LABEL_KEPING, pecahFormat, PEMISAH_NOMOR, periksaFormat, susunFormat, ubahPenomoranSchema,
  type KepingNomor, type PemisahNomor, type Penomoran as DataPenomoran,
} from '@/domain/pengaturan/penomoran'
import type { ModeUrutan } from '@/domain/surat/nomor-surat'
import { RadioGroup } from '@/ui/isian/RadioGroup'
import { Select } from '@/ui/isian/Select'
import { TextField } from '@/ui/isian/TextField'
import { BagianIsian, FormulirBagian } from '@/ui/tata-letak/FormulirBagian'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { KepalaPengaturan } from './TabPengaturan'

const LABEL_PEMISAH: Readonly<Record<PemisahNomor, string>> = { '/': 'Garis miring ( / )', '-': 'Strip ( - )', '.': 'Titik ( . )' }
const PILIHAN_URUTAN = [
  { id: 'per-tahun', label: 'Satu urutan per tahun untuk semua surat, seperti Buku Agenda' },
  { id: 'per-jenis', label: 'Urutan sendiri untuk setiap jenis surat' },
]

type FormNomor = { keping: KepingNomor[]; pemisah: PemisahNomor; urutan: ModeUrutan; kodeSurat: string }
type Props = { onKotor?: (kotor: boolean) => void; sekarang?: Date }

/** Formulir dari data tersimpan. Format yang tidak tersusun dari potongan dimulai lagi dari format bawaan. */
function formDari(p: DataPenomoran): { form: FormNomor; dikenali: boolean } {
  const susunan = pecahFormat(p.formatNomor)
  return {
    form: { keping: susunan?.keping ?? [...KEPING_NOMOR], pemisah: susunan?.pemisah ?? '/', urutan: p.urutan, kodeSurat: p.kodeSurat },
    dikenali: susunan !== null,
  }
}

/** Pengaturan › Penomoran (SPEC §7.2): format dari potongan, dengan pratinjau nomor berikutnya. */
export function Penomoran({ onKotor, sekarang }: Props) {
  const kueri = useQuery(opsiPenomoran())
  return (
    <div className="flex flex-col gap-6">
      <KepalaPengaturan aktif="penomoran" />
      {kueri.isPending ? (
        <BarisKerangka jumlah={6} label="Memuat penomoran surat…" />
      ) : kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : (
        <FormPenomoran data={kueri.data} onKotor={onKotor} sekarang={sekarang} />
      )}
    </div>
  )
}

function FormPenomoran({ data, onKotor, sekarang }: Props & { data: DataPenomoran }) {
  const queryClient = useQueryClient()
  const awal = useMemo(() => formDari(data), [data])
  const [form, setForm] = useState<FormNomor>(awal.form)
  const [galatKode, setGalatKode] = useState<string | null>(null)
  const mengirim = useRef(false)
  const kotor = JSON.stringify(form) !== JSON.stringify(awal.form)

  useEffect(() => {
    onKotor?.(kotor)
  }, [kotor, onKotor])

  const formatNomor = susunFormat(form.keping, form.pemisah)
  const galatFormat = periksaFormat(form.keping, form.urutan)
  const pratinjau = galatFormat
    ? null
    : contohNomor({ formatNomor, urutan: form.urutan, kodeSurat: form.kodeSurat || '…' }, data.contoh, tanggalIsoWib(sekarang ?? new Date()))
  const sisa = KEPING_NOMOR.filter((k) => !form.keping.includes(k))

  const geser = (i: number, arah: -1 | 1) =>
    setForm((l) => {
      const keping = [...l.keping]
      ;[keping[i], keping[i + arah]] = [keping[i + arah], keping[i]]
      return { ...l, keping }
    })
  const hapus = (i: number) => setForm((l) => ({ ...l, keping: l.keping.filter((_, x) => x !== i) }))
  const tambah = (id: string | null) => {
    const k = KEPING_NOMOR.find((x) => x === id)
    if (k) setForm((l) => ({ ...l, keping: [...l.keping, k] }))
  }

  const simpan = useMutation({
    mutationFn: () => simpanPenomoran({ formatNomor, urutan: form.urutan, kodeSurat: form.kodeSurat }),
    onSuccess: (baru) => {
      queryClient.setQueryData(kunciPengaturan.penomoran, baru)
      setForm(formDari(baru).form)
      // Kode desa di nomor surat disimpan di data desa.
      void queryClient.invalidateQueries({ queryKey: kunciSesi })
      tampilkanToast({ pesan: 'Penomoran surat disimpan.', nada: 'berhasil' })
    },
    onError: (e) => {
      if (e instanceof GalatApi && e.fields.kodeSurat) {
        setGalatKode(e.fields.kodeSurat)
        return
      }
      tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' })
    },
    onSettled: () => {
      mengirim.current = false
    },
  })
  const kirim = () => {
    if (mengirim.current || galatFormat) return
    const hasil = ubahPenomoranSchema.safeParse({ formatNomor, urutan: form.urutan, kodeSurat: form.kodeSurat })
    if (!hasil.success) {
      setGalatKode(galatDariZod(hasil.error).kodeSurat ?? null)
      return
    }
    mengirim.current = true
    simpan.mutate()
  }

  return (
    <FormulirBagian
      label="Penomoran surat"
      bagian={[
        { id: 'nomor-susunan', judul: 'Susunan nomor' },
        { id: 'nomor-urutan', judul: 'Urutan nomor' },
      ]}
      aksi={
        <>
          <Tombol
            isDisabled={!kotor || simpan.isPending}
            onPress={() => {
              setForm(awal.form)
              setGalatKode(null)
            }}
          >
            Batalkan perubahan
          </Tombol>
          <Tombol varian="utama" memuat={simpan.isPending} onPress={kirim}>
            Simpan
          </Tombol>
        </>
      }
    >
      {!awal.dikenali && (
        <Banner nada="peringatan">
          Format tersimpan ({data.formatNomor}) tidak tersusun dari potongan. Susunan di bawah dimulai dari format bawaan.
        </Banner>
      )}
      <BagianIsian id="nomor-susunan" nomor={1} judul="Susunan nomor">
        <div className="flex flex-col gap-5 sm:col-span-2">
          <ol aria-label="Potongan nomor surat" className="flex flex-wrap items-center gap-2">
            {form.keping.map((k, i) => (
              <li key={k} className="flex items-center gap-2">
                {i > 0 && (
                  <span aria-hidden className="font-mono text-tinta-2">
                    {form.pemisah}
                  </span>
                )}
                <span className="flex items-center gap-0.5 rounded-1 border border-garis-input bg-lembar py-0.5 pr-0.5 pl-3 text-teks-kecil">
                  <span className="mr-1 font-medium">{LABEL_KEPING[k]}</span>
                  <Tombol varian="teks" ukuran="kecil" aria-label={`Geser ${LABEL_KEPING[k]} ke kiri`} isDisabled={i === 0} onPress={() => geser(i, -1)}>
                    <ArrowLeft aria-hidden size={14} />
                  </Tombol>
                  <Tombol
                    varian="teks"
                    ukuran="kecil"
                    aria-label={`Geser ${LABEL_KEPING[k]} ke kanan`}
                    isDisabled={i === form.keping.length - 1}
                    onPress={() => geser(i, 1)}
                  >
                    <ArrowRight aria-hidden size={14} />
                  </Tombol>
                  <Tombol varian="teks" ukuran="kecil" aria-label={`Hapus potongan ${LABEL_KEPING[k]}`} onPress={() => hapus(i)}>
                    <X aria-hidden size={14} />
                  </Tombol>
                </span>
              </li>
            ))}
          </ol>
          {sisa.length > 0 && (
            <Select
              label="Tambah potongan"
              placeholder="Pilih potongan…"
              pilihan={sisa.map((k) => ({ id: k, label: LABEL_KEPING[k] }))}
              nilai={null}
              onUbah={tambah}
              className="max-w-xs"
            />
          )}
          <RadioGroup
            label="Pemisah"
            arah="mendatar"
            pilihan={PEMISAH_NOMOR.map((p) => ({ id: p, label: LABEL_PEMISAH[p] }))}
            nilai={form.pemisah}
            onUbah={(id) => {
              const p = PEMISAH_NOMOR.find((x) => x === id)
              if (p) setForm((l) => ({ ...l, pemisah: p }))
            }}
          />
          <TextField
            label="Kode desa di nomor surat"
            value={form.kodeSurat}
            onChange={(v) => {
              setForm((l) => ({ ...l, kodeSurat: v.toUpperCase() }))
              setGalatKode(null)
            }}
            galat={galatKode ?? undefined}
            keterangan="1–8 huruf atau angka, mis. SS. Juga dipakai di awal kode verifikasi surat."
            className="max-w-xs"
          />
          <div className="rounded-2 border border-garis bg-kertas-2 px-4 py-3">
            <p className="text-label font-medium text-tinta-2 uppercase">Nomor berikutnya</p>
            {pratinjau ? (
              <>
                <output aria-label="Nomor berikutnya" className="mt-1 block font-mono text-judul-bagian">
                  {pratinjau}
                </output>
                <p className="mt-1 text-teks-kecil text-tinta-2">Contoh untuk {data.contoh.jenis} yang ditandatangani hari ini.</p>
              </>
            ) : (
              <p role="alert" className="mt-1 text-merah">
                {galatFormat}
              </p>
            )}
          </div>
        </div>
      </BagianIsian>
      <BagianIsian id="nomor-urutan" nomor={2} judul="Urutan nomor">
        <RadioGroup
          label="Nomor urut dihitung"
          arah="menurun"
          pilihan={PILIHAN_URUTAN}
          nilai={form.urutan}
          onUbah={(id) => setForm((l) => ({ ...l, urutan: id === 'per-jenis' ? 'per-jenis' : 'per-tahun' }))}
          className="sm:col-span-2"
        />
        <p className="text-teks-kecil text-tinta-2 sm:col-span-2">
          Perubahan berlaku untuk surat yang ditandatangani sesudah disimpan. Nomor surat yang sudah terbit tidak berubah.
        </p>
      </BagianIsian>
    </FormulirBagian>
  )
}
