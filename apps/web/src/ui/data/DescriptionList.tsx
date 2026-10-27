import { Fragment, type ReactNode } from 'react'

export type ItemDeskripsi = { label: string; nilai: ReactNode | null }

/** Daftar "label: nilai" untuk lembar profil dan laci (SPEC §4.4). */
export function DescriptionList({ judul, items }: { judul?: string; items: readonly ItemDeskripsi[] }) {
  return (
    <section>
      {judul && <h2 className="text-label font-medium text-tinta-2 uppercase">{judul}</h2>}
      <dl className="mt-2 grid grid-cols-1 gap-y-1 sm:grid-cols-[11rem_1fr] sm:gap-x-6 sm:gap-y-2.5">
        {items.map((i) => (
          <Fragment key={i.label}>
            <dt className="text-tinta-2">{i.label}</dt>
            <dd className="mb-2 min-w-0 sm:mb-0">{i.nilai ?? <span className="text-tinta-2">Belum diisi</span>}</dd>
          </Fragment>
        ))}
      </dl>
    </section>
  )
}
