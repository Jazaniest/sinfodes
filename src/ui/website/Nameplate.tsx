import { useId, type ReactNode } from 'react'
import type { IdMotif } from '@/domain/website/motif'
import type { IdKepala } from '@/domain/website/tema'
import { cn } from '../cn'
import { LambangDesa } from '../domain/LambangDesa'
import { POLA_MOTIF } from './motif'

/** Pita motif berwarna aksen desa (variabel --desa-warna-aksen) di atas kepala halaman website. Dekoratif. `tipis` mengecilkan ubin setengahnya. */
export function PitaMotif({ motif, tipis = false, className }: { motif: IdMotif; tipis?: boolean; className?: string }) {
  // ID pola harus sah di dalam url(#…); karakter khusus dari useId dibuang.
  const idPola = `motif-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const pola = POLA_MOTIF[motif]
  return (
    <svg
      aria-hidden
      data-motif={motif}
      className={cn('block w-full', !tipis && 'h-3', className)}
      style={tipis ? { height: pola.tinggi / 2 } : undefined}
    >
      <defs>
        <pattern id={idPola} width={pola.lebar} height={pola.tinggi} patternUnits="userSpaceOnUse" patternTransform={tipis ? 'scale(0.5)' : undefined}>
          <path d={pola.jalur} fillRule="evenodd" style={{ fill: 'var(--desa-warna-aksen)' }} />
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
  motif: IdMotif
  /** Logo website; kosong berarti monogram desa. */
  logo: string | null
  /** Tanggal yang sudah diformat, mis. "Kamis, 24 September 2026". */
  tanggal: string
  /** Bentuk kepala (SPEC-V0.2 §11.3); bawaan `warta`. */
  bentuk?: IdKepala
  /** Menu website. `ringkas` menaruhnya di kanan dalam kepala; bentuk lain di bawah kepala. */
  menu?: ReactNode
}

function Logo({ nama, logo, kecil = false, diPita = false }: { nama: string; logo: string | null; kecil?: boolean; diPita?: boolean }) {
  const isi = logo ? (
    <img src={logo} alt="" className={cn('shrink-0 object-contain', kecil ? 'size-10' : 'size-14')} />
  ) : (
    <LambangDesa nama={nama} ukuran={kecil ? 'kecil' : 'besar'} />
  )
  // Monogram dan logo bergaris biru hilang di atas pita berwarna utama: beri alas lembar.
  return diPita ? <span className="flex shrink-0 rounded-1 bg-lembar p-1">{isi}</span> : isi
}

/**
 * Kepala halaman website desa (SPEC §9, SPEC-V0.2 §11.3). Tiga bentuk:
 * `warta` pita motif beraksen, logo, nama desa besar ber-serif, baris wilayah kapital kecil, tanggal, dan garis ganda seperti kop;
 * `ringkas` logo dan nama satu baris dengan menu di kanan, motif sebagai garis tipis di bawah;
 * `pita` pita penuh warna utama dengan nama putih, motif sebagai pemisah di bawahnya.
 * Dipakai pratinjau Tampilan dan website publik.
 */
export function Nameplate({ nama, kecamatan, kabupaten, motif, logo, tanggal, bentuk = 'warta', menu }: Props) {
  const wilayah = `Desa · Kecamatan ${kecamatan} · Kabupaten ${kabupaten}`
  if (bentuk === 'ringkas') {
    return (
      <header data-bagian="kepala" data-bentuk="ringkas" className="bg-lembar">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Logo nama={nama} logo={logo} kecil />
            <div className="min-w-0">
              <p className="font-serif text-[1.375rem] leading-tight font-medium text-biru">{nama}</p>
              <p className="text-label font-medium tracking-wide text-tinta-2 uppercase">{wilayah}</p>
              <p className="text-teks-kecil text-tinta-2">{tanggal}</p>
            </div>
          </div>
          {menu}
        </div>
        <PitaMotif motif={motif} tipis />
      </header>
    )
  }
  if (bentuk === 'pita') {
    return (
      <>
        <header data-bagian="kepala" data-bentuk="pita" className="bg-lembar">
          <div data-pita className="bg-biru text-putih">
            <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-4">
              <Logo nama={nama} logo={logo} diPita />
              <div className="min-w-0">
                <p className="font-serif text-[1.75rem] leading-tight font-medium text-putih">{nama}</p>
                <p className="text-label font-medium tracking-wide text-putih uppercase">{wilayah}</p>
                <p className="mt-1 text-teks-kecil text-putih">{tanggal}</p>
              </div>
            </div>
          </div>
          <PitaMotif motif={motif} />
        </header>
        {menu}
      </>
    )
  }
  return (
    <>
      <header data-bagian="kepala" data-bentuk="warta" className="bg-lembar">
        <PitaMotif motif={motif} />
        <div className="flex items-center gap-4 px-5 pt-4 pb-3">
          <Logo nama={nama} logo={logo} />
          <div className="min-w-0">
            <p className="font-serif text-[1.75rem] leading-tight font-medium text-biru">{nama}</p>
            <p className="text-label font-medium tracking-wide text-tinta-2 uppercase">{wilayah}</p>
            <p className="mt-1 text-teks-kecil text-tinta-2">{tanggal}</p>
          </div>
        </div>
        <div aria-hidden className="mx-5 border-t-[3px] border-tinta" />
        <div aria-hidden className="mx-5 mt-[2px] border-t border-tinta" />
      </header>
      {menu}
    </>
  )
}
