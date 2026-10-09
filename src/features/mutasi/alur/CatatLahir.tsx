import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { opsiKeluarga } from '@/api/keluarga'
import { catatLahir } from '@/api/mutasi'
import { segarkanKependudukan } from '@/api/segarkan'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { JENIS_KELAHIRAN, PENOLONG_KELAHIRAN, TEMPAT_DILAHIRKAN } from '@/domain/mutasi/enum'
import { kelompokkanNik } from '@/domain/penduduk/nik'
import type { Penduduk } from '@/domain/penduduk/schema'
import { alamatLengkap } from '@/domain/wilayah/alamat'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { DatePicker } from '@/ui/isian/DatePicker'
import { gayaKeterangan } from '@/ui/isian/gaya'
import { NumberField } from '@/ui/isian/NumberField'
import { RadioGroup } from '@/ui/isian/RadioGroup'
import { Select } from '@/ui/isian/Select'
import { TextField } from '@/ui/isian/TextField'
import { TimeField } from '@/ui/isian/TimeField'
import { BagianIsian, FormulirBagian } from '@/ui/tata-letak/FormulirBagian'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { useSesiAdmin } from '../../admin/sesi-konteks'
import { PilihPenduduk } from '../../penduduk/PilihPenduduk'
import { terapkanGalatServer } from './galat'
import { buatSkemaLahir, isianLahirAwal, keMasukanLahir, saranDariKk, type IsianLahir } from './isian'

const BAGIAN = [
  { id: 'ibu', judul: 'Ibu' },
  { id: 'bayi', judul: 'Data bayi' },
  { id: 'ayah', judul: 'Ayah dan pelapor' },
] as const
const opsi = (nilai: readonly string[]) => nilai.map((n) => ({ id: n, label: n }))
const JENIS_KELAMIN = [
  { id: 'L', label: 'Laki-laki' },
  { id: 'P', label: 'Perempuan' },
]
const PETA_GALAT: Readonly<Record<string, keyof IsianLahir>> = {
  ibuId: 'ibu', ayahId: 'ayah', pelapor: 'pelapor', 'bayi.nama': 'nama', 'bayi.tempatLahir': 'tempatLahir',
  'bayi.tanggalLahir': 'tanggalLahir', 'bayi.jam': 'jam', 'bayi.anakKe': 'anakKe', 'bayi.beratGram': 'beratGram',
  'bayi.panjangCm': 'panjangCm',
}

type Props = {
  onTersimpan: (bayi: Penduduk) => void
  onBatal: () => void
  onKotor?: (kotor: boolean) => void
  sekarang?: Date
  /** Isian awal, mis. dari laporan kelahiran warga. */
  awal?: Partial<IsianLahir>
  /** Laporan warga yang ikut selesai saat kelahiran ini disimpan. */
  laporanId?: string
}

/** Alur Lahir (SPEC §6.6): ibu → data bayi → ayah dan pelapor. Bayi dicatat tanpa NIK dan masuk KK ibunya. */
export function CatatLahir({ onTersimpan, onBatal, onKotor, sekarang, awal, laporanId }: Props) {
  const { desa, dusun } = useSesiAdmin()
  const hariIni = useMemo(() => sekarang ?? new Date(), [sekarang])
  const queryClient = useQueryClient()
  const formRef = useRef<HTMLFormElement>(null)
  const [skema] = useState(() => buatSkemaLahir(hariIni))
  const { control, handleSubmit, setValue, getValues, setError, formState } = useForm<IsianLahir>({
    resolver: zodResolver(skema),
    defaultValues: { ...isianLahirAwal(hariIni, desa.kabupaten.nama), ...awal },
    mode: 'onTouched',
  })
  const ibu = useWatch({ control, name: 'ibu' })
  const kkIbu = useQuery({ ...opsiKeluarga(ibu?.keluargaId ?? ''), enabled: ibu !== null })
  const detailKk = ibu ? kkIbu.data : undefined
  const namaKepalaKk = detailKk ? detailKk.anggota.find((a) => a.id === detailKk.keluarga.kepalaKeluargaId)?.nama : undefined
  /** Pemilih ayah dipasang ulang saat ayah diisi otomatis, supaya teks di kotaknya ikut berganti. */
  const [kunciAyah, setKunciAyah] = useState(0)

  useEffect(() => {
    onKotor?.(formState.isDirty)
  }, [formState.isDirty, onKotor])

  /** Saran dari KK ibu, hanya untuk isian yang masih kosong. */
  const sarankanDariKk = async (p: Penduduk) => {
    const saran = saranDariKk(p, await queryClient.fetchQuery(opsiKeluarga(p.keluargaId)))
    if (getValues('anakKe') === null) setValue('anakKe', saran.anakKe, { shouldDirty: true })
    if (getValues('ayah') === null && saran.ayah) {
      setValue('ayah', saran.ayah, { shouldDirty: true })
      setKunciAyah((k) => k + 1)
    }
  }

  const simpan = useMutation({
    mutationFn: (isi: IsianLahir) => catatLahir({ ...keMasukanLahir(isi), laporanId: laporanId ?? null }),
    onSuccess: (hasil) => {
      const [bayi] = hasil.penduduk
      void segarkanKependudukan(queryClient)
      tampilkanToast({ pesan: `Kelahiran ${bayi.nama} dicatat.`, nada: 'berhasil' })
      onTersimpan(bayi)
    },
    onError: (galat) => terapkanGalatServer(galat, (f) => PETA_GALAT[f] ?? null, setError, formRef.current),
  })

  return (
    <form
      ref={formRef}
      noValidate
      aria-label="Catat kelahiran"
      onSubmit={(e) => void handleSubmit((isi) => simpan.mutate(isi), () => fokusIsianSalah(formRef.current))(e)}
    >
      <FormulirBagian
        label="Formulir kelahiran"
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
        <BagianIsian id="ibu" nomor={1} judul="Ibu">
          <Controller
            control={control}
            name="ibu"
            render={({ field, fieldState }) => (
              <PilihPenduduk
                label="Ibu"
                terpilih={field.value}
                filter={{ jk: 'P' }}
                hariIni={hariIni}
                keterangan="Bayi dicatat di KK ibunya."
                galat={fieldState.error?.message}
                className="sm:col-span-2"
                onPilih={(p) => {
                  field.onChange(p)
                  if (p) void sarankanDariKk(p)
                }}
              />
            )}
          />
          {detailKk && (
            <p className={`${gayaKeterangan} sm:col-span-2`}>
              KK {namaKepalaKk} · <span className="font-mono">{kelompokkanNik(detailKk.keluarga.nomorKk)}</span> ·{' '}
              {alamatLengkap(detailKk.keluarga, dusun, desa.istilahWilayah)}
            </p>
          )}
        </BagianIsian>

        <BagianIsian id="bayi" nomor={2} judul="Data bayi">
          <Controller
            control={control}
            name="nama"
            render={({ field, fieldState }) => (
              <TextField label="Nama bayi" value={field.value} onChange={field.onChange} onBlur={field.onBlur} galat={fieldState.error?.message} className="sm:col-span-2" />
            )}
          />
          <Controller
            control={control}
            name="jenisKelamin"
            render={({ field, fieldState }) => (
              <RadioGroup label="Jenis kelamin" pilihan={JENIS_KELAMIN} nilai={field.value || null} onUbah={field.onChange} galat={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="tempatDilahirkan"
            render={({ field, fieldState }) => (
              <Select
                label="Tempat dilahirkan"
                pilihan={opsi(TEMPAT_DILAHIRKAN)}
                nilai={field.value || null}
                onUbah={(id) => field.onChange(id ?? '')}
                galat={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="tempatLahir"
            render={({ field, fieldState }) => (
              <TextField
                label="Tempat lahir (kota/kabupaten)"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                galat={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="tanggalLahir"
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
            name="jam"
            render={({ field, fieldState }) => (
              <TimeField label="Jam lahir" nilai={field.value || null} onUbah={(v) => field.onChange(v ?? '')} galat={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="jenisKelahiran"
            render={({ field }) => (
              <Select label="Jenis kelahiran" pilihan={opsi(JENIS_KELAHIRAN)} nilai={field.value} onUbah={(id) => id && field.onChange(id)} />
            )}
          />
          <Controller
            control={control}
            name="anakKe"
            render={({ field, fieldState }) => (
              <NumberField label="Anak ke-" nilai={field.value} onUbah={field.onChange} min={1} maks={20} galat={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="penolong"
            render={({ field, fieldState }) => (
              <Select
                label="Penolong kelahiran"
                pilihan={opsi(PENOLONG_KELAHIRAN)}
                nilai={field.value || null}
                onUbah={(id) => field.onChange(id ?? '')}
                galat={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="beratGram"
            render={({ field, fieldState }) => (
              <NumberField label="Berat" satuan="gram" nilai={field.value} onUbah={field.onChange} galat={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="panjangCm"
            render={({ field, fieldState }) => (
              <NumberField label="Panjang" satuan="cm" nilai={field.value} onUbah={field.onChange} galat={fieldState.error?.message} />
            )}
          />
        </BagianIsian>

        <BagianIsian id="ayah" nomor={3} judul="Ayah dan pelapor">
          <Controller
            control={control}
            name="ayah"
            render={({ field, fieldState }) => (
              <PilihPenduduk
                key={kunciAyah}
                label="Ayah"
                terpilih={field.value}
                onPilih={field.onChange}
                filter={{ jk: 'L' }}
                hariIni={hariIni}
                keterangan="Kosongkan bila ayah tidak tercatat di desa ini."
                galat={fieldState.error?.message}
                className="sm:col-span-2"
              />
            )}
          />
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
