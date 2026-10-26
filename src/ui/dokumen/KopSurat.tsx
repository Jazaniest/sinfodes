import { type TataLetakSurat } from '@/domain/surat/tata-letak'
import { isiBarisKop } from '@/domain/surat/tata-letak-siap'
import { cn } from '../cn'
import { LambangTiruan } from './LambangTiruan'

export type DataKop = {
  kabupaten: string
  kecamatan: string
  desa: string
  alamat: string
  kodePos: string
  surel: string
  /** Lambang yang diunggah desa (data URL); kosong berarti lambang tiruan netral (SPEC §7.5). */
  lambang?: string | null
  /** Lambang kabupaten untuk kop dua lambang; kosong berarti lambang tiruan berlabel "Lambang kabupaten" (SPEC-V0.2 12.2). */
  lambangKabupaten?: string | null
}

type Props = { kop: DataKop; tata: TataLetakSurat['kop'] }

const LAMBANG = 'size-[2.2cm]'

function Lambang({ gambar, label }: { gambar?: string | null; label?: string }) {
  // Dekoratif: nama desa tertulis di kop.
  if (gambar) return <img src={gambar} alt="" className={cn(LAMBANG, 'object-contain')} />
  return <LambangTiruan className={cn(LAMBANG, 'shrink-0')} label={label} />
}

/** Garis bawah kop: tunggal 1,5 pt; ganda dua garis 0,75 pt berjarak 1 pt; tebal-tipis 3 pt lalu 1 pt (v0.1). */
function Garis({ jenis }: { jenis: TataLetakSurat['kop']['garis'] }) {
  if (jenis === 'tunggal') return <div className="mt-[0.2cm] border-b-[1.5pt] border-tinta" />
  if (jenis === 'ganda') {
    return (
      <>
        <div className="mt-[0.2cm] border-b-[0.75pt] border-tinta" />
        <div className="mt-[1pt] border-b-[0.75pt] border-tinta" />
      </>
    )
  }
  return (
    <>
      <div className="mt-[0.2cm] border-b-[3pt] border-tinta" />
      <div className="mt-[1.5pt] border-b-[1pt] border-tinta" />
    </>
  )
}

/**
 * Kop surat (SPEC §7.5, SPEC-V0.2 12.2). Teks kop berasal dari `tata.baris` dengan sisipan terisi, ditulis sebagai teks
 * biasa (tanpa HTML). Baris berisi `{alamat}` ditulis kecil, baris berisi `{desa}` besar, selebihnya sedang.
 */
export function KopSurat({ kop, tata }: Props) {
  const alamat = [kop.alamat, kop.kodePos && `Kode Pos ${kop.kodePos}`].filter(Boolean).join(', ')
  const baris = isiBarisKop(tata.baris, {
    kab: kop.kabupaten, kec: kop.kecamatan, desa: kop.desa, alamat: `${alamat}${kop.surel ? ` · ${kop.surel}` : ''}`,
  })
  const teks = (
    <div className="text-center leading-tight font-bold">
      {baris.map((isi, i) => {
        const template = tata.baris[i]
        const alamatKop = template.includes('{alamat}')
        return (
          <p key={i} className={cn(alamatKop ? 'mt-[0.1cm] text-[10pt] font-normal' : template.includes('{desa}') ? 'text-[16pt]' : 'text-[14pt]')}>
            {isi}
          </p>
        )
      })}
    </div>
  )
  const dua = tata.jumlahLambang === 2
  return (
    <header>
      {dua ? (
        <div className="grid grid-cols-[2.2cm_1fr_2.2cm] items-center">
          <Lambang gambar={kop.lambangKabupaten} label="Lambang kabupaten" />
          {teks}
          <Lambang gambar={kop.lambang} />
        </div>
      ) : tata.posisiLambang === 'tengah' ? (
        <div className="flex flex-col items-center gap-[0.15cm]">
          <Lambang gambar={kop.lambang} />
          {teks}
        </div>
      ) : (
        <div className="grid grid-cols-[2.2cm_1fr_2.2cm] items-center">
          <Lambang gambar={kop.lambang} />
          {teks}
        </div>
      )}
      <Garis jenis={tata.garis} />
    </header>
  )
}
