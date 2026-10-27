import { Link } from 'react-aria-components'
import { formatAngka } from '@/domain/format/angka'
import { cn } from '../cn'
import { fokusBatang } from './gaya'

export type BatangGrafik = { id: string; label: string; nilai: number; href: string | null }

type Props = { label: string; batang: readonly BatangGrafik[]; satuan?: string }

const baris = 'grid grid-cols-[minmax(6rem,11rem)_minmax(0,1fr)_4rem] items-center gap-3 rounded-1 px-1.5 py-1'

/**
 * Grafik batang mendatar (SPEC §4.4). Batang yang punya tujuan berupa tautan, jadi bisa diklik dan dicapai keyboard
 * (SPEC §6.7). Angka selalu tertulis di ujung batang, jadi warna bukan satu-satunya pembawa informasi.
 */
export function BarChart({ label, batang, satuan = 'jiwa' }: Props) {
  const maks = Math.max(1, ...batang.map((b) => b.nilai))
  return (
    <ul aria-label={label} className="flex flex-col">
      {batang.map((b) => {
        const isi = (
          <>
            <span className="truncate text-teks-kecil text-tinta-2 group-data-[hovered]:text-tinta">{b.label}</span>
            <span aria-hidden className="h-2.5 bg-garis/40">
              <span data-batang className="block h-full bg-biru/75 group-data-[hovered]:bg-biru" style={{ width: `${(b.nilai / maks) * 100}%` }} />
            </span>
            <span className="text-right font-mono text-teks-kecil tabular-nums">{formatAngka(b.nilai)}</span>
          </>
        )
        return (
          <li key={b.id}>
            {b.href ? (
              <Link
                href={b.href}
                aria-label={`${b.label}: ${formatAngka(b.nilai)} ${satuan}. Buka daftar penduduk`}
                className={cn('group', baris, 'data-[hovered]:bg-kertas-2', fokusBatang)}
              >
                {isi}
              </Link>
            ) : (
              <div className={baris}>{isi}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
