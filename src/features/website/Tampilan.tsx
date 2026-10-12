import { Check } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Label, Radio, RadioGroup } from 'react-aria-components'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciWebsite, opsiTampilan, simpanTampilan } from '@/api/website'
import { MAKS_GAMBAR_KB } from '@/domain/format/gambar'
import { galatDariZod } from '@/domain/format/galat-isian'
import { formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import {
  AKSEN_WEBSITE, ID_AKSEN, LABEL_MOTIF, MOTIF_WEBSITE, ubahTampilanSchema, type TampilanWebsite, type UbahTampilan,
} from '@/domain/website/schema'
import { cn } from '@/ui/cn'
import { BilahAksi } from '@/ui/tata-letak/FormulirBagian'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { Nameplate, PitaMotif } from '@/ui/website/Nameplate'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { UnggahGambar } from '../pengaturan/UnggahGambar'
import { KepalaWebsite } from './TabWebsite'

type Props = { onKotor?: (kotor: boolean) => void; sekarang?: Date }

const judulBagian = 'font-serif text-judul-bagian font-medium'
const kartuPilihan = ({ isSelected }: { isSelected: boolean }) =>
  cn(
    'flex cursor-default items-center gap-3 rounded-1 border bg-lembar px-3 py-2.5 outline-none',
    'data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-biru',
    isSelected ? 'border-tinta' : 'border-garis-input hover:border-tinta-2',
  )

/** Website Desa › Tampilan (SPEC §9): aksen, motif, foto sampul, dan logo, dengan pratinjau langsung. */
export function Tampilan({ onKotor, sekarang }: Props) {
  const kueri = useQuery(opsiTampilan())
  return (
    <div className="flex flex-col gap-6">
      <KepalaWebsite aktif="tampilan" />
      {kueri.isPending ? (
        <BarisKerangka jumlah={6} label="Memuat tampilan website…" />
      ) : kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : (
        <FormTampilan data={kueri.data} onKotor={onKotor} sekarang={sekarang} />
      )}
    </div>
  )
}

const formDari = (t: TampilanWebsite): UbahTampilan => ({ aksen: t.aksen, motif: t.motif, sampul: t.sampul, logo: t.logo })

function FormTampilan({ data, onKotor, sekarang }: Props & { data: TampilanWebsite }) {
  const queryClient = useQueryClient()
  const { desa } = useSesiAdmin()
  const awal = useMemo(() => formDari(data), [data])
  const [form, setForm] = useState<UbahTampilan>(awal)
  const [galat, setGalat] = useState<Record<string, string>>({})
  const mengirim = useRef(false)
  const kotor = JSON.stringify(form) !== JSON.stringify(awal)
  const aksen = AKSEN_WEBSITE[form.aksen].hex

  useEffect(() => {
    onKotor?.(kotor)
  }, [kotor, onKotor])

  const ubah = <K extends keyof UbahTampilan>(kunci: K, nilai: UbahTampilan[K]) => {
    setForm((l) => ({ ...l, [kunci]: nilai }))
    setGalat((g) => ({ ...g, [kunci]: '' }))
  }

  const simpan = useMutation({
    mutationFn: () => simpanTampilan(form),
    onSuccess: (baru) => {
      queryClient.setQueryData(kunciWebsite.tampilan, baru)
      setForm(formDari(baru))
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
    const hasil = ubahTampilanSchema.safeParse(form)
    if (!hasil.success) {
      setGalat(galatDariZod(hasil.error))
      return
    }
    mengirim.current = true
    simpan.mutate()
  }

  return (
    <>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-4">
            <h2 className={judulBagian}>Warna dan motif</h2>
            <RadioGroup
              value={form.aksen}
              onChange={(v) => {
                const a = ID_AKSEN.find((x) => x === v)
                if (a) ubah('aksen', a)
              }}
              className="flex flex-col gap-2"
            >
              <Label className="text-teks-kecil font-medium">Warna aksen</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                {ID_AKSEN.map((id) => (
                  <Radio key={id} value={id} className={kartuPilihan}>
                    {({ isSelected }) => (
                      <>
                        <span aria-hidden className="size-6 shrink-0 rounded-penuh" style={{ backgroundColor: AKSEN_WEBSITE[id].hex }} />
                        <span className="text-teks-kecil">{AKSEN_WEBSITE[id].label}</span>
                        {isSelected && <Check aria-hidden size={14} className="ml-auto" />}
                      </>
                    )}
                  </Radio>
                ))}
              </div>
            </RadioGroup>
            <RadioGroup
              value={form.motif}
              onChange={(v) => {
                const m = MOTIF_WEBSITE.find((x) => x === v)
                if (m) ubah('motif', m)
              }}
              className="flex flex-col gap-2"
            >
              <Label className="text-teks-kecil font-medium">Motif pita</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {MOTIF_WEBSITE.map((m) => (
                  <Radio key={m} value={m} className={kartuPilihan}>
                    {({ isSelected }) => (
                      <span className="flex w-full flex-col gap-2">
                        <span className="flex items-center gap-2">
                          <span className="text-teks-kecil">{LABEL_MOTIF[m]}</span>
                          {isSelected && <Check aria-hidden size={14} className="ml-auto" />}
                        </span>
                        <PitaMotif motif={m} aksen={aksen} />
                      </span>
                    )}
                  </Radio>
                ))}
              </div>
            </RadioGroup>
          </section>
          <section className="flex flex-col gap-4">
            <h2 className={judulBagian}>Foto sampul dan logo</h2>
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
        </div>
        <section aria-label="Pratinjau kepala halaman website" className="flex flex-col gap-3 self-start xl:sticky xl:top-6">
          <p className="text-label font-medium text-tinta-2 uppercase">Pratinjau</p>
          <div className="overflow-hidden rounded-2 border border-garis shadow-melayang">
            <Nameplate
              nama={desa.nama}
              kecamatan={desa.kecamatan.nama}
              kabupaten={desa.kabupaten.nama}
              aksen={aksen}
              motif={form.motif}
              logo={form.logo ?? desa.lambang ?? null}
              tanggal={formatTanggal(tanggalIsoWib(sekarang ?? new Date()), 'hari')}
            />
            <div className="bg-lembar p-5 pt-4">
              {form.sampul ? (
                <img src={form.sampul} alt="Foto sampul" className="aspect-[16/9] w-full rounded-1 object-cover" />
              ) : (
                <div className="flex aspect-[16/9] items-center justify-center rounded-1 border border-dashed border-garis-input bg-kertas-2 text-teks-kecil text-tinta-2">
                  Belum ada foto sampul
                </div>
              )}
            </div>
          </div>
          <p className="text-teks-kecil text-tinta-2">Template halaman sama untuk semua desa; yang berbeda adalah aksen, motif, sampul, dan logo.</p>
        </section>
      </div>
      <BilahAksi>
        <Tombol
          isDisabled={!kotor || simpan.isPending}
          onPress={() => {
            setForm(awal)
            setGalat({})
          }}
        >
          Batalkan perubahan
        </Tombol>
        <Tombol varian="utama" memuat={simpan.isPending} onPress={kirim}>
          Simpan
        </Tombol>
      </BilahAksi>
    </>
  )
}
