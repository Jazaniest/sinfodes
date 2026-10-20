import { Check } from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Label, Radio, RadioGroup } from 'react-aria-components'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciWebsite, simpanTema } from '@/api/website'
import { MAKS_GAMBAR_KB } from '@/domain/format/gambar'
import { galatDariZod } from '@/domain/format/galat-isian'
import { formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { gelapkanSampaiLolos, periksaTema, type Pemeriksaan } from '@/domain/website/kontras'
import { ASAL_MOTIF, ID_MOTIF, LABEL_MOTIF, type IdMotif } from '@/domain/website/motif'
import {
  ID_KEPADATAN, ID_LATAR, ID_PASANGAN_HURUF, ID_SUDUT, KEPADATAN, LATAR, PASANGAN_HURUF, SUDUT, temaDasarSchema, type IdKepadatan,
  type IdLatar, type IdPasanganHuruf, type IdSudut, type TemaDasar,
} from '@/domain/website/tema'
import { cn } from '@/ui/cn'
import { TextArea } from '@/ui/isian/TextArea'
import { BilahAksi } from '@/ui/tata-letak/FormulirBagian'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { muatPasanganHuruf } from '@/ui/website/huruf'
import { PitaMotif } from '@/ui/website/Nameplate'
import { useSesiAdmin } from '../../admin/sesi-konteks'
import { UnggahGambar } from '../../pengaturan/UnggahGambar'
import { PanelKontras } from './PanelKontras'
import { PemilihWarna } from './PemilihWarna'
import { Pratinjau } from './Pratinjau'
import { POLA_HEX } from './warna'

type Props = { data: TemaDasar; onKotor?: (kotor: boolean) => void; sekarang?: Date }

const judulBagian = 'font-serif text-judul-bagian font-medium'
const MAKS_SAMBUTAN = 120
const kartuPilihan = ({ isSelected }: { isSelected: boolean }) =>
  cn(
    'flex cursor-default items-start gap-3 rounded-1 border bg-lembar px-3 py-2.5 outline-none',
    'data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-biru',
    isSelected ? 'border-tinta' : 'border-garis-input hover:border-tinta-2',
  )

function Tanda({ terpilih }: { terpilih: boolean }) {
  return terpilih ? <Check aria-hidden size={14} className="mt-0.5 ml-auto shrink-0" /> : null
}

function Kelompok<T extends string>({
  label, nilai, onUbah, ids, kolom, children,
}: {
  label: string
  nilai: T
  onUbah: (v: T) => void
  ids: readonly T[]
  kolom: string
  children: (id: T, terpilih: boolean) => ReactNode
}) {
  return (
    <RadioGroup
      value={nilai}
      onChange={(v) => {
        const id = ids.find((x) => x === v)
        if (id) onUbah(id)
      }}
      className="flex flex-col gap-2"
    >
      <Label className="text-teks-kecil font-medium">{label}</Label>
      <div className={cn('grid gap-2', kolom)}>
        {ids.map((id) => (
          <Radio key={id} value={id} className={kartuPilihan}>
            {({ isSelected }) => (
              <>
                {children(id, isSelected)}
                <Tanda terpilih={isSelected} />
              </>
            )}
          </Radio>
        ))}
      </div>
    </RadioGroup>
  )
}

/** Kartu pasangan huruf: contohnya memakai hurufnya sendiri, dimuat saat kartu terlihat atau dipilih. */
function ContohHuruf({ id }: { id: IdPasanganHuruf }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const pengamat = new IntersectionObserver((entri) => {
      if (entri.some((e) => e.isIntersecting)) {
        void muatPasanganHuruf(id)
        pengamat.disconnect()
      }
    })
    pengamat.observe(el)
    return () => pengamat.disconnect()
  }, [id])
  const p = PASANGAN_HURUF[id]
  return (
    <span ref={ref} className="flex min-w-0 flex-col gap-0.5">
      <span className="text-label font-semibold tracking-wide text-tinta-2 uppercase">{p.label}</span>
      <span className="text-judul-bagian leading-tight" style={{ fontFamily: p.judul }}>
        Desa Sungai Sialang
      </span>
      <span className="text-teks-kecil text-tinta-2" style={{ fontFamily: p.isi }}>
        Surat dari rumah, tanpa antre.
      </span>
    </span>
  )
}

function ContohMotif({ id }: { id: IdMotif }) {
  return (
    <span className="flex w-full min-w-0 flex-col gap-1.5">
      <span className="text-teks-kecil font-medium">{LABEL_MOTIF[id]}</span>
      <span className="text-label text-tinta-2">{ASAL_MOTIF[id]}</span>
      <PitaMotif motif={id} />
    </span>
  )
}

const warnaSah = (w: string) => POLA_HEX.test(w)

/** Website Desa › Tampilan › Dasar (SPEC-V0.2 §11.1): warna, latar, huruf, sudut, kepadatan, motif, logo, sampul, dan halaman masuk warga. */
export function FormDasar({ data, onKotor, sekarang }: Props) {
  const queryClient = useQueryClient()
  const { desa } = useSesiAdmin()
  const [form, setForm] = useState<TemaDasar>(data)
  const [galat, setGalat] = useState<Record<string, string>>({})
  const mengirim = useRef(false)
  const kotor = JSON.stringify(form) !== JSON.stringify(data)

  useEffect(() => {
    onKotor?.(kotor)
  }, [kotor, onKotor])
  useEffect(() => {
    void muatPasanganHuruf(form.huruf)
  }, [form.huruf])

  const ubah = <K extends keyof TemaDasar>(kunci: K, nilai: TemaDasar[K]) => {
    setForm((l) => ({ ...l, [kunci]: nilai }))
    setGalat((g) => ({ ...g, [kunci]: '' }))
  }
  const ubahWarga = <K extends keyof TemaDasar['warga']>(kunci: K, nilai: TemaDasar['warga'][K]) => {
    setForm((l) => ({ ...l, warga: { ...l.warga, [kunci]: nilai } }))
    setGalat((g) => ({ ...g, [`warga.${kunci}`]: '' }))
  }

  const utamaSah = warnaSah(form.warnaUtama)
  const aksenSah = warnaSah(form.warnaAksen)
  // Pemeriksaan hanya untuk warna yang sudah berbentuk #RRGGBB; yang masih diketik ditandai di isiannya.
  const pemeriksaan = periksaTema({
    warnaUtama: utamaSah ? form.warnaUtama : data.warnaUtama,
    warnaAksen: aksenSah ? form.warnaAksen : data.warnaAksen,
    latar: form.latar,
  }).filter((p) => (p.kunci === 'aksen-latar' ? aksenSah : utamaSah))
  const gagalKontras = pemeriksaan.some((p) => !p.lolos)
  const hexRusak = !utamaSah || !aksenSah

  const gelapkan = (kunci: Pemeriksaan['kunci']) => {
    if (kunci === 'aksen-latar') {
      const baru = gelapkanSampaiLolos(form.warnaAksen, (h) => periksaTema({ ...form, warnaAksen: h }).every((p) => p.kunci !== 'aksen-latar' || p.lolos))
      ubah('warnaAksen', baru)
    } else {
      const baru = gelapkanSampaiLolos(form.warnaUtama, (h) => periksaTema({ ...form, warnaUtama: h }).every((p) => p.kunci === 'aksen-latar' || p.lolos))
      ubah('warnaUtama', baru)
    }
  }

  const simpan = useMutation({
    mutationFn: () => simpanTema(form),
    onSuccess: (baru) => {
      queryClient.setQueryData(kunciWebsite.situs, { terbit: baru })
      setForm(baru.tema)
      tampilkanToast({ pesan: 'Tampilan website disimpan.', nada: 'berhasil' })
    },
    onError: (e) => {
      if (e instanceof GalatApi && Object.keys(e.fields).length > 0) setGalat(e.fields)
      tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' })
    },
    onSettled: () => {
      mengirim.current = false
    },
  })
  const kirim = () => {
    if (mengirim.current) return
    const hasil = temaDasarSchema.safeParse(form)
    if (!hasil.success) {
      setGalat(galatDariZod(hasil.error))
      return
    }
    mengirim.current = true
    simpan.mutate()
  }

  const aksenPratinjau = aksenSah ? form.warnaAksen : data.warnaAksen
  const temaPratinjau = {
    ...form,
    warnaUtama: utamaSah ? form.warnaUtama : data.warnaUtama,
    warnaAksen: aksenPratinjau,
  }
  const panjangSambutan = form.warga.sambutan?.length ?? 0
  const dikunci = gagalKontras || hexRusak

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-4">
            <h2 className={judulBagian}>Warna</h2>
            <PemilihWarna judul="Warna utama" nilai={form.warnaUtama} onUbah={(v) => ubah('warnaUtama', v)} galat={galat.warnaUtama || undefined} keterangan="Dipakai untuk tautan, tombol, dan nama desa." />
            <PemilihWarna judul="Warna aksen" nilai={form.warnaAksen} onUbah={(v) => ubah('warnaAksen', v)} galat={galat.warnaAksen || undefined} keterangan="Dipakai untuk pita motif dan garis di panel." />
            <PanelKontras pemeriksaan={pemeriksaan} onGelapkan={gelapkan} />
            <Kelompok label="Latar" nilai={form.latar} onUbah={(v: IdLatar) => ubah('latar', v)} ids={ID_LATAR} kolom="sm:grid-cols-2">
              {(id) => (
                <span className="flex items-center gap-3">
                  <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-1 border border-garis" style={{ backgroundColor: LATAR[id].latar }}>
                    <span className="size-5 rounded-1 border border-garis" style={{ backgroundColor: LATAR[id].lembar }} />
                  </span>
                  <span className="text-teks-kecil">{LATAR[id].label}</span>
                </span>
              )}
            </Kelompok>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className={judulBagian}>Huruf, sudut, dan kepadatan</h2>
            <Kelompok label="Pasangan huruf" nilai={form.huruf} onUbah={(v: IdPasanganHuruf) => ubah('huruf', v)} ids={ID_PASANGAN_HURUF} kolom="sm:grid-cols-2">
              {(id) => <ContohHuruf id={id} />}
            </Kelompok>
            <Kelompok label="Sudut" nilai={form.sudut} onUbah={(v: IdSudut) => ubah('sudut', v)} ids={ID_SUDUT} kolom="sm:grid-cols-3">
              {(id) => (
                <span className="flex items-center gap-3">
                  <span aria-hidden className="size-8 shrink-0 border-2 border-tinta-2" style={{ borderRadius: SUDUT[id].besar }} />
                  <span className="text-teks-kecil">{SUDUT[id].label}</span>
                </span>
              )}
            </Kelompok>
            <Kelompok label="Kepadatan" nilai={form.kepadatan} onUbah={(v: IdKepadatan) => ubah('kepadatan', v)} ids={ID_KEPADATAN} kolom="sm:grid-cols-2">
              {(id) => (
                <span className="flex flex-col gap-0.5">
                  <span className="text-teks-kecil font-medium">{KEPADATAN[id].label}</span>
                  <span className="text-label text-tinta-2">Jarak antarbagian {id === 'lega' ? '2,5' : '1,5'} rem</span>
                </span>
              )}
            </Kelompok>
          </section>

          <section className="flex flex-col gap-4" style={{ '--desa-warna-aksen': aksenPratinjau } as CSSProperties}>
            <h2 className={judulBagian}>Motif</h2>
            <Kelompok label="Motif pita" nilai={form.motif} onUbah={(v: IdMotif) => ubah('motif', v)} ids={ID_MOTIF} kolom="sm:grid-cols-2 2xl:grid-cols-3">
              {(id) => <ContohMotif id={id} />}
            </Kelompok>
            <p className="text-teks-kecil text-tinta-2">Ubin motif digambar sendiri sebagai bentuk sederhana yang terinspirasi motifnya; asal daerah tertera di tiap kartu.</p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className={judulBagian}>Logo dan sampul</h2>
            <UnggahGambar
              label="Foto sampul"
              bentuk="sampul"
              nilai={form.sampul}
              maksKb={MAKS_GAMBAR_KB.sampul}
              onUbah={(v) => ubah('sampul', v)}
              galat={galat.sampul || undefined}
              keterangan={`Foto lanskap desa, disarankan selebar 1600 piksel. Paling besar ${MAKS_GAMBAR_KB.sampul} KB.`}
            />
            <UnggahGambar
              label="Logo"
              nilai={form.logo}
              maksKb={MAKS_GAMBAR_KB.logo}
              onUbah={(v) => ubah('logo', v)}
              galat={galat.logo || undefined}
              keterangan={`Kosongkan untuk memakai lambang desa. Paling besar ${MAKS_GAMBAR_KB.logo} KB.`}
            />
          </section>

          <section className="flex flex-col gap-4">
            <h2 className={judulBagian}>Halaman masuk warga</h2>
            <p className="text-teks-kecil text-tinta-2">Warna utama dan logo di atas juga dipakai halaman masuk dan layanan warga. Formulir masuknya sama di semua desa.</p>
            <UnggahGambar
              label="Foto latar halaman masuk"
              bentuk="sampul"
              nilai={form.warga.fotoLatar}
              maksKb={MAKS_GAMBAR_KB.sampul}
              onUbah={(v) => ubahWarga('fotoLatar', v)}
              galat={galat['warga.fotoLatar'] || undefined}
              keterangan={`Tampil di panel kiri pada layar lebar dan sebagai pita atas di HP. Paling besar ${MAKS_GAMBAR_KB.sampul} KB.`}
            />
            <div className="flex flex-col gap-1">
              <TextArea
                label="Kalimat sambutan"
                value={form.warga.sambutan ?? ''}
                onChange={(v) => ubahWarga('sambutan', v === '' ? null : v)}
                galat={galat['warga.sambutan'] || undefined}
                baris={2}
                keterangan="Tampil di bawah nama desa pada halaman masuk. Boleh dikosongkan."
              />
              <p aria-hidden className={cn('text-right text-teks-kecil', panjangSambutan > MAKS_SAMBUTAN ? 'text-merah' : 'text-tinta-2')}>
                {panjangSambutan}/{MAKS_SAMBUTAN}
              </p>
            </div>
          </section>
        </div>

        <Pratinjau
          tema={temaPratinjau}
          nama={desa.nama}
          kecamatan={desa.kecamatan.nama}
          kabupaten={desa.kabupaten.nama}
          lambang={desa.lambang ?? null}
          tanggal={formatTanggal(tanggalIsoWib(sekarang ?? new Date()), 'hari')}
        />
      </div>
      <BilahAksi>
        {dikunci && (
          <p role="status" className="mr-auto text-teks-kecil text-merah">
            {gagalKontras ? 'Perbaiki kontras dulu sebelum menyimpan.' : 'Perbaiki kode warna dulu sebelum menyimpan.'}
          </p>
        )}
        <Tombol
          isDisabled={!kotor || simpan.isPending}
          onPress={() => {
            setForm(data)
            setGalat({})
          }}
        >
          Batalkan perubahan
        </Tombol>
        <Tombol varian="utama" memuat={simpan.isPending} isDisabled={dikunci} onPress={kirim}>
          Simpan
        </Tombol>
      </BilahAksi>
    </>
  )
}
