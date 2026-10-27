import type { ReactNode } from 'react'

export type EntriTimeline = { id: string; waktu: string; judul: ReactNode; keterangan?: ReactNode }

/** Garis waktu riwayat, terbaru di atas (SPEC §4.4, §6.3). */
export function Timeline({ label, entri }: { label: string; entri: readonly EntriTimeline[] }) {
  return (
    <ol aria-label={label} className="border-l border-garis pl-5">
      {entri.map((e) => (
        <li key={e.id} className="relative pb-4 last:pb-0">
          <span aria-hidden className="absolute top-1.5 -left-[25px] size-2 rounded-penuh border-[1.5px] border-biru bg-lembar" />
          <p className="text-teks-kecil text-tinta-2">{e.waktu}</p>
          <p className="mt-0.5">{e.judul}</p>
          {e.keterangan && <p className="text-teks-kecil text-tinta-2">{e.keterangan}</p>}
        </li>
      ))}
    </ol>
  )
}
