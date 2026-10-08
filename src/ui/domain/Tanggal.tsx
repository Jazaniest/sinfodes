import { formatTanggal, formatWaktuRelatif, type GayaTanggal } from '@/domain/format/tanggal'

type Props = { iso: string; gaya?: GayaTanggal | 'relatif'; sekarang?: Date; className?: string }

export function Tanggal({ iso, gaya = 'pendek', sekarang, className }: Props) {
  const teks = gaya === 'relatif' ? formatWaktuRelatif(iso, sekarang ?? new Date()) : formatTanggal(iso, gaya)
  return (
    <time dateTime={iso} title={gaya === 'relatif' ? formatTanggal(iso, 'hari') : undefined} className={className}>
      {teks}
    </time>
  )
}
