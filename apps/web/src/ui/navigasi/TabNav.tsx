import { Link } from 'react-aria-components'
import { formatAngka } from '@/domain/format/angka'
import { cn } from '../cn'
import { Hitungan } from '../hitungan/Hitungan'

export type ItemTab = { label: string; href: string; aktif: boolean; hitungan?: { nilai: number; label: string } }

/** Tab bergaris bawah di kepala halaman modul. Setiap tab adalah halaman sendiri (SPEC §5.2). */
export function TabNav({ label, items }: { label: string; items: readonly ItemTab[] }) {
  return (
    <nav aria-label={label} className="-mb-px flex gap-6 overflow-x-auto">
      {items.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.aktif ? 'page' : undefined}
          // Nama eksplisit supaya label dan angkanya terbaca terpisah, mis. "Menunggu, 7 permohonan".
          aria-label={t.hitungan ? `${t.label}, ${formatAngka(t.hitungan.nilai)} ${t.hitungan.label}` : undefined}
          className={cn(
            'border-b-2 py-2 text-teks font-medium whitespace-nowrap outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-biru',
            t.aktif ? 'border-biru text-tinta' : 'border-transparent text-tinta-2 hover:text-tinta',
          )}
        >
          {t.label}
          {t.hitungan && <Hitungan nilai={t.hitungan.nilai} className="ml-1.5 text-tinta-2" />}
        </Link>
      ))}
    </nav>
  )
}
