import { Link } from 'react-aria-components'
import { formatAngka } from '@/domain/format/angka'
import { cn } from '../cn'
import { fokusBatang } from './gaya'

export type BarisPiramida = {
  id: string
  label: string
  laki: number
  perempuan: number
  hrefLaki: string | null
  hrefPerempuan: string | null
}

const kolom = 'grid grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,1fr)] items-center'

/** Piramida penduduk (SPEC §6.7): laki-laki ke kiri, perempuan ke kanan, kelompok umur tertua di atas. */
export function PyramidChart({ label, baris }: { label: string; baris: readonly BarisPiramida[] }) {
  const maks = Math.max(1, ...baris.flatMap((b) => [b.laki, b.perempuan]))
  return (
    <div>
      <div aria-hidden className={cn(kolom, 'mb-1 text-label font-medium text-tinta-2 uppercase')}>
        <span className="pr-2 text-right">Laki-laki</span>
        <span className="text-center">Umur</span>
        <span className="pl-2">Perempuan</span>
      </div>
      <ul aria-label={label} className="flex flex-col">
        {[...baris].reverse().map((b) => (
          <li key={b.id} className={kolom}>
            <Sisi sisi="kiri" nilai={b.laki} maks={maks} href={b.hrefLaki} nama={`${b.label} tahun, laki-laki`} />
            <span className="text-center font-mono text-teks-kecil text-tinta-2 tabular-nums">{b.label}</span>
            <Sisi sisi="kanan" nilai={b.perempuan} maks={maks} href={b.hrefPerempuan} nama={`${b.label} tahun, perempuan`} />
          </li>
        ))}
      </ul>
    </div>
  )
}

type PropsSisi = { sisi: 'kiri' | 'kanan'; nilai: number; maks: number; href: string | null; nama: string }

function Sisi({ sisi, nilai, maks, href, nama }: PropsSisi) {
  const kelas = cn('group flex items-center gap-1.5 rounded-1 px-1 py-0.5', sisi === 'kiri' && 'flex-row-reverse')
  const isi = (
    <>
      <span
        data-batang
        aria-hidden
        className={cn('h-2.5', sisi === 'kiri' ? 'bg-biru/75 group-data-[hovered]:bg-biru' : 'bg-oker/75 group-data-[hovered]:bg-oker')}
        style={{ width: `${(nilai / maks) * 80}%` }}
      />
      <span className="font-mono text-teks-kecil tabular-nums">{formatAngka(nilai)}</span>
    </>
  )
  return href ? (
    <Link
      href={href}
      aria-label={`${nama}: ${formatAngka(nilai)} jiwa. Buka daftar penduduk`}
      className={cn(kelas, 'data-[hovered]:bg-kertas-2', fokusBatang)}
    >
      {isi}
    </Link>
  ) : (
    <span className={kelas}>{isi}</span>
  )
}
