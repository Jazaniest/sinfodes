import { Paperclip } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type FormEvent } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kirimSiaran, kunciKabupaten, opsiSasaranSiaran } from '@/api/kabupaten'
import { formatAngka, formatUkuranKb } from '@/domain/format/angka'
import { galatDariZod } from '@/domain/format/galat-isian'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { bolehKabupaten } from '@/domain/kabupaten/hak-akses'
import {
  isianSiaranSchema, jumlahDesaSasaran, kunciGalatSiaran, MAKS_LAMPIRAN_SIARAN_MB, type IsianSiaran, type SasaranSiaran,
} from '@/domain/kabupaten/siaran'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { Checkbox } from '@/ui/isian/Checkbox'
import { DatePicker } from '@/ui/isian/DatePicker'
import { FileDrop } from '@/ui/isian/FileDrop'
import { gayaGalat } from '@/ui/isian/gaya'
import { TextArea } from '@/ui/isian/TextArea'
import { TextField } from '@/ui/isian/TextField'
import { ConfirmDialog } from '@/ui/lapisan/ConfirmDialog'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiKabupaten } from '../sesi-konteks'
import { PilihSasaran } from './PilihSasaran'

const JEJAK = [{ label: 'Siaran', href: '/kabupaten/admin/siaran' }]
const ukuranKb = (berkas: File) => Math.max(1, Math.ceil(berkas.size / 1024))

type Props = { onTerkirim: (id: string) => void; onBatal: () => void }

/** Tulis siaran ke desa (SPEC-V0.2 §8.4 Menulis siaran), hanya untuk Admin Kabupaten. */
export function TulisSiaran(props: Props) {
  const { pengguna } = useSesiKabupaten()
  if (!bolehKabupaten(pengguna.peran, 'kab.siaran')) {
    return (
      <div className="flex max-w-2xl flex-col items-start gap-3">
        <PageHeader jejak={JEJAK} judul="Tulis siaran" />
        <p>Hanya Admin Kabupaten yang mengirim siaran.</p>
        <Tautan href="/kabupaten/admin/siaran">Kembali ke daftar siaran</Tautan>
      </div>
    )
  }
  return <Formulir {...props} />
}

/**
 * Siaran tidak bisa diubah setelah terkirim (keputusan rencana 7B-3), jadi isian diperiksa di peramban dulu, lalu dialog
 * konfirmasi menyebut banyaknya desa penerima. Galat dari server tampil di isiannya.
 */
function Formulir({ onTerkirim, onBatal }: Props) {
  const queryClient = useQueryClient()
  const sasaranTersedia = useQuery(opsiSasaranSiaran())
  const [judul, setJudul] = useState('')
  const [isi, setIsi] = useState('')
  const [lampiran, setLampiran] = useState<File | null>(null)
  const [perluTindakLanjut, setPerluTindakLanjut] = useState(false)
  const [tenggat, setTenggat] = useState<string | null>(null)
  const [sasaran, setSasaran] = useState<SasaranSiaran>({ jenis: 'semua' })
  const [galat, setGalat] = useState<Record<string, string>>({})
  const [siap, setSiap] = useState<IsianSiaran | null>(null)
  const wadah = useRef<HTMLFormElement>(null)
  const tandai = (g: Record<string, string>) => {
    setGalat(g)
    fokusIsianSalah(wadah.current)
  }
  const kirim = useMutation({
    mutationFn: (isian: IsianSiaran) => kirimSiaran(isian, lampiran),
    onSuccess: async (hasil) => {
      tampilkanToast({ pesan: `Siaran terkirim ke ${formatAngka(hasil.jumlahDesa)} desa.`, nada: 'berhasil' })
      setSiap(null)
      await queryClient.invalidateQueries({ queryKey: kunciKabupaten.siaran })
      onTerkirim(hasil.id)
    },
    onError: (e) => {
      setSiap(null)
      if (e instanceof GalatApi && Object.keys(e.fields).length > 0) tandai(kunciGalatSiaran(e.fields))
      else setGalat({ _: pesanGalat(e) })
    },
  })

  if (sasaranTersedia.isPending) return <BarisKerangka jumlah={6} label="Memuat formulir…" />
  if (sasaranTersedia.isError) return <ErrorState pesan={pesanGalat(sasaranTersedia.error)} onCobaLagi={() => void sasaranTersedia.refetch()} />
  const n = jumlahDesaSasaran(sasaranTersedia.data, sasaran)

  const periksa = (e: FormEvent) => {
    e.preventDefault()
    if (kirim.isPending) return
    const hasil = isianSiaranSchema.safeParse({ judul, isi, tindakLanjut: perluTindakLanjut ? { tenggat: tenggat ?? '' } : null, sasaran })
    if (!hasil.success) {
      tandai(kunciGalatSiaran(galatDariZod(hasil.error)))
      return
    }
    if (n === 0) {
      tandai({ sasaran: sasaran.jenis === 'kecamatan' ? 'Pilih paling sedikit satu kecamatan.' : 'Pilih paling sedikit satu desa.' })
      return
    }
    setGalat({})
    setSiap(hasil.data)
  }
  const hapusGalat = (kunci: string) => setGalat((g) => ({ ...g, [kunci]: '' }))

  return (
    <div className="max-w-2xl">
      <PageHeader jejak={JEJAK} judul="Tulis siaran" />
      <form ref={wadah} onSubmit={periksa} noValidate className="flex flex-col gap-5 py-6">
        {galat._ && <Banner nada="galat">{galat._}</Banner>}
        <TextField
          label="Judul"
          value={judul}
          onChange={(v) => {
            setJudul(v)
            hapusGalat('judul')
          }}
          galat={galat.judul || undefined}
          isRequired
        />
        <TextArea
          label="Isi"
          baris={10}
          value={isi}
          onChange={(v) => {
            setIsi(v)
            hapusGalat('isi')
          }}
          keterangan="Teks biasa. Pisahkan paragraf dengan baris kosong."
          galat={galat.isi || undefined}
          isRequired
        />
        <div className="flex flex-col gap-1.5">
          {lampiran ? (
            <div className="flex items-center gap-3 rounded-1 border border-garis bg-lembar px-3 py-2">
              <Paperclip aria-hidden size={18} className="shrink-0 text-tinta-2" />
              <span className="min-w-0 flex-1 truncate">{`${lampiran.name} · ${formatUkuranKb(ukuranKb(lampiran))}`}</span>
              <Tombol varian="teks" ukuran="kecil" onPress={() => setLampiran(null)}>
                Ganti berkas
              </Tombol>
            </div>
          ) : (
            <FileDrop
              label="Lampiran (PDF, opsional)"
              terima={['.pdf']}
              maksMb={MAKS_LAMPIRAN_SIARAN_MB}
              keterangan={`PDF, paling besar ${MAKS_LAMPIRAN_SIARAN_MB} MB. Demo hanya menyimpan nama dan ukuran berkasnya.`}
              onPilih={(berkas) => {
                setLampiran(berkas)
                hapusGalat('lampiran')
              }}
            />
          )}
          {galat.lampiran && (
            <p role="alert" className={gayaGalat}>
              {galat.lampiran}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <Checkbox
            isSelected={perluTindakLanjut}
            onChange={(v) => {
              setPerluTindakLanjut(v)
              hapusGalat('tenggat')
            }}
          >
            Perlu tindak lanjut
          </Checkbox>
          {perluTindakLanjut && (
            <DatePicker
              label="Tenggat tindak lanjut"
              nilai={tenggat}
              onUbah={(t) => {
                setTenggat(t)
                hapusGalat('tenggat')
              }}
              min={tanggalIsoWib(new Date())}
              keterangan="Desa menandai sudah ditindaklanjuti beserta catatannya."
              galat={galat.tenggat || undefined}
              className="max-w-xs"
              isRequired
            />
          )}
        </div>
        <PilihSasaran
          tersedia={sasaranTersedia.data}
          nilai={sasaran}
          onUbah={(s) => {
            setSasaran(s)
            hapusGalat('sasaran')
          }}
          galat={galat.sasaran || undefined}
        />
        <div className="flex flex-wrap gap-3">
          <Tombol type="submit" varian="utama" memuat={kirim.isPending}>
            Kirim siaran
          </Tombol>
          <Tombol onPress={onBatal}>Batal</Tombol>
        </div>
      </form>
      <ConfirmDialog
        isOpen={siap !== null}
        onOpenChange={(buka) => !buka && setSiap(null)}
        judul={`Kirim siaran ke ${formatAngka(n)} desa?`}
        labelSetuju="Kirim"
        memuat={kirim.isPending}
        onSetuju={() => siap && kirim.mutate(siap)}
      >
        Siaran tidak bisa diubah setelah terkirim, tetapi bisa ditarik.
      </ConfirmDialog>
    </div>
  )
}
