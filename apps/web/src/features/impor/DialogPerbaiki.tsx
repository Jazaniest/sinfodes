import { useState } from 'react'
import { LABEL_FIELD_IMPOR, type FieldImpor } from '@/domain/impor/kolom'
import type { HasilBaris, NilaiBaris } from '@/domain/impor/periksa'
import {
  AGAMA, GOLONGAN_DARAH, HUBUNGAN_KELUARGA, PEKERJAAN, PENDIDIKAN, STATUS_PERKAWINAN,
} from '@/domain/penduduk/enum'
import { Select } from '@/ui/isian/Select'
import { TextField } from '@/ui/isian/TextField'
import { Dialog } from '@/ui/lapisan/Dialog'
import { Tombol } from '@/ui/tombol/Tombol'

/** Isian yang punya daftar pilihan; selain itu diisi sebagai teks. */
const PILIHAN_FIELD: Partial<Record<FieldImpor, readonly string[]>> = {
  jenisKelamin: ['L', 'P'],
  agama: AGAMA,
  hubunganKeluarga: HUBUNGAN_KELUARGA,
  pendidikan: PENDIDIKAN,
  pekerjaan: PEKERJAAN,
  statusPerkawinan: STATUS_PERKAWINAN,
  golonganDarah: GOLONGAN_DARAH,
}
/** Untuk baris yang ditolak server tanpa field tertentu. */
const FIELD_CADANGAN: readonly FieldImpor[] = ['nik', 'nama', 'tanggalLahir', 'hubunganKeluarga', 'nomorKk']

type Props = { baris: HasilBaris; pesanServer?: string; onSimpan: (nilai: NilaiBaris) => void; onTutup: () => void }

/** Perbaiki isian satu baris impor (SPEC §6.8). Baris diperiksa ulang setelah perbaikan disimpan. */
export function DialogPerbaiki({ baris, pesanServer, onSimpan, onTutup }: Props) {
  const bermasalah = [...new Set(baris.masalah.map((m) => m.field))]
  const field: readonly FieldImpor[] =
    bermasalah.length === 0 ? FIELD_CADANGAN : bermasalah.includes('dusun') ? [...new Set<FieldImpor>([...bermasalah, 'rw', 'rt'])] : bermasalah
  const [nilai, setNilai] = useState<NilaiBaris>(() => Object.fromEntries(field.map((f) => [f, baris.nilai[f] ?? ''])))
  const ubah = (f: FieldImpor, v: string) => setNilai((n) => ({ ...n, [f]: v }))
  return (
    <Dialog
      isOpen
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
      judul={`Perbaiki baris ${baris.nomor}`}
      subjudul={baris.nilai.nama || undefined}
      aksi={
        <>
          <Tombol onPress={onTutup}>Batal</Tombol>
          <Tombol varian="utama" onPress={() => onSimpan(nilai)}>
            Simpan perbaikan
          </Tombol>
        </>
      }
    >
      <ul className="mb-4 flex flex-col gap-1 text-teks-kecil text-merah">
        {baris.masalah.map((m) => (
          <li key={`${m.jenis}-${m.field}`}>{m.pesan}</li>
        ))}
        {pesanServer && <li>{pesanServer}</li>}
      </ul>
      <div className="grid gap-4 sm:grid-cols-2">
        {field.map((f) => {
          const pilihan = PILIHAN_FIELD[f]
          const isi = nilai[f] ?? ''
          return pilihan ? (
            <Select
              key={f}
              label={LABEL_FIELD_IMPOR[f]}
              pilihan={pilihan.map((p) => ({ id: p, label: p }))}
              nilai={pilihan.includes(isi) ? isi : null}
              onUbah={(id) => ubah(f, id ?? '')}
              keterangan={isi !== '' && !pilihan.includes(isi) ? `Tertulis di berkas: ${isi}` : undefined}
            />
          ) : (
            <TextField
              key={f}
              label={LABEL_FIELD_IMPOR[f]}
              value={isi}
              onChange={(v) => ubah(f, v)}
              keterangan={f === 'tanggalLahir' ? 'Tulis DD/MM/YYYY, mis. 28/02/2009.' : undefined}
            />
          )
        })}
      </div>
    </Dialog>
  )
}
