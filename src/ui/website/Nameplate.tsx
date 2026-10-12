import { useId } from 'react'
import type { MotifWebsite } from '@/domain/website/schema'
import { cn } from '../cn'
import { LambangDesa } from '../domain/LambangDesa'
import { POLA_MOTIF } from './motif'

/** Pita motif berwarna aksen di atas kepala halaman website (SPEC §9). Dekoratif. */
export function PitaMotif({ motif, aksen, className }: { motif: MotifWebsite; aksen: string; className?: string }) {
  // ID pola harus sah di dalam url(#…); karakter khusus dari useId dibuang.
  const idPola = `motif-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const pola = POLA_MOTIF[motif]
  return (
    <svg aria-hidden data-motif={motif} className={cn('block h-3 w-full', className)}>
      <defs>
        <pattern id={idPola} width={pola.lebar} height={pola.tinggi} patternUnits="userSpaceOnUse">
          <path d={pola.jalur} fill={aksen} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${idPola})`} />
    </svg>
  )
}

type Props = {
  nama: string
  kecamatan: string
  kabupaten: string
  /** Warna aksen (hex) dari Tampilan website. */
  aksen: string
  motif: MotifWebsite
  /** Logo website; kosong berarti monogram desa. */
  logo: string | null
  /** Tanggal yang sudah diformat, mis. "Kamis, 24 September 2026". */
  tanggal: string
}

/**
 * Kepala halaman website desa bergaya warta desa (SPEC §9): pita motif beraksen, logo, nama desa besar ber-serif,
 * baris wilayah kapital kecil, tanggal, dan garis ganda seperti kop. Dipakai pratinjau Tampilan dan website publik.
 */
export function Nameplate({ nama, kecamatan, kabupaten, aksen, motif, logo, tanggal }: Props) {
  return (
    <header className="bg-lembar">
      <PitaMotif motif={motif} aksen={aksen} />
      <div className="flex items-center gap-4 px-5 pt-4 pb-3">
        {logo ? <img src={logo} alt="" className="size-14 shrink-0 object-contain" /> : <LambangDesa nama={nama} ukuran="besar" />}
        <div className="min-w-0">
          <p className="font-serif text-[1.75rem] leading-tight font-medium" style={{ color: aksen }}>
            {nama}
          </p>
          <p className="text-label font-medium tracking-wide text-tinta-2 uppercase">
            Desa · Kecamatan {kecamatan} · Kabupaten {kabupaten}
          </p>
          <p className="mt-1 text-teks-kecil text-tinta-2">{tanggal}</p>
        </div>
      </div>
      <div aria-hidden className="mx-5 border-t-[3px] border-tinta" />
      <div aria-hidden className="mx-5 mt-[2px] border-t border-tinta" />
    </header>
  )
}
