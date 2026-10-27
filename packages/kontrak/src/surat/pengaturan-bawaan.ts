import { FORMAT_NOMOR_BAWAAN } from './nomor-surat'
import type { PengaturanSurat } from './pengaturan'
import { salinTataLetak, samaDenganSiap, TATA_LETAK_SIAP } from './tata-letak-siap'
import type { HurufSurat, TataLetakSurat, UkuranKertas } from './tata-letak'

export const pengaturanBawaan = (desaId: string): PengaturanSurat => ({
  desaId,
  tataLetak: salinTataLetak(TATA_LETAK_SIAP.standar),
  modeTandaTangan: 'tte',
  formatNomor: FORMAT_NOMOR_BAWAAN,
  urutan: 'per-tahun',
})

/**
 * Data desa dari sebelum 7H-2 yang masih menyimpan `kertas` dan `huruf` jadi tata letak standar dengan kertas dan huruf
 * itu. Bila hasilnya sama dengan tata letak siap pakai, `siap` terisi.
 */
export function pindahPengaturanLama(lama: { kertas: UkuranKertas; huruf: Exclude<HurufSurat, 'Plex Serif'> }): TataLetakSurat {
  const t = salinTataLetak(TATA_LETAK_SIAP.standar)
  t.kertas.ukuran = lama.kertas
  t.huruf.keluarga = lama.huruf
  t.siap = samaDenganSiap(t)
  return t
}
