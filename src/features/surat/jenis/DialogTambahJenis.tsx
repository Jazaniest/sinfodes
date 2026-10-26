import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciSurat, tambahJenisSurat } from '@/api/surat'
import { tambahJenisSchema, type JenisDenganPakai } from '@/domain/surat/jenis'
import { RadioGroup } from '@/ui/isian/RadioGroup'
import { Select } from '@/ui/isian/Select'
import { TextField } from '@/ui/isian/TextField'
import { Dialog } from '@/ui/lapisan/Dialog'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'

type Props = {
  /** Semua jenis desa itu, termasuk yang diarsipkan: semuanya boleh disalin. */
  jenis: readonly JenisDenganPakai[]
  onTutup: () => void
  /** Dipanggil dengan id jenis baru supaya editornya dibuka. */
  onDibuat: (id: string) => void
}

const ID_FORM = 'form-tambah-jenis'
const PILIHAN_ASAL = [
  { id: 'kosong', label: 'Mulai dari kosong' },
  { id: 'salin', label: 'Salin dari jenis yang ada' },
]

/**
 * Dialog Tambah jenis surat (SPEC-V0.2 12.1). Jenis baru mati sampai desa menyalakannya; salinan membawa isian, syarat, dan teks
 * jenis sumber. Dipasang hanya selama terbuka, jadi isiannya selalu mulai dari kosong.
 */
export function DialogTambahJenis({ jenis, onTutup, onDibuat }: Props) {
  const queryClient = useQueryClient()
  const [asal, setAsal] = useState<'kosong' | 'salin'>('kosong')
  const [dari, setDari] = useState<string | null>(null)
  const [kode, setKode] = useState('')
  const [nama, setNama] = useState('')
  const [galat, setGalat] = useState<Record<string, string>>({})
  const hapusGalat = (kunci: string) =>
    setGalat((lama) => {
      const sisa = { ...lama }
      delete sisa[kunci]
      return sisa
    })

  const buat = useMutation({
    mutationFn: tambahJenisSurat,
    onSuccess: (baru) => {
      void queryClient.invalidateQueries({ queryKey: kunciSurat.jenis })
      tampilkanToast({ pesan: `Jenis surat ${baru.nama} dibuat. Lengkapi isinya, lalu nyalakan layanannya.`, nada: 'berhasil' })
      onDibuat(baru.id)
    },
    onError: (e) => {
      if (e instanceof GalatApi && e.kode === 'VALIDATION' && Object.keys(e.fields).length > 0) return setGalat(e.fields)
      tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' })
    },
  })

  const kirim = () => {
    const masukan = tambahJenisSchema.safeParse({ dari: asal === 'salin' ? dari : null, kode, nama })
    const g: Record<string, string> = {}
    if (!masukan.success) for (const isu of masukan.error.issues) g[String(isu.path[0])] ??= isu.message
    if (asal === 'salin' && dari === null) g.dari = 'Pilih jenis yang disalin.'
    if (!masukan.success || Object.keys(g).length > 0) return setGalat(g)
    setGalat({})
    buat.mutate(masukan.data)
  }

  return (
    <Dialog
      isOpen
      onOpenChange={(buka) => !buka && !buat.isPending && onTutup()}
      judul="Tambah jenis surat"
      subjudul="Jenis baru belum dilayani sampai Anda menyalakannya."
      aksi={
        <>
          <Tombol onPress={onTutup} isDisabled={buat.isPending}>
            Batal
          </Tombol>
          <Tombol varian="utama" type="submit" form={ID_FORM} memuat={buat.isPending}>
            Buat jenis surat
          </Tombol>
        </>
      }
    >
      <form
        id={ID_FORM}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          kirim()
        }}
        className="flex flex-col gap-4"
      >
        <RadioGroup
          label="Mulai dari"
          pilihan={PILIHAN_ASAL}
          nilai={asal}
          onUbah={(id) => {
            setAsal(id === 'salin' ? 'salin' : 'kosong')
            hapusGalat('dari')
          }}
        />
        {asal === 'salin' && (
          <Select
            label="Jenis yang disalin"
            pilihan={jenis.map((j) => ({ id: j.id, label: `${j.nama} (${j.kode})${j.diarsipkan === null ? '' : ' - diarsipkan'}` }))}
            nilai={dari}
            onUbah={(id) => {
              setDari(id)
              hapusGalat('dari')
            }}
            keterangan="Isian tambahan, syarat, dan teks suratnya ikut disalin. Kode, nama, dan status layanan tidak."
            galat={galat.dari}
          />
        )}
        <TextField
          label="Kode"
          value={kode}
          onChange={(v) => {
            setKode(v.toUpperCase())
            hapusGalat('kode')
          }}
          keterangan="2-5 huruf kapital, mis. SPK. Tidak bisa diubah sesudah jenis dibuat."
          galat={galat.kode}
          autoFocus
        />
        <TextField
          label="Nama surat"
          value={nama}
          onChange={(v) => {
            setNama(v)
            hapusGalat('nama')
          }}
          galat={galat.nama}
        />
      </form>
    </Dialog>
  )
}
