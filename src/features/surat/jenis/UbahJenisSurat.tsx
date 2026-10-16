import { Plus, Trash } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { segarkanSurat } from '@/api/segarkan'
import { kunciSurat, opsiDetailJenisSurat, ubahJenisSurat } from '@/api/surat'
import { asalDesa } from '@/app/alamat'
import { formatAngka } from '@/domain/format/angka'
import { formDariJenis, periksaJenisSurat, type DetailJenisSurat, type FormJenisSurat } from '@/domain/surat/ubah-jenis'
import { Cap } from '@/ui/cap/Cap'
import { LembarSurat } from '@/ui/dokumen/LembarSurat'
import { PratinjauLembar } from '@/ui/dokumen/PratinjauLembar'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { Checkbox } from '@/ui/isian/Checkbox'
import { gayaKeterangan } from '@/ui/isian/gaya'
import { NumberField } from '@/ui/isian/NumberField'
import { RadioGroup } from '@/ui/isian/RadioGroup'
import { TextField } from '@/ui/isian/TextField'
import { Tautan } from '@/ui/navigasi/Tautan'
import { BagianIsian, FormulirBagian } from '@/ui/tata-letak/FormulirBagian'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { tampilkanToast } from '@/ui/toast/antrean'
import { TautanTombol } from '@/ui/tombol/TautanTombol'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiAdmin } from '../../admin/sesi-konteks'
import { dataLembar } from '../lembar'
import { EditorIsian } from './EditorIsian'
import { EditorTeks } from './EditorTeks'

type Props = { id: string; onSelesai: () => void; onKotor?: (kotor: boolean) => void; sekarang?: Date }

const JEJAK = [
  { label: 'Layanan Surat', href: '/admin/surat' },
  { label: 'Jenis Surat', href: '/admin/surat/jenis' },
]
const BAGIAN = [
  { id: 'jenis-identitas', judul: 'Identitas' },
  { id: 'jenis-ttd', judul: 'Penandatanganan' },
  { id: 'jenis-berlaku', judul: 'Masa berlaku' },
  { id: 'jenis-syarat', judul: 'Syarat' },
  { id: 'jenis-isian', judul: 'Isian tambahan' },
  { id: 'jenis-teks', judul: 'Teks surat' },
]

/** Halaman ubah jenis surat (SPEC §7.4 layar 6). Data dimuat di sini; formulirnya di `FormJenis`. */
export function UbahJenisSurat({ id, ...lain }: Props) {
  const kueri = useQuery(opsiDetailJenisSurat(id))
  if (kueri.isPending) return <BarisKerangka jumlah={8} label="Memuat jenis surat…" />
  if (kueri.isError) {
    if (kueri.error instanceof GalatApi && kueri.error.kode === 'NOT_FOUND') {
      return (
        <EmptyState
          judulHalaman
          judul="Jenis surat tidak ditemukan"
          keterangan="Jenis surat ini tidak ada di desa Anda."
          aksi={<Tautan href="/admin/surat/jenis">Kembali ke Jenis Surat</Tautan>}
        />
      )
    }
    return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  }
  return <FormJenis key={kueri.data.jenis.id} detail={kueri.data} {...lain} />
}

function FormJenis({ detail, onSelesai, onKotor, sekarang }: Omit<Props, 'id'> & { detail: DetailJenisSurat }) {
  const queryClient = useQueryClient()
  const j = detail.jenis
  const awal = useMemo(() => formDariJenis(j), [j])
  const [form, setForm] = useState<FormJenisSurat>(awal)
  const [galat, setGalat] = useState<Record<string, string>>({})
  const wadah = useRef<HTMLDivElement>(null)
  const mengirim = useRef(false)
  const { desa, dusun } = useSesiAdmin()
  const hariIni = useMemo(() => sekarang ?? new Date(), [sekarang])
  const kunciTersimpan = useMemo(() => new Set(j.isian.map((d) => d.kunci)), [j])
  // Pratinjau langsung memakai contoh permohonan terakhir jenis ini (Tugas 5) dengan teks dan isian yang sedang disunting.
  const lembar = dataLembar(
    {
      jenis: { ...j, ...form },
      pemohon: detail.contoh.pemohon,
      subjek: detail.contoh.subjek,
      mutasi: detail.contoh.mutasi,
      pengaturan: detail.pengaturan,
      pejabat: detail.pejabat,
      permohonan: { terbit: null },
    },
    { desa, dusun, isian: detail.contoh.isian, hariIni, asal: asalDesa(desa.slug) },
  )
  const kotor = JSON.stringify(form) !== JSON.stringify(awal)

  useEffect(() => {
    onKotor?.(kotor)
  }, [kotor, onKotor])

  const ubah = <K extends keyof FormJenisSurat>(kunci: K, nilai: FormJenisSurat[K]) => setForm((lama) => ({ ...lama, [kunci]: nilai }))
  const hapusGalat = (kunci: string) =>
    setGalat((lama) => {
      const sisa = { ...lama }
      delete sisa[kunci]
      return sisa
    })
  const tandai = (g: Record<string, string>) => {
    setGalat(g)
    fokusIsianSalah(wadah.current)
  }

  const simpan = useMutation({
    mutationFn: () => ubahJenisSurat(j.id, form),
    onSuccess: (baru) => {
      queryClient.setQueryData(kunciSurat.detailJenis(j.id), baru)
      void queryClient.invalidateQueries({ queryKey: kunciSurat.jenis })
      // Pratinjau permohonan yang belum terbit ikut memakai jenis yang baru.
      void segarkanSurat(queryClient)
      tampilkanToast({ pesan: 'Jenis surat disimpan. Surat yang sudah terbit tidak berubah.', nada: 'berhasil' })
      onSelesai()
    },
    onError: (e) => {
      if (e instanceof GalatApi && e.kode === 'VALIDATION' && Object.keys(e.fields).length > 0) {
        tandai(e.fields)
        tampilkanToast({ pesan: 'Periksa isian yang ditandai.', nada: 'galat' })
        return
      }
      tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' })
    },
    onSettled: () => {
      mengirim.current = false
    },
  })
  const kirim = () => {
    if (mengirim.current) return
    const g = periksaJenisSurat(form)
    if (Object.keys(g).length > 0) {
      tandai(g)
      return
    }
    mengirim.current = true
    simpan.mutate()
  }

  const ubahSyarat = (i: number, nilai: string) => {
    ubah('syarat', form.syarat.map((s, k) => (k === i ? nilai : s)))
    hapusGalat(`syarat.${i}`)
  }
  const hapusSyarat = (i: number) => {
    ubah('syarat', form.syarat.filter((_, k) => k !== i))
    // Urutan bergeser, jadi galat syarat lama tidak lagi menunjuk kolom yang benar.
    setGalat((lama) => Object.fromEntries(Object.entries(lama).filter(([k]) => !k.startsWith('syarat.'))))
  }

  return (
    <div ref={wadah} className="flex flex-col gap-6">
      <PageHeader jejak={JEJAK} judul={j.nama} meta={`${j.kode} · dipakai ${formatAngka(j.jumlahPakai)} kali dalam 12 bulan`} />
      <FormulirBagian
        label="Ubah jenis surat"
        bagian={BAGIAN}
        aksi={
          <>
            <TautanTombol href="/admin/surat/jenis">Batal</TautanTombol>
            <Tombol varian="utama" memuat={simpan.isPending} onPress={kirim}>
              Simpan
            </Tombol>
          </>
        }
      >
        <BagianIsian id="jenis-identitas" nomor={1} judul="Identitas">
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
            <TextField
              label="Nama surat"
              value={form.nama}
              onChange={(v) => {
                ubah('nama', v)
                hapusGalat('nama')
              }}
              galat={galat.nama}
              isRequired
              className="sm:col-span-2"
            />
            <TextField label="Kode" value={j.kode} isReadOnly keterangan="Kode surat tidak bisa diubah." />
            <TextField
              label="Kode klasifikasi"
              value={form.klasifikasi}
              onChange={(v) => {
                ubah('klasifikasi', v)
                hapusGalat('klasifikasi')
              }}
              galat={galat.klasifikasi}
              keterangan="Angka di depan nomor surat, mis. 470 pada 470/087/SS/IX/2026."
              isRequired
            />
          </div>
        </BagianIsian>
        <BagianIsian id="jenis-ttd" nomor={2} judul="Penandatanganan">
          <div className="flex flex-col gap-3 sm:col-span-2">
            <Checkbox isSelected={form.bolehAtasNama} onChange={(v) => ubah('bolehAtasNama', v)}>
              Sekretaris Desa boleh menandatangani atas nama Kepala Desa
            </Checkbox>
            <Checkbox isSelected={form.wajibParaf} onChange={(v) => ubah('wajibParaf', v)}>
              Wajib diparaf Sekretaris Desa sebelum ditandatangani
            </Checkbox>
          </div>
        </BagianIsian>
        <BagianIsian id="jenis-berlaku" nomor={3} judul="Masa berlaku">
          <div className="flex flex-col gap-4 sm:col-span-2">
            <RadioGroup
              label="Masa berlaku"
              pilihan={[
                { id: 'tanpa', label: 'Tanpa batas waktu' },
                { id: 'bulan', label: 'Berlaku beberapa bulan' },
              ]}
              nilai={form.masaBerlakuBulan === null ? 'tanpa' : 'bulan'}
              onUbah={(id) => {
                ubah('masaBerlakuBulan', id === 'tanpa' ? null : (awal.masaBerlakuBulan ?? 3))
                hapusGalat('masaBerlakuBulan')
              }}
            />
            {form.masaBerlakuBulan !== null && (
              <NumberField
                label="Lama berlaku"
                satuan="bulan"
                min={1}
                maks={60}
                nilai={form.masaBerlakuBulan}
                onUbah={(n) => {
                  ubah('masaBerlakuBulan', n ?? 0)
                  hapusGalat('masaBerlakuBulan')
                }}
                galat={galat.masaBerlakuBulan}
                className="w-48"
              />
            )}
          </div>
        </BagianIsian>
        <BagianIsian id="jenis-syarat" nomor={4} judul="Syarat">
          <div className="flex flex-col gap-3 sm:col-span-2">
            <p className={gayaKeterangan}>Berkas yang dibawa atau diunggah pemohon. Tampil di langkah 1 Buat surat dan di layanan warga.</p>
            <ul aria-label="Daftar syarat" className="flex flex-col gap-2">
              {form.syarat.map((s, i) => (
                <li key={i} className="flex items-end gap-2">
                  <TextField label={`Syarat ${i + 1}`} value={s} onChange={(v) => ubahSyarat(i, v)} galat={galat[`syarat.${i}`]} className="flex-1" />
                  <Tombol varian="teks" aria-label={`Hapus syarat ${i + 1}`} ikon={<Trash aria-hidden size={16} />} onPress={() => hapusSyarat(i)}>
                    Hapus
                  </Tombol>
                </li>
              ))}
            </ul>
            <Tombol ikon={<Plus aria-hidden size={16} />} onPress={() => ubah('syarat', [...form.syarat, ''])} className="self-start">
              Tambah syarat
            </Tombol>
          </div>
        </BagianIsian>
        <BagianIsian id="jenis-isian" nomor={5} judul="Isian tambahan">
          <EditorIsian
            isian={form.isian}
            kunciTersimpan={kunciTersimpan}
            galat={galat}
            onUbah={(isian) => {
              ubah('isian', isian)
              // Urutan isian bisa bergeser; galat isian dan teks dihitung ulang saat menyimpan.
              setGalat((lama) => Object.fromEntries(Object.entries(lama).filter(([k]) => !k.startsWith('isian.') && k !== 'teks')))
            }}
          />
        </BagianIsian>
        <BagianIsian id="jenis-teks" nomor={6} judul="Teks surat">
          <div className="flex flex-col gap-6 sm:col-span-2">
            <EditorTeks
              teks={form.teks}
              isian={form.isian}
              galat={galat.teks}
              onUbah={(v) => {
                ubah('teks', v)
                hapusGalat('teks')
              }}
            />
            <div className="flex flex-col gap-2">
              <p className="text-teks-kecil text-tinta-2">
                {detail.contoh.tiruan
                  ? 'Pratinjau memakai data contoh, karena desa belum punya data penduduk.'
                  : `Pratinjau memakai permohonan terakhir jenis ini, atas nama ${detail.contoh.pemohon.nama}.`}
              </p>
              <PratinjauLembar label="Pratinjau surat">
                <LembarSurat {...lembar} penanda={<Cap varian="draf" />} />
              </PratinjauLembar>
            </div>
          </div>
        </BagianIsian>
      </FormulirBagian>
    </div>
  )
}
