import { ArrowDown, ArrowUp, Plus, Trash } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { segarkanSurat } from '@/api/segarkan'
import { kunciSurat, opsiDetailJenisSurat, opsiJenisSurat } from '@/api/surat'
import { kunciTataLetak, opsiTataLetak, simpanTataLetak } from '@/api/tata-letak'
import { asalDesa } from '@/app/alamat'
import { galatDariZod } from '@/domain/format/galat-isian'
import { GARIS_KOP, HURUF_SURAT, ID_TATA_LETAK_SIAP, POSISI_LAMBANG, POSISI_QR, POSISI_TANDA_TANGAN, SPASI_BARIS, tataLetakSuratSchema, UKURAN_HURUF_PT, UKURAN_KERTAS, type IdTataLetakSiap, type TataLetakSurat as TataLetak, type UnsurTandaTangan } from '@/domain/surat/tata-letak'
import { salinTataLetak, samaDenganSiap, TATA_LETAK_SIAP } from '@/domain/surat/tata-letak-siap'
import { Cap } from '@/ui/cap/Cap'
import { cn } from '@/ui/cn'
import { LembarSurat } from '@/ui/dokumen/LembarSurat'
import { lebarLembarCm } from '@/ui/dokumen/ukuran-kertas'
import { PratinjauLembar } from '@/ui/dokumen/PratinjauLembar'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { Checkbox } from '@/ui/isian/Checkbox'
import { gayaGalat, gayaKeterangan } from '@/ui/isian/gaya'
import { NumberField } from '@/ui/isian/NumberField'
import { RadioGroup } from '@/ui/isian/RadioGroup'
import { Select } from '@/ui/isian/Select'
import { TextField } from '@/ui/isian/TextField'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { dataLembar, denganContohTerbit } from '../surat/lembar'
import { KepalaPengaturan } from './TabPengaturan'

const KARTU: Readonly<Record<IdTataLetakSiap, { nama: string; keterangan: string }>> = {
  standar: { nama: 'Standar tata naskah dinas', keterangan: 'Lambang desa di kiri, garis kop tebal-tipis, tanda tangan di kanan, QR di kiri bawah.' },
  'dua-lambang': { nama: 'Kop dua lambang', keterangan: 'Lambang kabupaten di kiri dan lambang desa di kanan, garis ganda.' },
  'rata-tengah': { nama: 'Kop rata tengah', keterangan: 'Lambang di tengah di atas teks kop, garis tunggal, tanda tangan di tengah, QR di bawahnya.' },
}
const LABEL_UNSUR: Readonly<Record<UnsurTandaTangan, string>> = {
  'tempat-tanggal': 'Tempat dan tanggal', jabatan: 'Jabatan', nama: 'Nama', nip: 'NIP',
}
const LABEL_GARIS = { tunggal: 'Garis tunggal', ganda: 'Garis ganda', 'tebal-tipis': 'Garis tebal-tipis' } as const
const LABEL_HURUF = { Tinos: 'Tinos (setara Times New Roman)', Arimo: 'Arimo (setara Arial)', 'Plex Serif': 'IBM Plex Serif' } as const
const angka = (n: number) => String(n).replace('.', ',')
const MAKS_BARIS = 5

type Penyunting = { nilai: TataLetak; onUbah: (t: TataLetak) => void; galat?: Record<string, string> }

function Kelompok({ judul, children }: { judul: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 border-t border-garis pt-4 first:border-t-0 first:pt-0">
      <legend className="mb-1 font-medium">{judul}</legend>
      {children}
    </fieldset>
  )
}

/**
 * Penyunting tata letak surat (SPEC-V0.2 12.2), dipakai tab Tata letak surat dan pengecualian di editor jenis surat.
 * Terkendali: setiap perubahan menghitung ulang penanda `siap`, jadi "Dipakai" hanya menempel pada tata letak yang
 * isinya sama persis dengan yang siap pakai.
 */
export function PenyuntingTataLetak({ nilai, onUbah, galat = {} }: Penyunting) {
  const ubah = (ubahan: (t: TataLetak) => void) => {
    const t = salinTataLetak(nilai)
    ubahan(t)
    t.siap = samaDenganSiap(t)
    onUbah(t)
  }
  const margin = (sisi: keyof TataLetak['kertas']['margin'], label: string) => (
    <NumberField
      label={label}
      satuan="mm"
      nilai={nilai.kertas.margin[sisi]}
      onUbah={(n) => n !== null && ubah((t) => void (t.kertas.margin[sisi] = n))}
      galat={galat[`kertas.margin.${sisi}`]}
    />
  )
  const geser = (i: number, arah: -1 | 1) =>
    ubah((t) => {
      const u = t.tandaTangan.urutan
      ;[u[i], u[i + arah]] = [u[i + arah], u[i]]
    })
  // NIP muncul di daftar urutan hanya bila diaktifkan; selebihnya tetap di data supaya posisinya diingat.
  const tampil = nilai.tandaTangan.urutan.map((k, i) => ({ k, i })).filter(({ k }) => k !== 'nip' || nilai.tandaTangan.nip)

  return (
    <div className="flex flex-col gap-6">
      <div role="group" aria-label="Tata letak siap pakai" className="grid gap-3 sm:grid-cols-3">
        {ID_TATA_LETAK_SIAP.map((id) => {
          const dipakai = nilai.siap === id
          return (
            <button
              key={id}
              type="button"
              aria-pressed={dipakai}
              onClick={() => onUbah(salinTataLetak(TATA_LETAK_SIAP[id]))}
              className={cn(
                'flex flex-col gap-1 rounded-2 border bg-lembar p-3 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-biru',
                dipakai ? 'border-biru' : 'border-garis-input hover:border-tinta-2',
              )}
            >
              <span className="flex items-center justify-between gap-2 font-medium">
                {KARTU[id].nama}
                {dipakai && <Cap varian="aktif" label="Dipakai" />}
              </span>
              <span className="text-teks-kecil text-tinta-2">{KARTU[id].keterangan}</span>
            </button>
          )
        })}
      </div>

      <Kelompok judul="Kop">
        <RadioGroup
          label="Jumlah lambang"
          pilihan={[{ id: '1', label: 'Satu lambang (desa)' }, { id: '2', label: 'Dua lambang (kabupaten dan desa)' }]}
          nilai={String(nilai.kop.jumlahLambang)}
          onUbah={(id) => ubah((t) => void (t.kop.jumlahLambang = id === '2' ? 2 : 1))}
        />
        <RadioGroup
          label="Posisi lambang"
          pilihan={POSISI_LAMBANG.map((p) => ({ id: p, label: p === 'kiri' ? 'Di kiri teks' : 'Di tengah, di atas teks' }))}
          nilai={nilai.kop.posisiLambang}
          isDisabled={nilai.kop.jumlahLambang === 2}
          keterangan={nilai.kop.jumlahLambang === 2 ? 'Dengan dua lambang, posisi lambang diabaikan.' : undefined}
          onUbah={(id) => ubah((t) => void (t.kop.posisiLambang = id === 'tengah' ? 'tengah' : 'kiri'))}
        />
        <div className="flex flex-col gap-3">
          {nilai.kop.baris.map((b, i) => (
            <div key={i} className="flex items-end gap-2">
              <TextField
                label={`Baris kop ${i + 1}`}
                value={b}
                onChange={(v) => ubah((t) => void (t.kop.baris[i] = v))}
                galat={galat[`kop.baris.${i}`]}
                className="min-w-0 flex-1"
              />
              <Tombol
                varian="teks"
                aria-label={`Hapus baris kop ${i + 1}`}
                ikon={<Trash aria-hidden size={16} />}
                isDisabled={nilai.kop.baris.length === 1}
                onPress={() => ubah((t) => void t.kop.baris.splice(i, 1))}
              >
                Hapus
              </Tombol>
            </div>
          ))}
          {galat['kop.baris'] && (
            <p role="alert" className={gayaGalat}>
              {galat['kop.baris']}
            </p>
          )}
          <p className={gayaKeterangan}>Sisipan: {'{kab}'}, {'{kec}'}, {'{desa}'}, dan {'{alamat}'}. Kata lain tampil apa adanya sebagai teks.</p>
          {nilai.kop.baris.length < MAKS_BARIS && (
            <div>
              <Tombol varian="teks" ikon={<Plus aria-hidden size={16} />} onPress={() => ubah((t) => void t.kop.baris.push(''))}>
                Tambah baris kop
              </Tombol>
            </div>
          )}
        </div>
        <RadioGroup
          label="Garis bawah kop"
          pilihan={GARIS_KOP.map((g) => ({ id: g, label: LABEL_GARIS[g] }))}
          nilai={nilai.kop.garis}
          onUbah={(id) => ubah((t) => void (t.kop.garis = GARIS_KOP.find((g) => g === id) ?? t.kop.garis))}
        />
      </Kelompok>

      <Kelompok judul="Kertas">
        <RadioGroup
          label="Ukuran kertas"
          pilihan={UKURAN_KERTAS.map((u) => ({ id: u, label: u === 'A4' ? 'A4 (21 × 29,7 cm)' : 'F4 (21,5 × 33 cm)' }))}
          nilai={nilai.kertas.ukuran}
          onUbah={(id) => ubah((t) => void (t.kertas.ukuran = id === 'F4' ? 'F4' : 'A4'))}
        />
        <div className="grid grid-cols-2 gap-4">
          {margin('atas', 'Margin atas (mm)')}
          {margin('kanan', 'Margin kanan (mm)')}
          {margin('bawah', 'Margin bawah (mm)')}
          {margin('kiri', 'Margin kiri (mm)')}
        </div>
        <p className={gayaKeterangan}>Margin 10-40 mm.</p>
      </Kelompok>

      <Kelompok judul="Huruf">
        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="Jenis huruf"
            pilihan={HURUF_SURAT.map((h) => ({ id: h, label: LABEL_HURUF[h] }))}
            nilai={nilai.huruf.keluarga}
            onUbah={(id) => ubah((t) => void (t.huruf.keluarga = HURUF_SURAT.find((h) => h === id) ?? t.huruf.keluarga))}
          />
          <Select
            label="Ukuran huruf"
            pilihan={UKURAN_HURUF_PT.map((u) => ({ id: String(u), label: `${angka(u)} pt` }))}
            nilai={String(nilai.huruf.ukuranPt)}
            onUbah={(id) => ubah((t) => void (t.huruf.ukuranPt = UKURAN_HURUF_PT.find((u) => String(u) === id) ?? t.huruf.ukuranPt))}
          />
          <Select
            label="Jarak baris"
            pilihan={SPASI_BARIS.map((s) => ({ id: String(s), label: angka(s) }))}
            nilai={String(nilai.huruf.spasi)}
            onUbah={(id) => ubah((t) => void (t.huruf.spasi = SPASI_BARIS.find((s) => String(s) === id) ?? t.huruf.spasi))}
          />
        </div>
      </Kelompok>

      <Kelompok judul="Tanda tangan">
        <RadioGroup
          label="Posisi blok tanda tangan"
          pilihan={POSISI_TANDA_TANGAN.map((p) => ({ id: p, label: p === 'kanan' ? 'Di kanan' : 'Di tengah' }))}
          nilai={nilai.tandaTangan.posisi}
          onUbah={(id) => ubah((t) => void (t.tandaTangan.posisi = id === 'tengah' ? 'tengah' : 'kanan'))}
        />
        <ol aria-label="Urutan unsur tanda tangan" className="flex flex-col gap-1">
          {tampil.map(({ k, i }, n) => (
            <li key={k} className="flex items-center gap-2 rounded-1 border border-garis bg-lembar py-1 pr-1 pl-3">
              <span className="flex-1">{LABEL_UNSUR[k]}</span>
              <Tombol
                varian="teks"
                ukuran="kecil"
                aria-label={`Naikkan ${LABEL_UNSUR[k]}`}
                isDisabled={n === 0}
                ikon={<ArrowUp aria-hidden size={14} />}
                onPress={() => geser(i, -1)}
              >
                Naik
              </Tombol>
              <Tombol
                varian="teks"
                ukuran="kecil"
                aria-label={`Turunkan ${LABEL_UNSUR[k]}`}
                isDisabled={n === tampil.length - 1}
                ikon={<ArrowDown aria-hidden size={14} />}
                onPress={() => geser(i, 1)}
              >
                Turun
              </Tombol>
            </li>
          ))}
        </ol>
        {galat['tandaTangan.urutan'] && (
          <p role="alert" className={gayaGalat}>
            {galat['tandaTangan.urutan']}
          </p>
        )}
        <Checkbox isSelected={nilai.tandaTangan.nip} onChange={(v) => ubah((t) => void (t.tandaTangan.nip = v))}>
          Tampilkan NIP penanda tangan
        </Checkbox>
        <p className={gayaKeterangan}>NIP diisi Sekretaris Desa di Pengaturan › Pengguna. Penanda tangan tanpa NIP tidak menampilkan barisnya.</p>
        <Checkbox isSelected={nilai.tandaTangan.tempatCap} onChange={(v) => ubah((t) => void (t.tandaTangan.tempatCap = v))}>
          Sediakan tempat cap
        </Checkbox>
      </Kelompok>

      <Kelompok judul="QR dan kode verifikasi">
        <RadioGroup
          label="Posisi QR dan kode verifikasi"
          pilihan={POSISI_QR.map((p) => ({
            id: p, label: p === 'kiri-bawah' ? 'Kiri bawah' : p === 'kanan-bawah' ? 'Kanan bawah' : 'Di bawah tanda tangan',
          }))}
          nilai={nilai.qr.posisi}
          onUbah={(id) => ubah((t) => void (t.qr.posisi = POSISI_QR.find((p) => p === id) ?? t.qr.posisi))}
        />
        <p className="text-teks-kecil text-tinta-2">QR, kode verifikasi, dan nomor surat selalu tercetak.</p>
      </Kelompok>
    </div>
  )
}

/** Pratinjau lembar langsung: jenis surat yang dipilih (bawaan SKTM) dengan data contoh, nomor dan kode verifikasi contoh. */
function PratinjauTataLetak({ tataLetak, sekarang }: { tataLetak: TataLetak; sekarang?: Date }) {
  const { desa, dusun } = useSesiAdmin()
  const hariIni = useMemo(() => sekarang ?? new Date(), [sekarang])
  const daftar = useQuery(opsiJenisSurat())
  const [pilihan, setPilihan] = useState<string | null>(null)
  const tersedia = (daftar.data?.data ?? []).filter((j) => j.diarsipkan === null)
  const jenisId = pilihan ?? tersedia.find((j) => j.kode === 'SKTM')?.id ?? tersedia[0]?.id ?? ''
  const detail = useQuery({ ...opsiDetailJenisSurat(jenisId), enabled: jenisId !== '' })
  const d = detail.data
  const lembar = d
    ? denganContohTerbit(
        dataLembar(
          {
            // Pengecualian jenis dilepas: yang disunting di sini adalah tata letak desa.
            jenis: { ...d.jenis, tataLetak: null }, pemohon: d.contoh.pemohon, subjek: d.contoh.subjek, mutasi: d.contoh.mutasi,
            pengaturan: { ...d.pengaturan, tataLetak }, pejabat: d.pejabat, permohonan: { terbit: null },
          },
          { desa, dusun, isian: d.contoh.isian, hariIni, asal: asalDesa(desa.slug) },
        ),
        { desa, asal: asalDesa(desa.slug), jenis: d.jenis, hariIni },
      )
    : null
  return (
    <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
      <Select
        label="Jenis surat untuk pratinjau"
        pilihan={tersedia.map((j) => ({ id: j.id, label: j.nama }))}
        nilai={jenisId || null}
        onUbah={(id) => id && setPilihan(id)}
      />
      {detail.isError ? (
        <ErrorState pesan={pesanGalat(detail.error)} onCobaLagi={() => void detail.refetch()} />
      ) : lembar ? (
        <PratinjauLembar label="Pratinjau surat" lebarCm={lebarLembarCm(lembar.tataLetak)}>
          <LembarSurat {...lembar} penanda={<Cap varian="draf" />} />
        </PratinjauLembar>
      ) : (
        <BarisKerangka jumlah={6} label="Memuat pratinjau…" />
      )}
      <p className="text-teks-kecil text-tinta-2">Nomor, kode verifikasi, QR, dan NIP pada pratinjau hanya contoh.</p>
    </div>
  )
}

type Props = { onKotor?: (kotor: boolean) => void; sekarang?: Date }

/** Pengaturan › Tata letak surat (SPEC-V0.2 12.2): satu tata letak untuk semua surat desa; jenis boleh punya pengecualian. */
export function TataLetakSuratDesa({ onKotor, sekarang }: Props) {
  const kueri = useQuery(opsiTataLetak())
  return (
    <div className="flex flex-col gap-6">
      <KepalaPengaturan aktif="tata-letak-surat" />
      {kueri.isPending ? (
        <BarisKerangka jumlah={8} label="Memuat tata letak surat…" />
      ) : kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : (
        <FormTataLetak data={kueri.data} onKotor={onKotor} sekarang={sekarang} />
      )}
    </div>
  )
}

function FormTataLetak({ data, onKotor, sekarang }: Props & { data: TataLetak }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<TataLetak>(data)
  const [galat, setGalat] = useState<Record<string, string>>({})
  const wadah = useRef<HTMLDivElement>(null)
  const mengirim = useRef(false)
  const kotor = JSON.stringify(form) !== JSON.stringify(data)

  useEffect(() => {
    onKotor?.(kotor)
  }, [kotor, onKotor])

  const tandai = (g: Record<string, string>) => {
    setGalat(g)
    fokusIsianSalah(wadah.current)
  }
  const simpan = useMutation({
    mutationFn: (t: TataLetak) => simpanTataLetak(t),
    onSuccess: (baru) => {
      queryClient.setQueryData(kunciTataLetak, baru)
      setForm(baru)
      setGalat({})
      // Pratinjau draf dan jenis surat membawa pengaturan desa; muat ulang supaya ikut tata letak baru.
      void queryClient.invalidateQueries({ queryKey: kunciSurat.jenis })
      void segarkanSurat(queryClient)
      tampilkanToast({ pesan: 'Tata letak surat disimpan. Surat yang sudah terbit tidak berubah.', nada: 'berhasil' })
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
    const hasil = tataLetakSuratSchema.safeParse(form)
    if (!hasil.success) {
      tandai(galatDariZod(hasil.error))
      return
    }
    mengirim.current = true
    simpan.mutate(hasil.data)
  }

  return (
    <div ref={wadah} className="flex flex-col gap-6">
      <p className="max-w-2xl text-tinta-2">
        Tata letak ini dipakai semua surat desa, kecuali jenis surat yang punya tata letak khusus. Surat yang sudah terbit
        menyimpan tata letaknya sendiri dan tidak ikut berubah.
      </p>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
        <PenyuntingTataLetak
          nilai={form}
          onUbah={(t) => {
            setForm(t)
            setGalat({})
          }}
          galat={galat}
        />
        <PratinjauTataLetak tataLetak={form} sekarang={sekarang} />
      </div>
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 border-t border-garis bg-kertas py-3">
        <Tombol
          isDisabled={!kotor || simpan.isPending}
          onPress={() => {
            setForm(data)
            setGalat({})
          }}
        >
          Batalkan perubahan
        </Tombol>
        <Tombol varian="utama" memuat={simpan.isPending} onPress={kirim}>
          Simpan
        </Tombol>
      </div>
    </div>
  )
}
