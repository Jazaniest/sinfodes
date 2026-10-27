import type { ReactNode } from 'react'

type Props = {
  judul: string
  keterangan?: string
  aksi?: ReactNode
  /** Keadaan kosong yang menggantikan seluruh halaman (mis. "tidak ditemukan"): judulnya menjadi h1 halaman (SPEC §4.8). */
  judulHalaman?: boolean
}

const gayaJudul = 'font-serif text-judul-bagian font-medium'

/** Keadaan kosong: teks dan satu aksi yang jelas, tanpa ilustrasi (SPEC §4.4). */
export function EmptyState({ judul, keterangan, aksi, judulHalaman = false }: Props) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-2 border border-dashed border-garis-input bg-lembar px-6 py-8">
      {judulHalaman ? <h1 className={gayaJudul}>{judul}</h1> : <p className={gayaJudul}>{judul}</p>}
      {keterangan && <p className="max-w-prose text-tinta-2">{keterangan}</p>}
      {aksi && <div className="mt-2">{aksi}</div>}
    </div>
  )
}
