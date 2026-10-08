import { Link } from 'react-aria-components'
import { cn } from '../cn'

export type ItemTab = { label: string; href: string; aktif: boolean }

/** Tab bergaris bawah di kepala halaman modul. Setiap tab adalah halaman sendiri (SPEC §5.2). */
export function TabNav({ label, items }: { label: string; items: readonly ItemTab[] }) {
  return (
    <nav aria-label={label} className="-mb-px flex gap-6 overflow-x-auto">
      {items.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.aktif ? 'page' : undefined}
          className={cn(
            'border-b-2 py-2 text-teks font-medium whitespace-nowrap outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-biru',
            t.aktif ? 'border-biru text-tinta' : 'border-transparent text-tinta-2 hover:text-tinta',
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
