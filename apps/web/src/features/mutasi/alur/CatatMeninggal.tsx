import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { catatMeninggal } from '@/api/mutasi'
import { segarkanKependudukan } from '@/api/segarkan'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { SEBAB_KEMATIAN, YANG_MENERANGKAN_KEMATIAN } from '@/domain/mutasi/enum'
import type { Penduduk } from '@/domain/penduduk/schema'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { DatePicker } from '@/ui/isian/DatePicker'
import { RadioGroup } from '@/ui/isian/RadioGroup'
import { Select } from '@/ui/isian/Select'
import { TextField } from '@/ui/isian/TextField'
import { TimeField } from '@/ui/isian/TimeField'
import { BagianIsian, FormulirBagian } from '@/ui/tata-letak/FormulirBagian'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { PilihPenduduk } from '../../penduduk/PilihPenduduk'
import { terapkanGalatServer } from './galat'
import { buatSkemaMeninggal, isianMeninggalAwal, keMasukanMeninggal, type IsianMeninggal } from './isian'
import { usePengganti } from './pengganti'
import { useKunciKirim } from '../kunci-kirim'

const BAGIAN = [
  { id: 'penduduk', judul: 'Penduduk' },
  { id: 'kejadian', judul: 'Kejadian' },
  { id: 'pelapor', judul: 'Pelapor' },
] as const
const opsi = (nilai: readonly string[]) => nilai.map((n) => ({ id: n, label: n }))
const PETA_GALAT: Readonly<Record<string, keyof IsianMeninggal>> = {
  pendudukId: 'penduduk', penggantiKepalaId: 'penggantiKepalaId', tanggal: 'tanggal', jam: 'jam', tempat: 'tempat', pelapor: 'pelapor',
}

type Props = {
  pendudukAwal: Penduduk | null
  onTersimpan: (p: Penduduk) => void
  onBatal: () => void
  onKotor?: (kotor: boolean) => void
  sekarang?: Date
}

/** Alur Meninggal (SPEC §6.6). Data tidak dihapus; status menjadi Meninggal dan keluar dari KK. */
export function CatatMeninggal({ pendudukAwal, onTersimpan, onBatal, onKotor, sekarang }: Props) {
  const hariIni = useMemo(() => sekarang ?? new Date(), [sekarang])
  const queryClient = useQueryClient()
  const formRef = useRef<HTMLFormElement>(null)
  const [skema] = useState(() => buatSkemaMeninggal(hariIni))
  const { control, handleSubmit, setValue, setError, formState } = useForm<IsianMeninggal>({
    resolver: zodResolver(skema),
    defaultValues: isianMeninggalAwal(pendudukAwal, hariIni),
    mode: 'onTouched',
  })
  const penduduk = useWatch({ control, name: 'penduduk' })
  const pengganti = usePengganti(penduduk?.keluargaId ?? null, penduduk ? [penduduk.id] : [])

  useEffect(() => {
    onKotor?.(formState.isDirty)
  }, [formState.isDirty, onKotor])

  const kunciUntuk = useKunciKirim()
  const simpan = useMutation({
    mutationFn: (isi: IsianMeninggal) => {
      const masukan = keMasukanMeninggal(isi, pengganti.wajib)
      return catatMeninggal(masukan, kunciUntuk(masukan))
    },
    onSuccess: (hasil) => {
      const [p] = hasil.penduduk
      void segarkanKependudukan(queryClient)
      tampilkanToast({ pesan: `Kematian ${p.nama} dicatat.`, nada: 'berhasil' })
      onTersimpan(p)
    },
    onError: (galat) => terapkanGalatServer(galat, (f) => PETA_GALAT[f] ?? null, setError, formRef.current),
  })
  const ajukan = (e: FormEvent<HTMLFormElement>) =>
    handleSubmit(
      (isi) => {
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
    <form ref={formRef} noValidate aria-label="Catat kematian" onSubmit={(e) => void ajukan(e)}>
      <FormulirBagian
        label="Formulir kematian"
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
        <BagianIsian id="penduduk" nomor={1} judul="Penduduk">
          <Controller
            control={control}
            name="penduduk"
            render={({ field, fieldState }) => (
              <PilihPenduduk
                label="Penduduk yang meninggal"
                terpilih={field.value}
                onPilih={(p) => {
                  field.onChange(p)
                  setValue('penggantiKepalaId', '')
                }}
                hariIni={hariIni}
                galat={fieldState.error?.message}
                className="sm:col-span-2"
              />
            )}
          />
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

        <BagianIsian id="kejadian" nomor={2} judul="Kejadian">
          <Controller
            control={control}
            name="tanggal"
            render={({ field, fieldState }) => (
              <DatePicker
                label="Tanggal meninggal"
                nilai={field.value || null}
                onUbah={(v) => field.onChange(v ?? '')}
                min={penduduk?.tanggalLahir}
                maks={tanggalIsoWib(hariIni)}
                galat={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="jam"
            render={({ field, fieldState }) => (
              <TimeField label="Jam meninggal" nilai={field.value || null} onUbah={(v) => field.onChange(v ?? '')} galat={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="tempat"
            render={({ field, fieldState }) => (
              <TextField
                label="Tempat meninggal"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                keterangan="Mis. rumah, puskesmas, atau nama rumah sakit."
                galat={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="sebab"
            render={({ field, fieldState }) => (
              <Select
                label="Sebab kematian"
                pilihan={opsi(SEBAB_KEMATIAN)}
                nilai={field.value || null}
                onUbah={(id) => field.onChange(id ?? '')}
                galat={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="yangMenerangkan"
            render={({ field, fieldState }) => (
              <Select
                label="Yang menerangkan"
                pilihan={opsi(YANG_MENERANGKAN_KEMATIAN)}
                nilai={field.value || null}
                onUbah={(id) => field.onChange(id ?? '')}
                galat={fieldState.error?.message}
              />
            )}
          />
        </BagianIsian>

        <BagianIsian id="pelapor" nomor={3} judul="Pelapor">
          <Controller
            control={control}
            name="pelapor"
            render={({ field, fieldState }) => (
              <TextField label="Nama pelapor" value={field.value} onChange={field.onChange} onBlur={field.onBlur} galat={fieldState.error?.message} />
            )}
          />
        </BagianIsian>
      </FormulirBagian>
    </form>
  )
}
