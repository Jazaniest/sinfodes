import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { opsiKeluarga } from '@/api/keluarga'
import { catatPindah } from '@/api/mutasi'
import { segarkanKependudukan } from '@/api/segarkan'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { ALASAN_PINDAH } from '@/domain/mutasi/enum'
import type { Penduduk } from '@/domain/penduduk/schema'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { DatePicker } from '@/ui/isian/DatePicker'
import { RadioGroup } from '@/ui/isian/RadioGroup'
import { Select } from '@/ui/isian/Select'
import { TextArea } from '@/ui/isian/TextArea'
import { TextField } from '@/ui/isian/TextField'
import { BagianIsian, FormulirBagian } from '@/ui/tata-letak/FormulirBagian'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { PilihPenduduk } from '../../penduduk/PilihPenduduk'
import { terapkanGalatServer } from './galat'
import { buatSkemaPindah, isianPindahAwal, keMasukanPindah, type IsianPindah } from './isian'
import { usePengganti } from './pengganti'

const BAGIAN = [
  { id: 'siapa', judul: 'Yang pindah' },
  { id: 'tujuan', judul: 'Alamat tujuan' },
  { id: 'alasan', judul: 'Alasan dan tanggal' },
] as const
const PETA_GALAT: Readonly<Record<string, keyof IsianPindah>> = {
  pendudukIds: 'penduduk', penggantiKepalaId: 'penggantiKepalaId', tanggal: 'tanggal', alasan: 'alasan',
  'tujuan.provinsi': 'provinsi', 'tujuan.kabupaten': 'kabupaten', 'tujuan.kecamatan': 'kecamatan', 'tujuan.desa': 'desa',
}
const KOLOM_TUJUAN = [
  { name: 'provinsi', label: 'Provinsi' },
  { name: 'kabupaten', label: 'Kabupaten/kota' },
  { name: 'kecamatan', label: 'Kecamatan' },
  { name: 'desa', label: 'Desa/kelurahan' },
] as const

type Props = {
  pendudukAwal: Penduduk | null
  onTersimpan: (orang: Penduduk[]) => void
  onBatal: () => void
  onKotor?: (kotor: boolean) => void
  sekarang?: Date
}

/** Alur Pindah keluar (SPEC §6.6): satu orang atau seluruh anggota KK. */
export function CatatPindah({ pendudukAwal, onTersimpan, onBatal, onKotor, sekarang }: Props) {
  const hariIni = useMemo(() => sekarang ?? new Date(), [sekarang])
  const queryClient = useQueryClient()
  const formRef = useRef<HTMLFormElement>(null)
  const [skema] = useState(() => buatSkemaPindah(hariIni))
  const { control, handleSubmit, setValue, setError, formState } = useForm<IsianPindah>({
    resolver: zodResolver(skema),
    defaultValues: isianPindahAwal(pendudukAwal, hariIni),
    mode: 'onTouched',
  })
  const [penduduk, cakupan] = useWatch({ control, name: ['penduduk', 'cakupan'] })
  const kk = useQuery({ ...opsiKeluarga(penduduk?.keluargaId ?? ''), enabled: penduduk !== null })
  const anggotaKk = penduduk ? (kk.data?.anggota ?? []) : []
  const keluarIds = !penduduk ? [] : cakupan === 'kk' ? anggotaKk.map((a) => a.id) : [penduduk.id]
  const pengganti = usePengganti(penduduk?.keluargaId ?? null, keluarIds)

  useEffect(() => {
    onKotor?.(formState.isDirty)
  }, [formState.isDirty, onKotor])

  const simpan = useMutation({
    mutationFn: (isi: IsianPindah) => catatPindah(keMasukanPindah(isi, keluarIds, pengganti.wajib)),
    onSuccess: (hasil) => {
      const [pertama] = hasil.penduduk
      void segarkanKependudukan(queryClient)
      tampilkanToast({
        pesan: hasil.penduduk.length > 1 ? `Kepindahan ${hasil.penduduk.length} orang dicatat.` : `Kepindahan ${pertama.nama} dicatat.`,
        nada: 'berhasil',
      })
      onTersimpan(hasil.penduduk)
    },
    onError: (galat) => terapkanGalatServer(galat, (f) => PETA_GALAT[f] ?? null, setError, formRef.current),
  })
  const ajukan = (e: FormEvent<HTMLFormElement>) =>
    handleSubmit(
      (isi) => {
        if (keluarIds.length === 0) {
          tampilkanToast({ pesan: 'Data KK masih dimuat. Coba lagi sebentar.', nada: 'info' })
          return
        }
        if (pengganti.wajib && isi.penggantiKepalaId === '') {
          setError('penggantiKepalaId', { type: 'manual', message: 'Pilih kepala keluarga pengganti' })
          fokusIsianSalah(formRef.current)
          return
        }
        simpan.mutate(isi)
      },
      () => fokusIsianSalah(formRef.current),
    )(e)

  return (
    <form ref={formRef} noValidate aria-label="Catat pindah keluar" onSubmit={(e) => void ajukan(e)}>
      <FormulirBagian
        label="Formulir pindah keluar"
        bagian={BAGIAN}
        aksi={
          <>
            <Tombol onPress={onBatal}>Batal</Tombol>
            <Tombol type="submit" varian="utama" memuat={simpan.isPending}>
              Simpan
            </Tombol>
          </>
        }
      >
        <BagianIsian id="siapa" nomor={1} judul="Yang pindah">
          <Controller
            control={control}
            name="penduduk"
            render={({ field, fieldState }) => (
              <PilihPenduduk
                label="Penduduk"
                terpilih={field.value}
                onPilih={(p) => {
                  field.onChange(p)
                  setValue('cakupan', 'orang')
                  setValue('penggantiKepalaId', '')
                }}
                hariIni={hariIni}
                galat={fieldState.error?.message}
                className="sm:col-span-2"
              />
            )}
          />
          {penduduk && anggotaKk.length > 1 && (
            <Controller
              control={control}
              name="cakupan"
              render={({ field }) => (
                <RadioGroup
                  label="Yang pindah"
                  arah="menurun"
                  className="sm:col-span-2"
                  pilihan={[
                    { id: 'orang', label: `${penduduk.nama} saja` },
                    { id: 'kk', label: `Seluruh anggota KK (${anggotaKk.length} orang)` },
                  ]}
                  nilai={field.value}
                  onUbah={(id) => field.onChange(id === 'kk' ? 'kk' : 'orang')}
                />
              )}
            />
          )}
          {pengganti.wajib && penduduk && (
            <Controller
              control={control}
              name="penggantiKepalaId"
              render={({ field, fieldState }) => (
                <RadioGroup
                  label="Kepala keluarga pengganti"
                  arah="menurun"
                  className="sm:col-span-2"
                  pilihan={pengganti.calon.map((a) => ({ id: a.id, label: `${a.nama} · ${a.hubunganKeluarga}` }))}
                  nilai={field.value || null}
                  onUbah={field.onChange}
                  keterangan={`${penduduk.nama} adalah kepala keluarga. Pilih penggantinya dari anggota yang tetap tinggal.`}
                  galat={fieldState.error?.message}
                />
              )}
            />
          )}
        </BagianIsian>

        <BagianIsian id="tujuan" nomor={2} judul="Alamat tujuan">
          {KOLOM_TUJUAN.map((k) => (
            <Controller
              key={k.name}
              control={control}
              name={k.name}
              render={({ field, fieldState }) => (
                <TextField label={k.label} value={field.value} onChange={field.onChange} onBlur={field.onBlur} galat={fieldState.error?.message} />
              )}
            />
          ))}
          <Controller
            control={control}
            name="alamat"
            render={({ field }) => (
              <TextArea
                label="Alamat"
                value={field.value}
                onChange={field.onChange}
                keterangan="Nama jalan, nomor rumah, dan RT/RW di tempat tujuan."
                className="sm:col-span-2"
              />
            )}
          />
        </BagianIsian>

        <BagianIsian id="alasan" nomor={3} judul="Alasan dan tanggal">
          <Controller
            control={control}
            name="alasan"
            render={({ field, fieldState }) => (
              <Select
                label="Alasan pindah"
                pilihan={ALASAN_PINDAH.map((a) => ({ id: a, label: a }))}
                nilai={field.value || null}
                onUbah={(id) => field.onChange(id ?? '')}
                galat={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="tanggal"
            render={({ field, fieldState }) => (
              <DatePicker
                label="Tanggal pindah"
                nilai={field.value || null}
                onUbah={(v) => field.onChange(v ?? '')}
                maks={tanggalIsoWib(hariIni)}
                galat={fieldState.error?.message}
              />
            )}
          />
        </BagianIsian>
      </FormulirBagian>
    </form>
  )
}
