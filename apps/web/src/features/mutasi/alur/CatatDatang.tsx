import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch, type Path } from 'react-hook-form'
import { catatDatang } from '@/api/mutasi'
import { segarkanKependudukan } from '@/api/segarkan'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import type { HasilMutasi } from '@/domain/mutasi/masukan'
import { AGAMA, HUBUNGAN_KELUARGA, PEKERJAAN, PENDIDIKAN, STATUS_PERKAWINAN } from '@/domain/penduduk/enum'
import { namaDusun } from '@/domain/wilayah/alamat'
import { NikField } from '@/ui/domain/NikField'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { DatePicker } from '@/ui/isian/DatePicker'
import { RadioGroup } from '@/ui/isian/RadioGroup'
import { Select } from '@/ui/isian/Select'
import { TextArea } from '@/ui/isian/TextArea'
import { TextField } from '@/ui/isian/TextField'
import { BagianIsian, FormulirBagian } from '@/ui/tata-letak/FormulirBagian'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { useSesiAdmin } from '../../admin/sesi-konteks'
import { useKunciKirim } from '../kunci-kirim'
import { PilihKeluarga } from '../../keluarga/PilihKeluarga'
import { terapkanGalatServer } from './galat'
import { anggotaDatangKosong, buatSkemaDatang, isianDatangAwal, keMasukanDatang, type IsianDatang } from './isian'

const BAGIAN = [
  { id: 'asal', judul: 'Surat pindah dan daerah asal' },
  { id: 'tujuan', judul: 'KK tujuan' },
  { id: 'anggota', judul: 'Anggota yang datang' },
] as const
const KOSONG = '-'
const opsi = (nilai: readonly string[]) => nilai.map((n) => ({ id: n, label: n }))
const opsiBolehKosong = (nilai: readonly string[]) => [{ id: KOSONG, label: 'Belum diketahui' }, ...opsi(nilai)]
const dariPilihanBolehKosong = (id: string | null) => (id === null || id === KOSONG ? '' : id)
const JENIS_KELAMIN = [
  { id: 'L', label: 'Laki-laki' },
  { id: 'P', label: 'Perempuan' },
]
const KOLOM_ASAL = [
  { name: 'provinsi', label: 'Provinsi' },
  { name: 'kabupaten', label: 'Kabupaten/kota' },
  { name: 'kecamatan', label: 'Kecamatan' },
  { name: 'desa', label: 'Desa/kelurahan' },
] as const
const PETA_GALAT: Readonly<Record<string, Path<IsianDatang>>> = {
  nomorSkpwni: 'nomorSkpwni', tanggal: 'tanggal', keluarga: 'keluarga', dusunId: 'dusunId', anggota: 'anggota',
  'asal.provinsi': 'provinsi', 'asal.kabupaten': 'kabupaten', 'asal.kecamatan': 'kecamatan', 'asal.desa': 'desa',
}

/** Nama field API → isian; galat per anggota, mis. "anggota.1.nik". */
function petakanGalat(field: string): Path<IsianDatang> | null {
  const anggota = /^anggota\.(\d+)\.(nik|tanggalLahir)$/.exec(field)
  if (anggota) {
    const n = Number(anggota[1])
    return anggota[2] === 'nik' ? `anggota.${n}.nik` : `anggota.${n}.tanggalLahir`
  }
  return PETA_GALAT[field] ?? null
}

type Props = { onTersimpan: (hasil: HasilMutasi) => void; onBatal: () => void; onKotor?: (kotor: boolean) => void; sekarang?: Date }

/** Alur Datang (SPEC §6.6): SKPWNI dan daerah asal → KK tujuan → biodata tiap anggota dengan NIK asal. */
export function CatatDatang({ onTersimpan, onBatal, onKotor, sekarang }: Props) {
  const { desa, dusun } = useSesiAdmin()
  const istilah = desa.istilahWilayah
  const hariIni = useMemo(() => sekarang ?? new Date(), [sekarang])
  const queryClient = useQueryClient()
  const formRef = useRef<HTMLFormElement>(null)
  const [skema] = useState(() => buatSkemaDatang(hariIni, istilah))
  const { control, handleSubmit, setValue, getValues, setError, formState } = useForm<IsianDatang>({
    resolver: zodResolver(skema),
    defaultValues: isianDatangAwal(hariIni),
    mode: 'onTouched',
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'anggota' })
  const [keluargaJenis, dusunId, rw] = useWatch({ control, name: ['keluargaJenis', 'dusunId', 'rw'] })
  const dusunTerpilih = dusun.find((d) => d.id === dusunId)
  const rwTerpilih = dusunTerpilih?.rw.find((w) => w.nomor === rw)
  const pilihanHubungan = opsi(
    keluargaJenis === 'baru' ? HUBUNGAN_KELUARGA : HUBUNGAN_KELUARGA.filter((h) => h !== 'Kepala Keluarga'),
  )
  const galatAnggota = formState.errors.anggota?.root?.message ?? formState.errors.anggota?.message

  useEffect(() => {
    onKotor?.(formState.isDirty)
  }, [formState.isDirty, onKotor])

  const kunciUntuk = useKunciKirim()
  const simpan = useMutation({
    mutationFn: (isi: IsianDatang) => {
      const masukan = keMasukanDatang(isi, hariIni)
      return catatDatang(masukan, kunciUntuk(masukan))
    },
    onSuccess: (hasil) => {
      void segarkanKependudukan(queryClient)
      tampilkanToast({ pesan: `Kedatangan ${hasil.penduduk.length} orang dicatat.`, nada: 'berhasil' })
      onTersimpan(hasil)
    },
    onError: (galat) => terapkanGalatServer(galat, petakanGalat, setError, formRef.current),
  })

  return (
    <form
      ref={formRef}
      noValidate
      aria-label="Catat kedatangan"
      onSubmit={(e) => void handleSubmit((isi) => simpan.mutate(isi), () => fokusIsianSalah(formRef.current))(e)}
    >
      <FormulirBagian
        label="Formulir kedatangan"
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
        <BagianIsian id="asal" nomor={1} judul="Surat pindah dan daerah asal">
          <Controller
            control={control}
            name="nomorSkpwni"
            render={({ field, fieldState }) => (
              <TextField
                label="Nomor SKPWNI"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                keterangan="Surat Keterangan Pindah WNI dari Dukcapil daerah asal."
                galat={fieldState.error?.message}
                inputClassName="font-mono"
              />
            )}
          />
          <Controller
            control={control}
            name="tanggal"
            render={({ field, fieldState }) => (
              <DatePicker
                label="Tanggal datang"
                nilai={field.value || null}
                onUbah={(v) => field.onChange(v ?? '')}
                maks={tanggalIsoWib(hariIni)}
                galat={fieldState.error?.message}
              />
            )}
          />
          {KOLOM_ASAL.map((k) => (
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
            render={({ field }) => <TextArea label="Alamat asal" value={field.value} onChange={field.onChange} className="sm:col-span-2" />}
          />
        </BagianIsian>

        <BagianIsian id="tujuan" nomor={2} judul="KK tujuan">
          <Controller
            control={control}
            name="keluargaJenis"
            render={({ field }) => (
              <RadioGroup
                label="KK"
                className="sm:col-span-2"
                pilihan={[
                  { id: 'baru', label: 'Buat KK baru' },
                  { id: 'ada', label: 'Masuk ke KK yang sudah ada' },
                ]}
                nilai={field.value}
                onUbah={(id) => {
                  field.onChange(id === 'ada' ? 'ada' : 'baru')
                  if (id !== 'ada') return
                  // KK tujuan sudah punya kepala; pilihan itu hilang dari daftar, jadi nilainya dikosongkan supaya diminta dipilih ulang.
                  getValues('anggota').forEach((a, i) => {
                    if (a.hubunganKeluarga === 'Kepala Keluarga') setValue(`anggota.${i}.hubunganKeluarga`, '', { shouldDirty: true })
                  })
                }}
              />
            )}
          />
          {keluargaJenis === 'ada' ? (
            <Controller
              control={control}
              name="keluarga"
              render={({ field, fieldState }) => (
                <PilihKeluarga label="Pilih KK" terpilih={field.value} onPilih={field.onChange} galat={fieldState.error?.message} className="sm:col-span-2" />
              )}
            />
          ) : (
            <>
              <Controller
                control={control}
                name="dusunId"
                render={({ field, fieldState }) => (
                  <Select
                    label={istilah.dusun}
                    pilihan={dusun.map((d) => ({ id: d.id, label: namaDusun(d, istilah) }))}
                    nilai={field.value || null}
                    onUbah={(id) => {
                      field.onChange(id ?? '')
                      setValue('rw', '')
                      setValue('rt', '')
                    }}
                    galat={fieldState.error?.message}
                    className="sm:col-span-2"
                  />
                )}
              />
              <Controller
                control={control}
                name="rw"
                render={({ field, fieldState }) => (
                  <Select
                    label={istilah.rw}
                    pilihan={(dusunTerpilih?.rw ?? []).map((w) => ({ id: w.nomor, label: w.nomor }))}
                    nilai={field.value || null}
                    onUbah={(id) => {
                      field.onChange(id ?? '')
                      setValue('rt', '')
                    }}
                    isDisabled={!dusunTerpilih}
                    galat={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="rt"
                render={({ field, fieldState }) => (
                  <Select
                    label={istilah.rt}
                    pilihan={(rwTerpilih?.rt ?? []).map((t) => ({ id: t.nomor, label: t.nomor }))}
                    nilai={field.value || null}
                    onUbah={(id) => field.onChange(id ?? '')}
                    isDisabled={!rwTerpilih}
                    galat={fieldState.error?.message}
                  />
                )}
              />
            </>
          )}
          <Controller
            control={control}
            name="statusPenduduk"
            render={({ field }) => (
              <RadioGroup label="Status penduduk" pilihan={opsi(['Tetap', 'Sementara'])} nilai={field.value} onUbah={field.onChange} />
            )}
          />
        </BagianIsian>

        <BagianIsian id="anggota" nomor={3} judul="Anggota yang datang">
          {fields.map((f, i) => (
            <fieldset key={f.id} className="flex flex-col gap-4 rounded-2 border border-garis p-4 sm:col-span-2">
              <legend className="px-1 font-medium">Anggota {i + 1}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  control={control}
                  name={`anggota.${i}.nik`}
                  render={({ field, fieldState }) => (
                    <NikField
                      nilai={field.value}
                      galat={fieldState.error?.message}
                      hariIni={hariIni}
                      isRequired
                      className="sm:col-span-2"
                      onUbah={(digit, hasil) => {
                        field.onChange(digit)
                        if (hasil.status !== 'valid') return
                        if (getValues(`anggota.${i}.jenisKelamin`) === '') {
                          setValue(`anggota.${i}.jenisKelamin`, hasil.jenisKelamin, { shouldDirty: true })
                        }
                        if (getValues(`anggota.${i}.tanggalLahir`) === '') {
                          setValue(`anggota.${i}.tanggalLahir`, hasil.tanggalLahir, { shouldDirty: true })
                        }
                      }}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={`anggota.${i}.nama`}
                  render={({ field, fieldState }) => (
                    <TextField label="Nama lengkap" value={field.value} onChange={field.onChange} onBlur={field.onBlur} galat={fieldState.error?.message} />
                  )}
                />
                <Controller
                  control={control}
                  name={`anggota.${i}.jenisKelamin`}
                  render={({ field, fieldState }) => (
                    <RadioGroup label="Jenis kelamin" pilihan={JENIS_KELAMIN} nilai={field.value || null} onUbah={field.onChange} galat={fieldState.error?.message} />
                  )}
                />
                <Controller
                  control={control}
                  name={`anggota.${i}.tempatLahir`}
                  render={({ field, fieldState }) => (
                    <TextField label="Tempat lahir" value={field.value} onChange={field.onChange} onBlur={field.onBlur} galat={fieldState.error?.message} />
                  )}
                />
                <Controller
                  control={control}
                  name={`anggota.${i}.tanggalLahir`}
                  render={({ field, fieldState }) => (
                    <DatePicker
                      label="Tanggal lahir"
                      nilai={field.value || null}
                      onUbah={(v) => field.onChange(v ?? '')}
                      maks={tanggalIsoWib(hariIni)}
                      galat={fieldState.error?.message}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={`anggota.${i}.agama`}
                  render={({ field, fieldState }) => (
                    <Select label="Agama" pilihan={opsi(AGAMA)} nilai={field.value || null} onUbah={(id) => field.onChange(id ?? '')} galat={fieldState.error?.message} />
                  )}
                />
                <Controller
                  control={control}
                  name={`anggota.${i}.hubunganKeluarga`}
                  render={({ field, fieldState }) => (
                    <Select
                      label="Hubungan dalam keluarga"
                      pilihan={pilihanHubungan}
                      nilai={field.value || null}
                      onUbah={(id) => field.onChange(id ?? '')}
                      galat={fieldState.error?.message}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={`anggota.${i}.statusPerkawinan`}
                  render={({ field }) => (
                    <Select
                      label="Status perkawinan"
                      pilihan={opsiBolehKosong(STATUS_PERKAWINAN)}
                      nilai={field.value || KOSONG}
                      onUbah={(id) => field.onChange(dariPilihanBolehKosong(id))}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={`anggota.${i}.pendidikan`}
                  render={({ field }) => (
                    <Select
                      label="Pendidikan"
                      pilihan={opsiBolehKosong(PENDIDIKAN)}
                      nilai={field.value || KOSONG}
                      onUbah={(id) => field.onChange(dariPilihanBolehKosong(id))}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={`anggota.${i}.pekerjaan`}
                  render={({ field }) => (
                    <Select
                      label="Pekerjaan"
                      pilihan={opsiBolehKosong(PEKERJAAN)}
                      nilai={field.value || KOSONG}
                      onUbah={(id) => field.onChange(dariPilihanBolehKosong(id))}
                    />
                  )}
                />
              </div>
              {fields.length > 1 && (
                <div>
                  <Tombol varian="teks" onPress={() => remove(i)}>
                    Hapus anggota {i + 1}
                  </Tombol>
                </div>
              )}
            </fieldset>
          ))}
          {galatAnggota && (
            <div className="sm:col-span-2">
              <Banner nada="galat">{galatAnggota}</Banner>
            </div>
          )}
          <div className="sm:col-span-2">
            <Tombol ikon={<Plus aria-hidden size={16} />} onPress={() => append(anggotaDatangKosong())}>
              Tambah anggota
            </Tombol>
          </div>
        </BagianIsian>
      </FormulirBagian>
    </form>
  )
}
