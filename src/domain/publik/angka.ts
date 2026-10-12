import { formatAngka } from '../format/angka'
import type { AngkaDesa } from './schema'

/** Angka desa dalam kalimat untuk Beranda website (SPEC §9). */
export function kalimatAngkaDesa(nama: string, a: AngkaDesa): string {
  const luas = a.luasKm2 === null ? '' : `, dengan luas wilayah ${formatAngka(a.luasKm2, 1)} km²`
  return `Desa ${nama} dihuni ${formatAngka(a.jiwa)} jiwa dalam ${formatAngka(a.kk)} keluarga, tersebar di ${a.dusun} dusun dan ${a.rt} RT${luas}.`
}
