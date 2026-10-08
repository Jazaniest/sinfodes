import { inisialNama } from '@/domain/format/nama'
import { cn } from '../cn'

/** Monogram desa bergaya cap, dipakai selama lambang asli belum diunggah. Dekoratif: nama desa selalu tertulis di sebelahnya. */
export function LambangDesa({ nama, ukuran = 'kecil' }: { nama: string; ukuran?: 'kecil' | 'besar' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 rounded-penuh border-[1.5px] border-biru p-[3px]',
        ukuran === 'besar' ? 'size-14' : 'size-9',
      )}
    >
      <span
        className={cn(
          'flex size-full items-center justify-center rounded-penuh border border-biru/50 font-serif font-medium text-biru',
          ukuran === 'besar' ? 'text-judul-bagian' : 'text-teks-kecil',
        )}
      >
        {inisialNama(nama)}
      </span>
    </span>
  )
}
