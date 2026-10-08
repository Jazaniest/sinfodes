import type { ReactNode } from 'react'

/** Keadaan kosong: teks dan satu aksi yang jelas, tanpa ilustrasi (SPEC §4.4). */
export function EmptyState({ judul, keterangan, aksi }: { judul: string; keterangan?: string; aksi?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-2 border border-dashed border-garis-input bg-lembar px-6 py-8">
      <p className="font-serif text-judul-bagian font-medium">{judul}</p>
      {keterangan && <p className="max-w-prose text-tinta-2">{keterangan}</p>}
      {aksi && <div className="mt-2">{aksi}</div>}
    </div>
  )
}
