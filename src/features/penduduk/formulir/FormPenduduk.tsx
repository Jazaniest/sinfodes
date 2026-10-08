import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { GalatApi, pesanGalat } from '@/api/galat'
import { opsiKeluarga } from '@/api/keluarga'
import { cekNik, tambahPenduduk, ubahPenduduk } from '@/api/penduduk'
import { segarkanKependudukan } from '@/api/segarkan'
import { formatWaktuRelatif, tanggalIsoWib } from '@/domain/format/tanggal'
import {
  AGAMA, GOLONGAN_DARAH, HUBUNGAN_KELUARGA, KTP_EL, PEKERJAAN, PENDIDIKAN, STATUS_PERKAWINAN,
} from '@/domain/penduduk/enum'
import type { HasilCekNik } from '@/domain/penduduk/masukan'
import { kelompokkanNik, periksaNik } from '@/domain/penduduk/nik'
import type { Penduduk } from '@/domain/penduduk/schema'
import { selisihDenganNik } from '@/domain/penduduk/selisih-nik'
import { alamatLengkap, namaDusun } from '@/domain/wilayah/alamat'
import { NikField } from '@/ui/domain/NikField'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { DatePicker } from '@/ui/isian/DatePicker'
import { gayaKeterangan, gayaLabel } from '@/ui/isian/gaya'
import { RadioGroup } from '@/ui/isian/RadioGroup'
import { Select, type OpsiPilihan } from '@/ui/isian/Select'
import { TextArea } from '@/ui/isian/TextArea'
import { TextField } from '@/ui/isian/TextField'
import { ConfirmDialog } from '@/ui/lapisan/ConfirmDialog'
import { Tautan } from '@/ui/navigasi/Tautan'
import { BagianIsian, FormulirBagian } from '@/ui/tata-letak/FormulirBagian'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { useSesiAdmin } from '../../admin/sesi-konteks'
import { useDrafFormulir } from '../../admin/useDrafFormulir'
import { opsiDariDetail, type OpsiKeluarga } from '../../keluarga/opsi-keluarga'
import { PilihKeluarga } from '../../keluarga/PilihKeluarga'
import {
  buatSkemaIsian, cocokIsianPenduduk, isianDariPenduduk, isianKosong, keMasukan, perubahanBiodata, type IsianPenduduk,
} from './isian'

export type ModeFormulir =
  | { jenis: 'tambah'; keluargaAwal: OpsiKeluarga | null }
  | { jenis: 'ubah'; penduduk: Penduduk; keluarga: OpsiKeluarga }
export type LanjutSetelahSimpan = 'profil' | 'tambah-lagi'

type Props = {
  mode: ModeFormulir
  onTersimpan: (p: Penduduk, lanjut: LanjutSetelahSimpan) => void
  onBatal: () => void
  /** Dikabari setiap kali status "ada perubahan yang belum disimpan" berubah (untuk PenjagaKeluar). */
  onKotor?: (kotor: boolean) => void
  sekarang?: Date
}

/** Urutan bagian mengikuti formulir biodata Dukcapil F-1.01 (SPEC §6.4). */
const BAGIAN = [
  { id: 'identitas', judul: 'Identitas' },
  { id: 'kelahiran', judul: 'Kelahiran' },
  { id: 'keluarga', judul: 'Keluarga' },
  { id: 'alamat', judul: 'Alamat' },
  { id: 'pendidikan', judul: 'Pendidikan dan pekerjaan' },
  { id: 'perkawinan', judul: 'Perkawinan' },
  { id: 'dokumen', judul: 'Dokumen dan kontak' },
] as const

/** Pilihan "Belum diketahui" untuk field yang boleh kosong (masuk daftar "Data belum lengkap"). */
const KOSONG = '-'
const opsi = (nilai: readonly string[]): OpsiPilihan[] => nilai.map((n) => ({ id: n, label: n }))
const opsiBolehKosong = (nilai: readonly string[]): OpsiPilihan[] => [{ id: KOSONG, label: 'Belum diketahui' }, ...opsi(nilai)]
const dariPilihanBolehKosong = (id: string | null) => (id === null || id === KOSONG ? '' : id)
const JENIS_KELAMIN = [
  { id: 'L', label: 'Laki-laki' },
  { id: 'P', label: 'Perempuan' },
]
const FIELD_ISIAN = new Set(Object.keys(isianKosong(null)))
const adalahFieldIsian = (f: string): f is keyof IsianPenduduk => FIELD_ISIAN.has(f)

function kapanDraf(iso: string, hariIni: Date): string {
  const kapan = formatWaktuRelatif(iso, hariIni)
  return kapan === 'Kemarin' ? 'kemarin' : kapan
}

/** Formulir tambah dan ubah penduduk (SPEC §6.4). */
export function FormPenduduk({ mode, onTersimpan, onBatal, onKotor, sekarang }: Props) {
  const { pengguna, desa, dusun } = useSesiAdmin()
  const istilah = desa.istilahWilayah
  const hariIni = useMemo(() => sekarang ?? new Date(), [sekarang])
  const queryClient = useQueryClient()
  const formRef = useRef<HTMLFormElement>(null)
  const asli = mode.jenis === 'ubah' ? mode.penduduk : null

  const [awal] = useState(() =>
    mode.jenis === 'ubah' ? isianDariPenduduk(mode.penduduk, mode.keluarga) : isianKosong(mode.keluargaAwal),
  )
  /** Pembanding draf: isian yang sama dengan ini tidak perlu disimpan sebagai draf. */
  const dasar = useRef(awal)
  const kunciDraf =
    mode.jenis === 'ubah'
      ? `penduduk.ubah.${mode.penduduk.id}.${pengguna.id}`
      : `penduduk.tambah.${mode.keluargaAwal?.id ?? 'umum'}.${pengguna.id}`
  const { draf, simpan: simpanDraf, buang: buangDraf } = useDrafFormulir(kunciDraf, cocokIsianPenduduk)
  const [tampilkanDraf, setTampilkanDraf] = useState(draf !== null)

  const [skema] = useState(() => buatSkemaIsian(hariIni, istilah))
  const { control, handleSubmit, setValue, getValues, setError, reset, formState } = useForm<IsianPenduduk>({
    resolver: zodResolver(skema),
    defaultValues: awal,
    mode: 'onTouched',
  })
  // useWatch, bukan watch(): watch() tidak aman untuk React Compiler (aturan lint react-hooks/incompatible-library).
  const [nik, jenisKelamin, tanggalLahir, keluargaJenis, keluarga, dusunId, rw, rt] = useWatch({
    control,
    name: ['nik', 'jenisKelamin', 'tanggalLahir', 'keluargaJenis', 'keluarga', 'dusunId', 'rw', 'rt'],
  })
  const semuaIsian = useWatch({ control })

  // Draf dipulihkan di atas nilai awal, jadi formulir langsung dianggap berubah dan penjaga keluar aktif.
  // Efek ini harus tetap di atas efek simpan draf di bawah.
  useEffect(() => {
    if (draf) reset(draf.isi, { keepDefaultValues: true })
  }, [draf, reset])

  useEffect(() => {
    onKotor?.(formState.isDirty)
  }, [formState.isDirty, onKotor])

  useEffect(() => {
    const isi = getValues()
    if (JSON.stringify(isi) === JSON.stringify(dasar.current)) buangDraf()
    else simpanDraf(isi)
  }, [semuaIsian, getValues, simpanDraf, buangDraf])

  // --- NIK: isi otomatis dan cek NIK ganda ---
  const [nikTerdaftar, setNikTerdaftar] = useState<HasilCekNik | null>(null)
  const cek = useMutation({ mutationFn: (nik: string) => cekNik(nik, asli?.id) })
  const periksaNikGanda = (nik: string) => {
    if (periksaNik(nik, hariIni).status !== 'valid' || nik === asli?.nik) return
    cek.mutate(nik, {
      onSuccess: (hasil) => {
        if (getValues('nik') !== nik) return
        setNikTerdaftar(hasil.terdaftar ? hasil : null)
        if (hasil.terdaftar) {
          setError('nik', {
            type: 'server',
            message: hasil.penduduk ? `NIK sudah terdaftar atas nama ${hasil.penduduk.nama}` : 'NIK sudah terdaftar di desa lain',
          })
        }
      },
    })
  }
  const selisihIsian = (isi: Pick<IsianPenduduk, 'nik' | 'jenisKelamin' | 'tanggalLahir'>) => {
    const hasil = periksaNik(isi.nik, hariIni)
    return hasil.status === 'valid' ? selisihDenganNik(hasil, isi) : []
  }
  const selisih = selisihIsian({ nik, jenisKelamin, tanggalLahir })

  // --- Simpan ---
  const terapkanGalatServer = (galat: unknown) => {
    if (galat instanceof GalatApi) {
      const field = Object.entries(galat.fields).filter(([f]) => adalahFieldIsian(f))
      for (const [f, pesan] of field) if (adalahFieldIsian(f)) setError(f, { type: 'server', message: pesan })
      if (field.length > 0) {
        fokusIsianSalah(formRef.current)
        return
      }
    }
    tampilkanToast({ pesan: pesanGalat(galat), nada: 'galat' })
  }
  const [konfirmasi, setKonfirmasi] = useState<{ isi: IsianPenduduk; lanjut: LanjutSetelahSimpan } | null>(null)
  const simpan = useMutation({
    mutationFn: async ({ isi }: { isi: IsianPenduduk; lanjut: LanjutSetelahSimpan }): Promise<Penduduk | null> => {
      const masukan = keMasukan(isi)
      if (!asli) return tambahPenduduk(masukan)
      const perubahan = perubahanBiodata(asli, masukan)
      return Object.keys(perubahan).length === 0 ? null : ubahPenduduk(asli.id, perubahan)
    },
    onSuccess: async (p, { isi, lanjut }) => {
      setKonfirmasi(null)
      buangDraf()
      if (p === null) {
        tampilkanToast({ pesan: 'Tidak ada perubahan.', nada: 'info' })
        if (asli) onTersimpan(asli, 'profil')
        return
      }
      void segarkanKependudukan(queryClient)
      tampilkanToast({ pesan: asli ? `Data ${p.nama} disimpan.` : `${p.nama} ditambahkan.`, nada: 'berhasil' })
      if (lanjut === 'tambah-lagi') {
        const kk =
          isi.keluargaJenis === 'ada' && isi.keluarga
            ? { ...isi.keluarga, jumlahAnggota: isi.keluarga.jumlahAnggota + 1 }
            : opsiDariDetail(await queryClient.fetchQuery(opsiKeluarga(p.keluargaId)))
        const berikut = isianKosong(kk)
        dasar.current = berikut
        reset(berikut)
        setNikTerdaftar(null)
        setTampilkanDraf(false)
      }
      onTersimpan(p, lanjut)
    },
    onError: (galat) => {
      setKonfirmasi(null)
      terapkanGalatServer(galat)
    },
  })
  const ajukan = (lanjut: LanjutSetelahSimpan) =>
    handleSubmit(
      (isi) => {
        if (selisihIsian(isi).length > 0) setKonfirmasi({ isi, lanjut })
        else simpan.mutate({ isi, lanjut })
      },
      () => fokusIsianSalah(formRef.current),
    )

  // --- Keluarga dan alamat ---
  const dusunTerpilih = dusun.find((d) => d.id === dusunId)
  const rwTerpilih = dusunTerpilih?.rw.find((w) => w.nomor === rw)
  const letak = keluargaJenis === 'baru' ? (dusunId && rw && rt ? { dusunId, rw, rt } : null) : keluarga
  const kepalaTetap = asli?.hubunganKeluarga === 'Kepala Keluarga'
  const pilihanHubungan = opsi(
    keluargaJenis === 'baru' || kepalaTetap ? HUBUNGAN_KELUARGA : HUBUNGAN_KELUARGA.filter((h) => h !== 'Kepala Keluarga'),
  )

  return (
    <form
      ref={formRef}
      noValidate
      aria-label={asli ? 'Ubah data penduduk' : 'Tambah penduduk'}
      onSubmit={(e) => void ajukan('profil')(e)}
    >
      {tampilkanDraf && draf && (
        <div className="mb-6">
          <Banner
            nada="info"
            judul={`Draf dari ${kapanDraf(draf.disimpanPada, hariIni)} dipulihkan`}
            aksi={
              <Tombol
                varian="teks"
                onPress={() => {
                  buangDraf()
                  reset(awal)
                  setTampilkanDraf(false)
                }}
              >
                Buang draf
              </Tombol>
            }
          >
            Isian yang belum disimpan dikembalikan seperti terakhir kali Anda tinggalkan.
          </Banner>
        </div>
      )}
      <FormulirBagian
        label="Formulir penduduk"
        bagian={BAGIAN}
        aksi={
          <>
            <Tombol onPress={onBatal}>Batal</Tombol>
            {!asli && (
              <Tombol isDisabled={simpan.isPending} onPress={() => void ajukan('tambah-lagi')()}>
                Simpan & tambah lagi
              </Tombol>
            )}
            <Tombol type="submit" varian="utama" memuat={simpan.isPending}>
              Simpan
            </Tombol>
          </>
        }
      >
        <BagianIsian id="identitas" nomor={1} judul="Identitas">
          <Controller
            control={control}
            name="nik"
            render={({ field, fieldState }) => (
              <NikField
                nilai={field.value}
                galat={fieldState.error?.message}
                hariIni={hariIni}
                className="sm:col-span-2"
                onUbah={(digit, hasil) => {
                  field.onChange(digit)
                  setNikTerdaftar(null)
                  if (hasil.status !== 'valid') return
                  if (getValues('jenisKelamin') === '') setValue('jenisKelamin', hasil.jenisKelamin, { shouldDirty: true, shouldValidate: true })
                  if (getValues('tanggalLahir') === '') setValue('tanggalLahir', hasil.tanggalLahir, { shouldDirty: true, shouldValidate: true })
                }}
                onBlur={() => {
                  field.onBlur()
                  periksaNikGanda(field.value)
                }}
              />
            )}
          />
          {nikTerdaftar?.penduduk && (
            <p className="-mt-2 text-teks-kecil sm:col-span-2">
              <Tautan href={`/admin/kependudukan/penduduk/${nikTerdaftar.penduduk.id}`}>Buka profil {nikTerdaftar.penduduk.nama}</Tautan>
            </p>
          )}
          <Controller
            control={control}
            name="nama"
            render={({ field, fieldState }) => (
              <TextField
                label="Nama lengkap"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                galat={fieldState.error?.message}
                className="sm:col-span-2"
              />
            )}
          />
          <Controller
            control={control}
            name="jenisKelamin"
            render={({ field, fieldState }) => (
              <RadioGroup
                label="Jenis kelamin"
                pilihan={JENIS_KELAMIN}
                nilai={field.value || null}
                onUbah={field.onChange}
                galat={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="kewarganegaraan"
            render={({ field }) => (
              <RadioGroup label="Kewarganegaraan" pilihan={opsi(['WNI', 'WNA'])} nilai={field.value} onUbah={field.onChange} />
            )}
          />
          <Controller
            control={control}
            name="agama"
            render={({ field, fieldState }) => (
              <Select
                label="Agama"
                pilihan={opsi(AGAMA)}
                nilai={field.value || null}
                onUbah={(id) => field.onChange(id ?? '')}
                galat={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="golonganDarah"
            render={({ field }) => (
              <Select label="Golongan darah" pilihan={opsi(GOLONGAN_DARAH)} nilai={field.value} onUbah={(id) => id && field.onChange(id)} />
            )}
          />
          {selisih.length > 0 && (
            <div className="sm:col-span-2">
              <Banner nada="peringatan" judul="Data berbeda dengan NIK">
                {selisih.join('. ')}. Data tetap bisa disimpan setelah dikonfirmasi.
              </Banner>
            </div>
          )}
        </BagianIsian>

        <BagianIsian id="kelahiran" nomor={2} judul="Kelahiran">
          <Controller
            control={control}
            name="tempatLahir"
            render={({ field, fieldState }) => (
              <TextField label="Tempat lahir" value={field.value} onChange={field.onChange} onBlur={field.onBlur} galat={fieldState.error?.message} />
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
            name="nomorAktaLahir"
            render={({ field }) => (
              <TextField
                label="Nomor akta lahir"
                value={field.value}
                onChange={field.onChange}
                keterangan="Kosongkan bila belum punya akta lahir."
                inputClassName="font-mono"
              />
            )}
          />
        </BagianIsian>

        <BagianIsian id="keluarga" nomor={3} judul="Keluarga">
          {mode.jenis === 'ubah' ? (
            <div className="flex flex-col gap-1 sm:col-span-2">
              <p className={gayaLabel}>KK</p>
              <p>
                KK {mode.keluarga.namaKepala} · <span className="font-mono">{kelompokkanNik(mode.keluarga.nomorKk)}</span>
              </p>
              <p className={gayaKeterangan}>Untuk pindah KK, pakai Pecah KK di halaman KK.</p>
            </div>
          ) : (
            <>
              <Controller
                control={control}
                name="keluargaJenis"
                render={({ field }) => (
                  <RadioGroup
                    label="KK"
                    className="sm:col-span-2"
                    pilihan={[
                      { id: 'ada', label: 'KK yang sudah ada' },
                      { id: 'baru', label: 'Buat KK baru' },
                    ]}
                    nilai={field.value}
                    onUbah={(id) => {
                      const jenis = id === 'baru' ? 'baru' : 'ada'
                      field.onChange(jenis)
                      if (jenis === 'baru') setValue('hubunganKeluarga', 'Kepala Keluarga', { shouldDirty: true })
                      else if (getValues('hubunganKeluarga') === 'Kepala Keluarga') setValue('hubunganKeluarga', '', { shouldDirty: true })
                    }}
                  />
                )}
              />
              {keluargaJenis === 'ada' ? (
                <Controller
                  control={control}
                  name="keluarga"
                  render={({ field, fieldState }) => (
                    <PilihKeluarga
                      label="Pilih KK"
                      terpilih={field.value}
                      onPilih={field.onChange}
                      galat={fieldState.error?.message}
                      keterangan="Cari lewat nomor KK atau nama kepala keluarga."
                      className="sm:col-span-2"
                    />
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
            </>
          )}
          <Controller
            control={control}
            name="hubunganKeluarga"
            render={({ field, fieldState }) => (
              <Select
                label="Hubungan dalam keluarga"
                pilihan={pilihanHubungan}
                nilai={field.value || null}
                onUbah={(id) => field.onChange(id ?? '')}
                isDisabled={keluargaJenis === 'baru' || kepalaTetap}
                keterangan={
                  kepalaTetap
                    ? 'Kepala keluarga diganti lewat halaman KK.'
                    : keluargaJenis === 'baru'
                      ? 'Penduduk pertama di KK baru adalah kepala keluarga.'
                      : undefined
                }
                galat={fieldState.error?.message}
                className="sm:col-span-2"
              />
            )}
          />
          <Controller
            control={control}
            name="namaAyah"
            render={({ field }) => <TextField label="Nama ayah" value={field.value} onChange={field.onChange} />}
          />
          <Controller
            control={control}
            name="namaIbu"
            render={({ field }) => <TextField label="Nama ibu" value={field.value} onChange={field.onChange} />}
          />
        </BagianIsian>

        <BagianIsian id="alamat" nomor={4} judul="Alamat">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <p className={gayaLabel}>Alamat</p>
            <p>{letak ? alamatLengkap(letak, dusun, istilah) : 'Mengikuti KK. Pilih KK lebih dulu.'}</p>
            <p className={gayaKeterangan}>
              Desa {desa.nama}, Kec. {desa.kecamatan.nama}, Kab. {desa.kabupaten.nama}. Alamat mengikuti KK dan tidak diisi terpisah.
            </p>
          </div>
        </BagianIsian>

        <BagianIsian id="pendidikan" nomor={5} judul="Pendidikan dan pekerjaan">
          <Controller
            control={control}
            name="pendidikan"
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
            name="pekerjaan"
            render={({ field }) => (
              <Select
                label="Pekerjaan"
                pilihan={opsiBolehKosong(PEKERJAAN)}
                nilai={field.value || KOSONG}
                onUbah={(id) => field.onChange(dariPilihanBolehKosong(id))}
              />
            )}
          />
          <p className={`${gayaKeterangan} sm:col-span-2`}>
            Pilih "Belum diketahui" bila datanya belum ada. Penduduk ini akan tampil di daftar "Data belum lengkap".
          </p>
        </BagianIsian>

        <BagianIsian id="perkawinan" nomor={6} judul="Perkawinan">
          <Controller
            control={control}
            name="statusPerkawinan"
            render={({ field }) => (
              <Select
                label="Status perkawinan"
                pilihan={opsiBolehKosong(STATUS_PERKAWINAN)}
                nilai={field.value || KOSONG}
                onUbah={(id) => field.onChange(dariPilihanBolehKosong(id))}
              />
            )}
          />
        </BagianIsian>

        <BagianIsian id="dokumen" nomor={7} judul="Dokumen dan kontak">
          <Controller
            control={control}
            name="ktpEl"
            render={({ field }) => (
              <Select label="KTP-el" pilihan={opsi(KTP_EL)} nilai={field.value} onUbah={(id) => id && field.onChange(id)} />
            )}
          />
          <Controller
            control={control}
            name="statusPenduduk"
            render={({ field }) => (
              <RadioGroup label="Status penduduk" pilihan={opsi(['Tetap', 'Sementara'])} nilai={field.value} onUbah={field.onChange} />
            )}
          />
          <Controller
            control={control}
            name="telepon"
            render={({ field, fieldState }) => (
              <TextField
                label="Telepon / WhatsApp"
                inputMode="tel"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                keterangan="Diawali 08, untuk pemberitahuan lewat WhatsApp."
                galat={fieldState.error?.message}
                inputClassName="font-mono"
              />
            )}
          />
          <Controller
            control={control}
            name="catatan"
            render={({ field }) => <TextArea label="Catatan" value={field.value} onChange={field.onChange} className="sm:col-span-2" />}
          />
        </BagianIsian>
      </FormulirBagian>

      <ConfirmDialog
        isOpen={konfirmasi !== null}
        onOpenChange={(buka) => {
          if (!buka) setKonfirmasi(null)
        }}
        judul="Data berbeda dengan NIK"
        labelSetuju="Simpan tetap"
        labelBatal="Periksa lagi"
        memuat={simpan.isPending}
        onSetuju={() => {
          if (konfirmasi) simpan.mutate(konfirmasi)
        }}
      >
        <ul className="list-disc pl-5">
          {(konfirmasi ? selisihIsian(konfirmasi.isi) : []).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="mt-2 text-tinta-2">Data lapangan kadang memang berbeda dengan NIK. Simpan bila sudah dicocokkan dengan dokumen.</p>
      </ConfirmDialog>
    </form>
  )
}
