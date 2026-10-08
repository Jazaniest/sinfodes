import { cn } from '../cn'

export type VarianTombol = 'utama' | 'sekunder' | 'teks' | 'bahaya'
export type UkuranTombol = 'kecil' | 'biasa'

const VARIAN: Record<VarianTombol, string> = {
  utama: 'bg-biru text-putih hover:bg-biru-tua data-[pressed]:bg-biru-tua',
  sekunder: 'border border-garis-input bg-lembar text-tinta hover:bg-kertas-2 data-[pressed]:bg-kertas-2',
  teks: 'bg-transparent px-0.5 text-biru underline-offset-4 hover:underline',
  bahaya: 'bg-merah text-putih hover:brightness-95',
}
const UKURAN: Record<UkuranTombol, string> = { kecil: 'h-8 px-3 text-teks-kecil', biasa: 'h-9 px-4 text-teks' }

/** Kelas tombol, dipakai Tombol dan TautanTombol supaya tampilannya sama persis. */
export function kelasTombol(varian: VarianTombol, ukuran: UkuranTombol): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-1 font-medium whitespace-nowrap transition-colors select-none',
    // outline-none mengisi --tw-outline-style: none, jadi gaya garis harus dipulihkan dengan outline-solid.
    'outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-biru',
    'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[pending]:cursor-progress',
    VARIAN[varian],
    varian !== 'teks' && UKURAN[ukuran],
  )
}
