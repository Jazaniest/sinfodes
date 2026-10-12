import type { ReactNode } from 'react'
import { formatPersen } from '@/domain/format/angka'
import { cn } from '../cn'

type Props = {
  /** Nama yang dibacakan, mis. "Belanja". */
  label: string
  nilai: number
  maks: number
  /** Teks di bawah batang, mis. "Rp1,18 M dari Rp1,87 M". */
  keterangan?: ReactNode
  /** Untuk sel tabel yang kolomnya sudah berjudul: label hanya untuk pembaca layar. */
  labelTersembunyi?: boolean
  className?: string
}

/**
 * Batang realisasi kecil (SPEC §4.4). Persentase selalu tertulis, jadi warna bukan satu-satunya pembawa informasi.
 * Maksimum 0 tampil 0%; nilai di atas maksimum tertulis apa adanya, tetapi batangnya berhenti di 100%.
 */
export function MiniBar({ label, nilai, maks, keterangan, labelTersembunyi = false, className }: Props) {
  const rasio = maks > 0 ? nilai / maks : 0
  const lebar = Math.min(1, Math.max(0, rasio))
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <div className="flex items-baseline justify-between gap-3 text-teks-kecil">
        <span className={labelTersembunyi ? 'sr-only' : 'truncate'}>{label}</span>
        <span className="font-mono tabular-nums">{formatPersen(rasio)}</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(lebar * 1000) / 10}
        aria-valuetext={formatPersen(rasio)}
        className="h-1.5 bg-garis/50"
      >
        <div className="h-full bg-biru" style={{ width: `${lebar * 100}%` }} />
      </div>
      {keterangan && <div className="text-teks-kecil text-tinta-2">{keterangan}</div>}
    </div>
  )
}
