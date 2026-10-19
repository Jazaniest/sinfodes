import { formatAngka } from '../format/angka'
import { kalimatPerhatian } from '../konsol/aturan'
import type { PerhatianKabupaten } from './schema'

/** "3 desa realisasi Dana Desa tertinggal"; butir lain sama dengan kalimat Konsol (SPEC §11). */
export function kalimatPerhatianKabupaten(p: PerhatianKabupaten): string {
  if (p.jenis === 'realisasi-tertinggal') return `${formatAngka(p.jumlah)} desa realisasi Dana Desa tertinggal`
  return kalimatPerhatian(p)
}

/** Layar tempat butir perhatian bisa ditelusuri. */
export const hrefPerhatianKabupaten = (p: PerhatianKabupaten): string =>
  p.jenis === 'realisasi-tertinggal' ? '/kabupaten/admin/dana-desa' : '/kabupaten/admin/pemantauan'
