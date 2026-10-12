import { inisialNama } from '@/domain/format/nama'
import { cn } from '../cn'

type Props = { nama: string; ukuran?: 'kecil' | 'besar'; /** Lambang yang diunggah desa (data URL). */ gambar?: string | null }

/**
 * Lambang desa di kepala sidebar dan halaman masuk. Selama lambang asli belum diunggah, dipakai monogram bergaya cap.
 * Dekoratif: nama desa selalu tertulis di sebelahnya.
 */
export function LambangDesa({ nama, ukuran = 'kecil', gambar }: Props) {
  const ukuranKotak = ukuran === 'besar' ? 'size-14' : 'size-9'
  if (gambar) return <img src={gambar} alt="" aria-hidden className={cn('shrink-0 object-contain', ukuranKotak)} />
  return (
    <span aria-hidden className={cn('flex shrink-0 rounded-penuh border-[1.5px] border-biru p-[3px]', ukuranKotak)}>
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
