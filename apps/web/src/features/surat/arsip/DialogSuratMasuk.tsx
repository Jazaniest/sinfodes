import { Paperclip } from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { FileTrigger } from 'react-aria-components'
import { catatSuratMasuk, kunciArsip } from '@/api/arsip'
import { GalatApi, pesanGalat } from '@/api/galat'
import { formatAngka } from '@/domain/format/angka'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import {
  BERKAS_SCAN, isianSuratMasukSchema, MAKS_SCAN_MB, TUJUAN_DISPOSISI, type IsianSuratMasuk, type SuratMasuk,
} from '@/domain/surat/arsip'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { DatePicker } from '@/ui/isian/DatePicker'
import { gayaGalat, gayaKeterangan, gayaLabel } from '@/ui/isian/gaya'
import { Select } from '@/ui/isian/Select'
import { TextArea } from '@/ui/isian/TextArea'
import { TextField } from '@/ui/isian/TextField'
import { Dialog } from '@/ui/lapisan/Dialog'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'

type Props = { hariIni: Date; onTutup: () => void; onTersimpan: (s: SuratMasuk) => void }

const TANPA = 'tanpa'
const ukuranKb = (berkas: File) => formatAngka(Math.max(1, Math.ceil(berkas.size / 1024)))

/** Galat Zod → satu pesan per kolom (pesan pertama). */
function galatPerKolom(isu: readonly { path: readonly PropertyKey[]; message: string }[]): Record<string, string> {
  const hasil: Record<string, string> = {}
  for (const i of isu) hasil[String(i.path[0])] ??= i.message
  return hasil
}

/** Catat surat masuk (SPEC §7.4 layar 5). Nomor agenda diberikan saat disimpan; scan hanya disimpan nama dan ukurannya. */
export function DialogSuratMasuk({ hariIni, onTutup, onTersimpan }: Props) {
  const queryClient = useQueryClient()
  const hariIniIso = tanggalIsoWib(hariIni)
  const [isian, setIsian] = useState<IsianSuratMasuk>({
    diterima: hariIniIso, nomor: '', tanggalSurat: hariIniIso, pengirim: '', perihal: '', disposisiKepada: null, disposisiInstruksi: '',
  })
  const [scan, setScan] = useState<File | null>(null)
  const [galat, setGalat] = useState<Record<string, string>>({})
  const mengirim = useRef(false)
  const wadah = useRef<HTMLDivElement>(null)
  const tandai = (g: Record<string, string>) => {
    setGalat(g)
    fokusIsianSalah(wadah.current)
  }

  const ubah = <K extends keyof IsianSuratMasuk>(kunci: K, nilai: IsianSuratMasuk[K]) => {
    setIsian((lama) => ({ ...lama, [kunci]: nilai }))
    setGalat((lama) => {
      const sisa = { ...lama }
      delete sisa[kunci]
      return sisa
    })
  }
  const pilihScan = (berkas: File) => {
    const ekstensi = berkas.name.slice(berkas.name.lastIndexOf('.')).toLowerCase()
    const sah = (BERKAS_SCAN as readonly string[]).includes(ekstensi)
    if (!sah) setGalat((lama) => ({ ...lama, scan: 'Scan harus berkas PDF, JPG, atau PNG' }))
    else if (berkas.size > MAKS_SCAN_MB * 1024 * 1024) setGalat((lama) => ({ ...lama, scan: `Ukuran scan maksimal ${MAKS_SCAN_MB} MB` }))
    else {
      setScan(berkas)
      setGalat((lama) => {
        const sisa = { ...lama }
        delete sisa.scan
        return sisa
      })
    }
  }

  const simpan = useMutation({
    mutationFn: () => catatSuratMasuk(isian, scan),
    onSuccess: (s) => {
      void queryClient.invalidateQueries({ queryKey: kunciArsip.semua })
      tampilkanToast({ pesan: `Surat masuk dicatat dengan nomor agenda ${String(s.noAgenda).padStart(3, '0')}.`, nada: 'berhasil' })
      onTersimpan(s)
    },
    onError: (e) => {
      if (e instanceof GalatApi && e.kode === 'VALIDATION' && Object.keys(e.fields).length > 0) tandai(e.fields)
      else tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' })
    },
    onSettled: () => {
      mengirim.current = false
    },
  })
  const kirim = () => {
    if (mengirim.current) return
    const periksa = isianSuratMasukSchema.safeParse(isian)
    if (!periksa.success) {
      tandai(galatPerKolom(periksa.error.issues))
      return
    }
    mengirim.current = true
    simpan.mutate()
  }

  return (
    <Dialog
      isOpen
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
      judul="Catat surat masuk"
      subjudul="Nomor agenda diberikan saat disimpan."
      lebar="lebar"
      aksi={
        <>
          <Tombol onPress={onTutup}>Batal</Tombol>
          <Tombol varian="utama" memuat={simpan.isPending} onPress={kirim}>
            Simpan
          </Tombol>
        </>
      }
    >
      <div ref={wadah} className="grid gap-4 sm:grid-cols-2">
        <DatePicker
          label="Tanggal terima"
          nilai={isian.diterima}
          onUbah={(t) => ubah('diterima', t ?? '')}
          maks={hariIniIso}
          galat={galat.diterima}
          isRequired
        />
        <DatePicker
          label="Tanggal surat"
          nilai={isian.tanggalSurat}
          onUbah={(t) => ubah('tanggalSurat', t ?? '')}
          maks={isian.diterima || hariIniIso}
          galat={galat.tanggalSurat}
          isRequired
        />
        <TextField label="Nomor surat" value={isian.nomor} onChange={(v) => ubah('nomor', v)} galat={galat.nomor} isRequired className="sm:col-span-2" />
        <TextField label="Pengirim" value={isian.pengirim} onChange={(v) => ubah('pengirim', v)} galat={galat.pengirim} isRequired className="sm:col-span-2" />
        <TextArea label="Perihal" baris={2} value={isian.perihal} onChange={(v) => ubah('perihal', v)} galat={galat.perihal} isRequired className="sm:col-span-2" />
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={gayaLabel}>Scan surat (opsional)</span>
          {scan ? (
            <div className="flex items-center gap-3 rounded-1 border border-garis bg-lembar px-3 py-2">
              <Paperclip aria-hidden size={18} className="shrink-0 text-tinta-2" />
              <span className="min-w-0 flex-1 truncate">{`${scan.name} · ${ukuranKb(scan)} KB`}</span>
              <Tombol varian="teks" ukuran="kecil" onPress={() => setScan(null)}>
                Hapus scan
              </Tombol>
            </div>
          ) : (
            <FileTrigger
              acceptedFileTypes={[...BERKAS_SCAN]}
              onSelect={(daftar) => {
                const berkas = daftar?.[0]
                if (berkas) pilihScan(berkas)
              }}
            >
              <Tombol ikon={<Paperclip aria-hidden size={16} />} className="self-start">
                Pilih scan
              </Tombol>
            </FileTrigger>
          )}
          <p className={gayaKeterangan}>PDF, JPG, atau PNG, paling besar {MAKS_SCAN_MB} MB.</p>
          {galat.scan && (
            <p role="alert" className={gayaGalat}>
              {galat.scan}
            </p>
          )}
        </div>
        <Select
          label="Disposisi kepada"
          pilihan={[{ id: TANPA, label: 'Tanpa disposisi' }, ...TUJUAN_DISPOSISI.map((t) => ({ id: t, label: t }))]}
          nilai={isian.disposisiKepada ?? TANPA}
          onUbah={(id) => {
            const tujuan = TUJUAN_DISPOSISI.find((t) => t === id) ?? null
            ubah('disposisiKepada', tujuan)
            if (!tujuan) ubah('disposisiInstruksi', '')
          }}
          galat={galat.disposisiKepada}
          className="sm:col-span-2"
        />
        {isian.disposisiKepada && (
          <TextArea
            label="Instruksi"
            baris={2}
            value={isian.disposisiInstruksi}
            onChange={(v) => ubah('disposisiInstruksi', v)}
            galat={galat.disposisiInstruksi}
            className="sm:col-span-2"
          />
        )}
      </div>
    </Dialog>
  )
}
