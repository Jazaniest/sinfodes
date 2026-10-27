import { jalurFotoKecil, LEBAR_FOTO } from '@/domain/website/foto'
import { cn } from '../cn'
import { useBentukFoto } from './foto-konteks'

const RASIO = { lebar: 'aspect-[16/9]', foto: 'aspect-[4/3]' } as const

type Props = {
  /** Versi besar foto; versi kecil foto kurasi diturunkan otomatis. */
  berkas: string
  alt: string
  /** Keterangan di bawah foto. Tanpa keterangan, foto tampil tanpa figure (mis. gambar kecil di daftar). */
  keterangan?: string
  kredit?: string | null
  rasio?: keyof typeof RASIO
  /** Lebar tampil foto, untuk memilih versi kecil atau besar. */
  sizes?: string
  /** Foto utama di atas layar: dimuat langsung, tidak menunggu digulir. */
  utama?: boolean
  /** Dipasang di figure; tanpa keterangan dipasang di gambar dan harus memuat lebarnya (mis. "w-24"). */
  className?: string
}

/**
 * Foto website desa (SPEC §9): dua ukuran lewat srcset, dimuat bertahap, dengan keterangan dan kredit fotografer.
 * Tema `bingkai` menaruh keterangan di bawah foto; tema `penuh` (SPEC-V0.2 §11.3) menaruhnya di atas foto, di atas lapisan
 * gelap tipis yang hanya ada bila ada keterangan.
 */
export function FotoWarta({ berkas, alt, keterangan, kredit, rasio = 'lebar', sizes = '100vw', utama = false, className }: Props) {
  const bentuk = useBentukFoto()
  const kurasi = berkas.startsWith('/demo/foto/')
  const gambar = (
    <img
      src={berkas}
      srcSet={kurasi ? `${jalurFotoKecil(berkas)} ${LEBAR_FOTO.kecil}w, ${berkas} ${LEBAR_FOTO.besar}w` : undefined}
      sizes={kurasi ? sizes : undefined}
      alt={alt}
      loading={utama ? 'eager' : 'lazy'}
      fetchPriority={utama ? 'high' : undefined}
      decoding="async"
      // `cn` tidak menyelesaikan bentrokan kelas: foto tanpa keterangan memakai lebar dari pemanggil, bukan w-full juga.
      className={cn('bg-kertas-2 object-cover', RASIO[rasio], keterangan ? 'w-full' : (className ?? 'w-full'))}
    />
  )
  if (!keterangan) return gambar
  const teks = (
    <>
      {keterangan}
      {kredit && <span> · Foto: {kredit}</span>}
    </>
  )
  if (bentuk === 'penuh') {
    return (
      <figure data-foto="penuh" className={cn('relative overflow-hidden', className)}>
        {gambar}
        <div aria-hidden data-lapisan className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/80 from-45% to-transparent" />
        <figcaption className="absolute inset-x-0 bottom-0 px-3 pt-6 pb-2 text-teks-kecil text-putih">{teks}</figcaption>
      </figure>
    )
  }
  return (
    <figure data-foto="bingkai" className={className}>
      {gambar}
      <figcaption className="mt-1.5 text-teks-kecil text-tinta-2">{teks}</figcaption>
    </figure>
  )
}
