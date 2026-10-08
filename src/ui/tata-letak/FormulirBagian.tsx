import type { ReactNode } from 'react'

export type BagianFormulir = { id: string; judul: string }

type Props = { label: string; bagian: readonly BagianFormulir[]; aksi: ReactNode; children: ReactNode }

/**
 * Formulir panjang (SPEC §6.4): indeks bagian menempel di kiri (layar ≥ 1024px), bilah aksi menempel di bawah.
 * Indeks memakai tautan ke bagian, tetapi pindahnya lewat scrollIntoView supaya URL halaman tidak berubah.
 */
export function FormulirBagian({ label, bagian, aksi, children }: Props) {
  return (
    <div className="grid gap-8 lg:grid-cols-[12rem_minmax(0,1fr)]">
      <nav aria-label={`Bagian ${label.toLowerCase()}`} className="hidden lg:block">
        <ol className="sticky top-6 flex flex-col border-l border-garis">
          {bagian.map((b, i) => (
            <li key={b.id}>
              <a
                href={`#${b.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  const tujuan = document.getElementById(b.id)
                  tujuan?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  tujuan?.focus({ preventScroll: true })
                }}
                className="-ml-px block border-l-2 border-transparent py-1.5 pl-3 text-teks-kecil text-tinta-2 outline-none hover:border-garis-input hover:text-tinta focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-biru"
              >
                {i + 1}. {b.judul}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="min-w-0">
        {children}
        <div className="sticky bottom-0 z-10 mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-garis bg-kertas py-3">
          {aksi}
        </div>
      </div>
    </div>
  )
}

/** Satu bagian bernomor di formulir panjang. */
export function BagianIsian({ id, nomor, judul, children }: { id: string; nomor: number; judul: string; children: ReactNode }) {
  return (
    <section id={id} tabIndex={-1} aria-labelledby={`${id}-judul`} className="scroll-mt-6 border-b border-garis py-6 outline-none first:pt-0">
      <h2 id={`${id}-judul`} className="mb-4 font-serif text-judul-bagian font-medium">
        <span className="mr-2 font-mono text-tinta-2">{nomor}</span>
        {judul}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}
