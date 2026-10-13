import { jalurFotoKecil, LEBAR_FOTO } from '@/domain/website/foto'
import { cn } from '../cn'

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
  className?: string
}

/** Foto website desa (SPEC §9): dua ukuran lewat srcset, dimuat bertahap, dengan keterangan dan kredit fotografer. */
export function FotoWarta({ berkas, alt, keterangan, kredit, rasio = 'lebar', sizes = '100vw', utama = false, className }: Props) {
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
      className={cn('w-full bg-kertas-2 object-cover', RASIO[rasio], !keterangan && className)}
    />
  )
  if (!keterangan) return gambar
  return (
    <figure className={className}>
      {gambar}
      <figcaption className="mt-1.5 text-teks-kecil text-tinta-2">
        {keterangan}
        {kredit && <span> · Foto: {kredit}</span>}
      </figcaption>
    </figure>
  )
}
