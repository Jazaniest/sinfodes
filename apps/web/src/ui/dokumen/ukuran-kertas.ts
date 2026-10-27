import type { TataLetakSurat, UkuranKertas } from '@/domain/surat/tata-letak'

/** Lebar kertas dalam cm, untuk pratinjau lembar yang diperkecil (A4 21 cm, F4 21,5 cm). */
const LEBAR_KERTAS_CM: Readonly<Record<UkuranKertas, number>> = { A4: 21, F4: 21.5 }

export const lebarLembarCm = (t: Pick<TataLetakSurat, 'kertas'>): number => LEBAR_KERTAS_CM[t.kertas.ukuran]
