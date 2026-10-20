import { Plus, Trash } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciPengaturan, opsiPengaturanDesa, simpanIdentitas } from '@/api/pengaturan'
import { kunciSesi } from '@/api/sesi'
import { MAKS_GAMBAR_KB } from '@/domain/format/gambar'
import { formDariIdentitas, isianIdentitas, periksaIdentitas, type FormIdentitas, type PengaturanDesa } from '@/domain/pengaturan/identitas'
import { useBoleh } from '@/features/admin/useBoleh'
import { KopSurat } from '@/ui/dokumen/KopSurat'
import { PratinjauLembar } from '@/ui/dokumen/PratinjauLembar'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { gayaGalat, gayaKeterangan } from '@/ui/isian/gaya'
import { TextField } from '@/ui/isian/TextField'
import { TimeField } from '@/ui/isian/TimeField'
import { Tautan } from '@/ui/navigasi/Tautan'
import { BagianIsian, FormulirBagian } from '@/ui/tata-letak/FormulirBagian'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { KepalaPengaturan } from './TabPengaturan'
import { UnggahGambar } from './UnggahGambar'

const BAGIAN = [
  { id: 'identitas-desa', judul: 'Identitas desa' },
  { id: 'identitas-kontak', judul: 'Kantor dan kontak' },
  { id: 'identitas-jam', judul: 'Jam layanan' },
  { id: 'identitas-lambang', judul: 'Lambang dan kop surat' },
]
const MAKS_BARIS_JAM = 7

type Props = { onKotor?: (kotor: boolean) => void }

/** Pengaturan › Identitas (SPEC §8). Data dimuat di sini; formulirnya di `FormIdentitasDesa`. */
export function Identitas({ onKotor }: Props) {
  const kueri = useQuery(opsiPengaturanDesa())
  return (
    <div className="flex flex-col gap-6">
      <KepalaPengaturan aktif="identitas" />
      {kueri.isPending ? (
        <BarisKerangka jumlah={8} label="Memuat identitas desa…" />
      ) : kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : (
        <FormIdentitasDesa data={kueri.data} onKotor={onKotor} />
      )}
    </div>
  )
}

const tanpaKunci = (g: Record<string, string>, awalan: string) =>
  Object.fromEntries(Object.entries(g).filter(([k]) => k !== awalan && !k.startsWith(`${awalan}.`)))

function FormIdentitasDesa({ data, onKotor }: { data: PengaturanDesa; onKotor?: (kotor: boolean) => void }) {
  const queryClient = useQueryClient()
  const boleh = useBoleh()
  const awal = useMemo(() => formDariIdentitas(data.identitas), [data])
  const [form, setForm] = useState<FormIdentitas>(awal)
  const [galat, setGalat] = useState<Record<string, string>>({})
  const wadah = useRef<HTMLDivElement>(null)
  const mengirim = useRef(false)
  const kotor = JSON.stringify(form) !== JSON.stringify(awal)

  useEffect(() => {
    onKotor?.(kotor)
  }, [kotor, onKotor])

  const ubah = <K extends keyof FormIdentitas>(kunci: K, nilai: FormIdentitas[K]) => {
    setForm((lama) => ({ ...lama, [kunci]: nilai }))
    setGalat((g) => tanpaKunci(g, kunci))
  }
  const ubahJam = (i: number, sebagian: Partial<FormIdentitas['jamLayanan'][number]>) => {
    setForm((lama) => ({ ...lama, jamLayanan: lama.jamLayanan.map((j, k) => (k === i ? { ...j, ...sebagian } : j)) }))
    setGalat((g) => tanpaKunci(tanpaKunci(g, `jamLayanan.${i}`), 'jamLayanan'))
  }
  const hapusJam = (i: number) => {
    setForm((lama) => ({ ...lama, jamLayanan: lama.jamLayanan.filter((_, k) => k !== i) }))
    // Urutan bergeser, jadi galat baris lama tidak lagi menunjuk baris yang benar.
    setGalat((g) => tanpaKunci(g, 'jamLayanan'))
  }
  const tambahJam = () => setForm((lama) => ({ ...lama, jamLayanan: [...lama.jamLayanan, { hari: '', buka: '08:00', tutup: '15:00' }] }))
  const tandai = (g: Record<string, string>) => {
    setGalat(g)
    fokusIsianSalah(wadah.current)
  }

  const simpan = useMutation({
    mutationFn: () => simpanIdentitas(isianIdentitas(form)),
    onSuccess: (baru) => {
      queryClient.setQueryData(kunciPengaturan.desa, baru)
      setForm(formDariIdentitas(baru.identitas))
      // Nama desa, alamat, dan lambang dipakai sidebar dan kop surat (fokus review 5).
      void queryClient.invalidateQueries({ queryKey: kunciSesi })
      tampilkanToast({ pesan: 'Identitas desa disimpan.', nada: 'berhasil' })
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
    const g = periksaIdentitas(form)
    if (Object.keys(g).length > 0) {
      tandai(g)
      return
    }
    mengirim.current = true
    simpan.mutate()
  }

  const kop = {
    kabupaten: data.kabupaten,
    kecamatan: data.kecamatan,
    desa: form.nama.trim() || data.identitas.nama,
    alamat: form.alamatKantor,
    kodePos: form.kodePos,
    surel: form.surel,
    lambang: form.lambang,
  }

  return (
    <div ref={wadah}>
      <FormulirBagian
        label="Identitas desa"
        bagian={BAGIAN}
        aksi={
          <>
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
          </>
        }
      >
        <BagianIsian id="identitas-desa" nomor={1} judul="Identitas desa">
          <TextField label="Nama desa" value={form.nama} onChange={(v) => ubah('nama', v)} galat={galat.nama} isRequired />
          <TextField
            label="Kode desa"
            value={form.kodeDesa}
            onChange={(v) => ubah('kodeDesa', v)}
            galat={galat.kodeDesa}
            keterangan="Kode wilayah Kemendagri, mis. 14.05.09.2009."
            isRequired
          />
          <TextField label="Kecamatan" value={data.kecamatan} isReadOnly />
          <TextField label="Kabupaten" value={data.kabupaten} isReadOnly keterangan="Kecamatan dan kabupaten diatur saat desa didaftarkan." />
          <div className="flex flex-col gap-1 sm:col-span-2">
            <p className="text-teks-kecil font-medium">Kepala desa aktif</p>
            <p>{data.kepalaDesa ?? 'Belum ada akun Kepala Desa yang aktif'}</p>
            <p className={gayaKeterangan}>
              Diambil dari akun Kepala Desa yang aktif dan dipakai di blok tanda tangan surat.{' '}
              {boleh('pengguna.kelola') ? (
                <Tautan href="/admin/pengaturan/pengguna">Atur di tab Pengguna</Tautan>
              ) : (
                'Diatur Sekretaris Desa di tab Pengguna.'
              )}
            </p>
          </div>
        </BagianIsian>
        <BagianIsian id="identitas-kontak" nomor={2} judul="Kantor dan kontak">
          <TextField
            label="Alamat kantor"
            value={form.alamatKantor}
            onChange={(v) => ubah('alamatKantor', v)}
            galat={galat.alamatKantor}
            isRequired
            className="sm:col-span-2"
          />
          <TextField label="Kode pos" inputMode="numeric" value={form.kodePos} onChange={(v) => ubah('kodePos', v)} galat={galat.kodePos} isRequired />
          <TextField label="Surel" type="email" value={form.surel} onChange={(v) => ubah('surel', v)} galat={galat.surel} isRequired />
          <TextField
            label="Telepon atau WhatsApp kantor"
            type="tel"
            value={form.telepon}
            onChange={(v) => ubah('telepon', v)}
            galat={galat.telepon}
            keterangan="Tampil di website desa sebagai kontak WhatsApp kantor."
            isRequired
          />
        </BagianIsian>
        <BagianIsian id="identitas-jam" nomor={3} judul="Jam layanan">
          <div className="flex flex-col gap-4 sm:col-span-2">
            {form.jamLayanan.map((j, i) => (
              <fieldset key={i} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto] sm:items-start">
                <legend className="sr-only">Jam layanan {i + 1}</legend>
                <TextField
                  label="Hari"
                  value={j.hari}
                  placeholder="Senin-Kamis"
                  onChange={(v) => ubahJam(i, { hari: v })}
                  galat={galat[`jamLayanan.${i}.hari`]}
                />
                <TimeField label="Buka" nilai={j.buka} onUbah={(v) => ubahJam(i, { buka: v })} galat={galat[`jamLayanan.${i}.buka`]} />
                <TimeField label="Tutup" nilai={j.tutup} onUbah={(v) => ubahJam(i, { tutup: v })} galat={galat[`jamLayanan.${i}.tutup`]} />
                <Tombol
                  varian="teks"
                  aria-label={`Hapus jam layanan ${i + 1}`}
                  ikon={<Trash aria-hidden size={16} />}
                  isDisabled={form.jamLayanan.length === 1}
                  onPress={() => hapusJam(i)}
                  className="sm:mt-6"
                >
                  Hapus
                </Tombol>
              </fieldset>
            ))}
            {galat.jamLayanan && (
              <p role="alert" className={gayaGalat}>
                {galat.jamLayanan}
              </p>
            )}
            {form.jamLayanan.length < MAKS_BARIS_JAM && (
              <div>
                <Tombol varian="teks" ikon={<Plus aria-hidden size={16} />} onPress={tambahJam}>
                  Tambah jam layanan
                </Tombol>
              </div>
            )}
          </div>
        </BagianIsian>
        <BagianIsian id="identitas-lambang" nomor={4} judul="Lambang dan kop surat">
          <div className="flex flex-col gap-4 sm:col-span-2">
            <UnggahGambar
              label="Lambang"
              nilai={form.lambang}
              maksKb={MAKS_GAMBAR_KB.lambang}
              onUbah={(v) => ubah('lambang', v)}
              galat={galat.lambang}
              keterangan={`PNG, JPG, WebP, atau SVG, paling besar ${MAKS_GAMBAR_KB.lambang} KB. Tanpa lambang, kop memakai lambang tiruan netral.`}
            />
            <PratinjauLembar label="Pratinjau kop surat">
              <div data-terang className="w-[21cm] bg-lembar px-[2cm] pt-[1.2cm] pb-[0.8cm] font-surat-tinos text-[12pt] text-tinta">
                <KopSurat kop={kop} />
              </div>
            </PratinjauLembar>
          </div>
        </BagianIsian>
      </FormulirBagian>
    </div>
  )
}
