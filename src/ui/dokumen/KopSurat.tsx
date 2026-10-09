import { LambangTiruan } from './LambangTiruan'

export type DataKop = { kabupaten: string; kecamatan: string; desa: string; alamat: string; kodePos: string; surel: string }

const kapital = (teks: string) => teks.toLocaleUpperCase('id-ID')

/** Kop surat (SPEC §7.5): lambang di kiri, teks rata tengah dan tebal, garis ganda 3 pt + 1 pt. */
export function KopSurat({ kop }: { kop: DataKop }) {
  const alamat = [kop.alamat, kop.kodePos && `Kode Pos ${kop.kodePos}`].filter(Boolean).join(', ')
  return (
    <header>
      <div className="grid grid-cols-[2.2cm_1fr_2.2cm] items-center">
        <LambangTiruan className="size-[2.2cm]" />
        <div className="text-center leading-tight font-bold">
          <p className="text-[14pt]">PEMERINTAH KABUPATEN {kapital(kop.kabupaten)}</p>
          <p className="text-[14pt]">KECAMATAN {kapital(kop.kecamatan)}</p>
          <p className="text-[16pt]">DESA {kapital(kop.desa)}</p>
          <p className="mt-[0.1cm] text-[10pt] font-normal">
            {alamat}
            {kop.surel && ` · ${kop.surel}`}
          </p>
        </div>
      </div>
      <div className="mt-[0.2cm] border-b-[3pt] border-tinta" />
      <div className="mt-[1.5pt] border-b-[1pt] border-tinta" />
    </header>
  )
}
