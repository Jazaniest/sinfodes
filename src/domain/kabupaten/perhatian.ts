import { formatAngka } from '../format/angka'
import { kalimatPerhatian } from '../konsol/aturan'
import type { PerhatianKabupaten } from './schema'

/** "3 desa realisasi Dana Desa tertinggal", "5 desa belum membaca siaran"; butir lain sama dengan kalimat Konsol (SPEC §11). */
export function kalimatPerhatianKabupaten(p: PerhatianKabupaten): string {
  if (p.jenis === 'realisasi-tertinggal') return `${formatAngka(p.jumlah)} desa realisasi Dana Desa tertinggal`
  if (p.jenis === 'siaran-belum-dibaca') return `${formatAngka(p.jumlah)} desa belum membaca siaran`
  return kalimatPerhatian(p)
}

/** Label tautan butir perhatian, sesuai layar tujuannya. */
export function labelTautanPerhatianKabupaten(p: PerhatianKabupaten): string {
  if (p.jenis === 'realisasi-tertinggal') return 'Buka Dana Desa'
  if (p.jenis === 'siaran-belum-dibaca') return 'Buka Siaran'
  return 'Buka Pemantauan'
}

/** Layar tempat butir perhatian bisa ditelusuri. */
export function hrefPerhatianKabupaten(p: PerhatianKabupaten): string {
  if (p.jenis === 'realisasi-tertinggal') return '/kabupaten/admin/dana-desa'
  if (p.jenis === 'siaran-belum-dibaca') return '/kabupaten/admin/siaran'
  return '/kabupaten/admin/pemantauan'
}
