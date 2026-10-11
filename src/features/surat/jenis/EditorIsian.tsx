import { Plus, Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { JENIS_ISIAN, type IsianTambahan, type JenisIsian } from '@/domain/surat/jenis'
import { kunciDariLabel } from '@/domain/surat/ubah-jenis'
import { Checkbox } from '@/ui/isian/Checkbox'
import { gayaKeterangan } from '@/ui/isian/gaya'
import { Select } from '@/ui/isian/Select'
import { TextField } from '@/ui/isian/TextField'
import { Tombol } from '@/ui/tombol/Tombol'

const LABEL_JENIS: Readonly<Record<JenisIsian, string>> = { teks: 'Teks', angka: 'Angka', tanggal: 'Tanggal', pilihan: 'Pilihan' }

type Props = {
  isian: readonly IsianTambahan[]
  /** Kunci isian yang sudah tersimpan tidak berganti walau labelnya diubah, supaya isian permohonan lama tetap terbaca. */
  kunciTersimpan: ReadonlySet<string>
  galat: Readonly<Record<string, string>>
  onUbah: (isian: IsianTambahan[]) => void
}

/** Pilihan ditulis dipisah koma. Teksnya disimpan sendiri supaya koma dan spasi yang sedang diketik tidak hilang. */
function IsianPilihan({ nilai, galat, onUbah }: { nilai: readonly string[]; galat?: string; onUbah: (pilihan: string[]) => void }) {
  const [teks, setTeks] = useState(nilai.join(', '))
  return (
    <TextField
      label="Pilihan"
      value={teks}
      onChange={(v) => {
        setTeks(v)
        onUbah(v.split(',').map((p) => p.trim()).filter((p) => p !== ''))
      }}
      galat={galat}
      keterangan="Pisahkan dengan koma, mis. Pendidikan, Kesehatan, Lainnya."
      className="sm:col-span-3"
    />
  )
}

/** Isian tambahan jenis surat (SPEC §7.4 layar 6): label, jenis, wajib, dan pilihan. Setiap isian menjadi sisipan. */
export function EditorIsian({ isian, kunciTersimpan, galat, onUbah }: Props) {
  const ganti = (i: number, ubah: Partial<IsianTambahan>) => onUbah(isian.map((d, k) => (k === i ? { ...d, ...ubah } : d)))
  const ubahLabel = (i: number, label: string) => {
    const d = isian[i]
    if (kunciTersimpan.has(d.kunci)) return ganti(i, { label })
    const lain = isian.filter((_, k) => k !== i).map((x) => x.kunci)
    ganti(i, { label, kunci: kunciDariLabel(label, lain) })
  }
  const tambah = () =>
    onUbah([
      ...isian,
      {
        kunci: kunciDariLabel('', isian.map((x) => x.kunci)), label: '', jenis: 'teks', wajib: true, pilihan: null,
        rupiah: false, diTabel: false, keterangan: null,
      },
    ])

  return (
    <div className="flex flex-col gap-3 sm:col-span-2">
      <p className={gayaKeterangan}>Diisi petugas saat membuat surat. Setiap isian bisa disisipkan ke teks surat.</p>
      {isian.length === 0 && <p className="text-tinta-2">Belum ada isian tambahan.</p>}
      <ul aria-label="Isian tambahan" className="flex flex-col gap-3">
        {isian.map((d, i) => (
          <li key={i}>
            <fieldset
              aria-label={`Isian ${i + 1}`}
              className="grid gap-3 rounded-1 border border-garis bg-lembar p-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end"
            >
              <TextField label="Label" value={d.label} onChange={(v) => ubahLabel(i, v)} galat={galat[`isian.${i}.label`]} />
              <Select
                label="Jenis isian"
                pilihan={JENIS_ISIAN.map((x) => ({ id: x, label: LABEL_JENIS[x] }))}
                nilai={d.jenis}
                onUbah={(id) => {
                  const jenis = JENIS_ISIAN.find((x) => x === id) ?? 'teks'
                  ganti(i, { jenis, pilihan: jenis === 'pilihan' ? (d.pilihan ?? []) : null })
                }}
              />
              <Checkbox isSelected={d.wajib} onChange={(wajib) => ganti(i, { wajib })} className="sm:mb-2.5">
                Wajib
              </Checkbox>
              {d.jenis === 'pilihan' && (
                <IsianPilihan
                  key={d.kunci}
                  nilai={d.pilihan ?? []}
                  galat={galat[`isian.${i}.pilihan`]}
                  onUbah={(pilihan) => ganti(i, { pilihan })}
                />
              )}
              <div className="flex items-center justify-between gap-2 sm:col-span-3">
                <span className="text-teks-kecil text-tinta-2">
                  Sisipan <span className="font-mono">[{d.kunci}]</span>
                </span>
                <Tombol
                  varian="teks"
                  ukuran="kecil"
                  aria-label={`Hapus isian ${i + 1}`}
                  ikon={<Trash aria-hidden size={14} />}
                  onPress={() => onUbah(isian.filter((_, k) => k !== i))}
                >
                  Hapus
                </Tombol>
              </div>
            </fieldset>
          </li>
        ))}
      </ul>
      <Tombol ikon={<Plus aria-hidden size={16} />} onPress={tambah} className="self-start">
        Tambah isian
      </Tombol>
    </div>
  )
}
