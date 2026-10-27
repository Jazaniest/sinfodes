import { Paperclip } from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type FormEvent } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciKonsol, tambahKabupaten } from '@/api/konsol'
import { DOMAIN_INDUK } from '@/app/alamat'
import { labelKabupaten } from '@/domain/alamat/alamat'
import { formatUkuranKb } from '@/domain/format/angka'
import { galatDariZod } from '@/domain/format/galat-isian'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { kodeKabupatenSah, MAKS_SURAT_PENUNJUKAN_MB, tambahKabupatenSchema } from '@/domain/konsol/kabupaten'
import { daftarProvinsi, kabupatenDi } from '@/domain/wilayah/kode-wilayah'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { DatePicker } from '@/ui/isian/DatePicker'
import { FileDrop } from '@/ui/isian/FileDrop'
import { gayaGalat } from '@/ui/isian/gaya'
import { Select } from '@/ui/isian/Select'
import { TextField } from '@/ui/isian/TextField'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'

type Props = { onSelesai: (kode: string) => void; onBatal: () => void }

const PROVINSI = daftarProvinsi()
const ukuranKb = (berkas: File) => Math.max(1, Math.ceil(berkas.size / 1024))

/**
 * Tambah kabupaten mitra (SPEC-V0.2 §7): kabupaten dari tabel wilayah, Admin pertama, dan surat penunjukan (PDF). Kota belum
 * bisa dipilih. Bentrok dari server tampil di kolomnya.
 */
export function TambahKabupaten({ onSelesai, onBatal }: Props) {
  const queryClient = useQueryClient()
  const [provinsi, setProvinsi] = useState<string | null>(null)
  const [kabupaten, setKabupaten] = useState<string | null>(null)
  const [namaAdmin, setNamaAdmin] = useState('')
  const [emailAdmin, setEmailAdmin] = useState('')
  const [nomorSurat, setNomorSurat] = useState('')
  const [tanggalSurat, setTanggalSurat] = useState<string | null>(null)
  const [surat, setSurat] = useState<File | null>(null)
  const [galat, setGalat] = useState<Record<string, string>>({})
  const wadah = useRef<HTMLFormElement>(null)
  const tandai = (g: Record<string, string>) => {
    setGalat(g)
    fokusIsianSalah(wadah.current)
  }
  const simpan = useMutation({
    mutationFn: (isian: Parameters<typeof tambahKabupaten>[0]) => tambahKabupaten(isian, surat),
    onSuccess: async (hasil) => {
      tampilkanToast({
        pesan: `Kabupaten ${hasil.nama} kini mitra. Undangan terkirim ke ${hasil.emailAdmin} (tiruan); di demo, akunnya langsung aktif dengan kata sandi demo.`,
        nada: 'berhasil',
      })
      await queryClient.invalidateQueries({ queryKey: kunciKonsol.semua })
      onSelesai(hasil.kode)
    },
    onError: (e) => (e instanceof GalatApi && Object.keys(e.fields).length > 0 ? tandai(e.fields) : setGalat({ _: pesanGalat(e) })),
  })
  const pilihanKabupaten = provinsi ? kabupatenDi(provinsi).filter((k) => kodeKabupatenSah(k.kode)) : []
  const namaKabupaten = pilihanKabupaten.find((k) => k.kode === kabupaten)?.nama

  const kirim = (e: FormEvent) => {
    e.preventDefault()
    if (simpan.isPending) return
    const isian = tambahKabupatenSchema.safeParse({ kabupaten: kabupaten ?? '', namaAdmin, emailAdmin, nomorSurat, tanggalSurat: tanggalSurat ?? '' })
    const g = { ...(isian.success ? {} : galatDariZod(isian.error)), ...(surat ? {} : { suratPenunjukan: 'Unggah surat penunjukan (PDF).' }) }
    if (!isian.success || Object.keys(g).length > 0) {
      tandai(g)
      return
    }
    setGalat({})
    simpan.mutate(isian.data)
  }

  return (
    <div className="max-w-2xl">
      <PageHeader jejak={[{ label: 'Kabupaten', href: '/konsol/kabupaten' }]} judul="Tambah kabupaten" />
      <form ref={wadah} onSubmit={kirim} noValidate className="flex flex-col gap-5 py-6">
        {galat._ && <Banner nada="galat">{galat._}</Banner>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Provinsi"
            pilihan={PROVINSI.map((p) => ({ id: p.kode, label: p.nama }))}
            nilai={provinsi}
            onUbah={(id) => {
              setProvinsi(id)
              setKabupaten(null)
            }}
          />
          <Select
            label="Kabupaten"
            pilihan={pilihanKabupaten.map((k) => ({ id: k.kode, label: k.nama }))}
            nilai={kabupaten}
            isDisabled={pilihanKabupaten.length === 0}
            keterangan={provinsi && pilihanKabupaten.length === 0 ? 'Kabupaten provinsi ini belum ada di tabel wilayah demo.' : undefined}
            galat={galat.kabupaten}
            onUbah={(id) => {
              setKabupaten(id)
              setGalat((l) => ({ ...l, kabupaten: '' }))
            }}
          />
        </div>
        {namaKabupaten && (
          <p className="-mt-2 text-teks-kecil text-tinta-2">
            Alamat portal: <span className="font-mono">{`${labelKabupaten(namaKabupaten)}.${DOMAIN_INDUK}`}</span>
          </p>
        )}
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-1 text-label font-medium text-tinta-2 uppercase">Admin pertama</legend>
          <TextField label="Nama Admin" value={namaAdmin} onChange={setNamaAdmin} galat={galat.namaAdmin || undefined} isRequired />
          <TextField
            label="Email Admin"
            type="email"
            value={emailAdmin}
            onChange={setEmailAdmin}
            keterangan="Pejabat yang ditunjuk di surat. Undangan dikirim ke email ini; Admin lalu menambah pengguna kabupaten lainnya."
            galat={galat.emailAdmin || undefined}
            isRequired
          />
        </fieldset>
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-1 text-label font-medium text-tinta-2 uppercase">Surat penunjukan</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Nomor surat" value={nomorSurat} onChange={setNomorSurat} galat={galat.nomorSurat || undefined} isRequired />
            <DatePicker
              label="Tanggal surat"
              nilai={tanggalSurat}
              onUbah={setTanggalSurat}
              maks={tanggalIsoWib(new Date())}
              galat={galat.tanggalSurat || undefined}
              isRequired
            />
          </div>
          {surat ? (
            <div className="flex items-center gap-3 rounded-1 border border-garis bg-lembar px-3 py-2">
              <Paperclip aria-hidden size={18} className="shrink-0 text-tinta-2" />
              <span className="min-w-0 flex-1 truncate">{`${surat.name} · ${formatUkuranKb(ukuranKb(surat))}`}</span>
              <Tombol varian="teks" ukuran="kecil" onPress={() => setSurat(null)}>
                Ganti berkas
              </Tombol>
            </div>
          ) : (
            <FileDrop
              label="Surat penunjukan (PDF)"
              terima={['.pdf']}
              maksMb={MAKS_SURAT_PENUNJUKAN_MB}
              keterangan={`PDF, paling besar ${MAKS_SURAT_PENUNJUKAN_MB} MB. Demo hanya menyimpan nama dan ukuran berkasnya.`}
              onPilih={(berkas) => {
                setSurat(berkas)
                setGalat((l) => ({ ...l, suratPenunjukan: '' }))
              }}
            />
          )}
          {galat.suratPenunjukan && (
            <p role="alert" className={gayaGalat}>
              {galat.suratPenunjukan}
            </p>
          )}
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <Tombol type="submit" varian="utama" memuat={simpan.isPending}>
            Simpan dan kirim undangan
          </Tombol>
          <Tombol onPress={onBatal}>Batal</Tombol>
        </div>
      </form>
    </div>
  )
}
