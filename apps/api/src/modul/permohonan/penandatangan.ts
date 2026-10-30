import { timingSafeEqual } from 'node:crypto'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'

/**
 * Colokan tanda tangan (SPEC-V0.3 §6.4). Simulator di bawah belum tersertifikasi; v0.4 menggantinya dengan penyedia TTE nyata
 * di balik antarmuka yang sama. `periksa` ada di colokan supaya uji integritas bisa membuktikan hash cocok dengan lembar.
 */
export type Penandatangan = {
  tandatangani(m: { desaId: string; hashDokumen: string; penandatanganId: string; pada: Date }): Promise<{ tandaTangan: string }>
  periksa(m: { desaId: string; hashDokumen: string; tandaTangan: string }): Promise<boolean>
}

const AWALAN = 'sim1.'

/**
 * Tanda tangan simulator = `sim1.` + indeks HMAC hash dokumen di ruang desa (kunci server yang sudah ada, tanpa rahasia baru).
 * Ruang memuat id desa, jadi desa lain tidak bisa memeriksa atau memalsukan tanda tangan desa ini.
 */
export function buatPenandatanganSimulator(penyandi: Penyandi): Penandatangan {
  const hitung = (desaId: string, hashDokumen: string) => `${AWALAN}${penyandi.indeks(hashDokumen, ruang.tandaTangan(desaId))}`
  return {
    async tandatangani(m) {
      return { tandaTangan: hitung(m.desaId, m.hashDokumen) }
    },
    async periksa(m) {
      const harapan = Buffer.from(hitung(m.desaId, m.hashDokumen))
      const ada = Buffer.from(m.tandaTangan)
      return harapan.length === ada.length && timingSafeEqual(harapan, ada)
    },
  }
}
