import { cn } from '../cn'
import { maksRapi } from './skala'

type Seri = { id: string; label: string; nilai: readonly number[] }
type Props = {
  label: string
  /** Judul kolom pertama tabel pembaca layar, mis. "Bulan". */
  judulSumbuX: string
  sumbuX: readonly string[]
  seri: readonly Seri[]
  format: (n: number) => string
  className?: string
}

const LEBAR = 640
const TINGGI = 240
const KIRI = 76
const KANAN = 16
const ATAS = 12
const BAWAH = 28
/** Garis kedua putus-putus supaya dua seri tetap terbedakan tanpa warna. */
const GAYA = [
  { warna: 'var(--color-seri-1)', putus: undefined },
  { warna: 'var(--color-seri-2)', putus: '6 4' },
] as const

/**
 * Grafik garis ringan (SPEC §4.4), mis. realisasi APBDes per bulan. SVG-nya dekoratif; nilainya tersedia di legenda
 * dan di tabel untuk pembaca layar. Di layar sempit grafik bisa digeser di dalam bingkainya sendiri.
 */
export function LineChart({ label, judulSumbuX, sumbuX, seri, format, className }: Props) {
  const maks = maksRapi(Math.max(0, ...seri.flatMap((s) => s.nilai)))
  const lebarPlot = LEBAR - KIRI - KANAN
  const tinggiPlot = TINGGI - ATAS - BAWAH
  const x = (i: number) => KIRI + (sumbuX.length <= 1 ? lebarPlot / 2 : (i * lebarPlot) / (sumbuX.length - 1))
  const y = (v: number) => ATAS + tinggiPlot - (v / maks) * tinggiPlot
  return (
    <figure aria-label={label} className={cn('flex flex-col gap-3', className)}>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${LEBAR} ${TINGGI}`} aria-hidden className="h-auto w-full min-w-[32rem]">
          {[0, 0.25, 0.5, 0.75, 1].map((r) => (
            <g key={r}>
              <line x1={KIRI} x2={LEBAR - KANAN} y1={y(r * maks)} y2={y(r * maks)} stroke="var(--color-garis)" strokeWidth={1} />
              <text x={KIRI - 8} y={y(r * maks) + 4} textAnchor="end" fontSize={11} fill="var(--color-tinta-2)">
                {format(r * maks)}
              </text>
            </g>
          ))}
          {sumbuX.map((teks, i) => (
            <text key={teks} x={x(i)} y={TINGGI - 8} textAnchor="middle" fontSize={11} fill="var(--color-tinta-2)">
              {teks}
            </text>
          ))}
          {seri.map((s, i) => {
            const g = GAYA[i % GAYA.length]
            return (
              <g key={s.id}>
                <polyline
                  points={s.nilai.map((v, j) => `${x(j)},${y(v)}`).join(' ')}
                  fill="none"
                  stroke={g.warna}
                  strokeWidth={2}
                  strokeDasharray={g.putus}
                />
                {s.nilai.map((v, j) => (
                  <circle key={j} cx={x(j)} cy={y(v)} r={3} fill={g.warna} />
                ))}
              </g>
            )
          })}
        </svg>
      </div>
      <figcaption>
        <ul className="flex flex-wrap gap-x-6 gap-y-1 text-teks-kecil">
          {seri.map((s, i) => {
            const g = GAYA[i % GAYA.length]
            return (
              <li key={s.id} className="flex items-center gap-2">
                <span aria-hidden className="inline-block w-6 border-t-2" style={{ borderColor: g.warna, borderTopStyle: g.putus ? 'dashed' : 'solid' }} />
                <span>
                  {s.label}: <span className="font-mono tabular-nums">{format(s.nilai.at(-1) ?? 0)}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </figcaption>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">{judulSumbuX}</th>
            {seri.map((s) => (
              <th key={s.id} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sumbuX.map((teks, i) => (
            <tr key={teks}>
              <th scope="row">{teks}</th>
              {seri.map((s) => (
                <td key={s.id}>{format(s.nilai[i] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
