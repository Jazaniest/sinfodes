import type { ReactNode } from 'react'
import { Tautan } from '../navigasi/Tautan'

export type Jejak = { label: string; href?: string }

type Props = { jejak?: readonly Jejak[]; judul: ReactNode; meta?: ReactNode; aksi?: ReactNode; tab?: ReactNode }

/** Kepala halaman admin: jejak kapital kecil, judul serif, baris meta, aksi di kanan, tab di bawah (SPEC §5.2). */
export function PageHeader({ jejak, judul, meta, aksi, tab }: Props) {
  return (
    <header className="border-b border-garis">
      {jejak && jejak.length > 0 && (
        <nav aria-label="Jejak halaman" className="mb-1">
          <ol className="flex flex-wrap items-center gap-1.5 text-label font-medium text-tinta-2 uppercase">
            {jejak.map((j, i) => (
              <li key={`${j.label}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden>/</span>}
                {j.href ? (
                  <Tautan href={j.href} nada="redup">
                    {j.label}
                  </Tautan>
                ) : (
                  <span>{j.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-4">
        <div className="min-w-0">
          <h1 className="font-serif text-judul-halaman font-medium">{judul}</h1>
          {meta && <div className="mt-1 text-teks-kecil text-tinta-2">{meta}</div>}
        </div>
        {aksi && <div className="flex flex-wrap items-center gap-2">{aksi}</div>}
      </div>
      {tab}
    </header>
  )
}
