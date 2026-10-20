import pratinjauBalai from '@/assets/tema/balai.webp'
import pratinjauBandar from '@/assets/tema/bandar.webp'
import pratinjauLadang from '@/assets/tema/ladang.webp'
import pratinjauPesisir from '@/assets/tema/pesisir.webp'
import pratinjauRimba from '@/assets/tema/rimba.webp'
import pratinjauSerambi from '@/assets/tema/serambi.webp'
import pratinjauTenun from '@/assets/tema/tenun.webp'
import pratinjauWarta from '@/assets/tema/warta.webp'
import { DASAR_TEMA, type DasarTema } from './galeri-dasar'
import type { IdTema } from './tema'

export { pasangTema, samaDenganGaleri, SLUG_PRATINJAU_TEMA, type DasarTema } from './galeri-dasar'

/** Satu tema galeri (SPEC-V0.2 §11.3). `susunanBeranda` baru diisi di 7F. */
export type TemaGaleri = {
  id: IdTema
  nama: string
  keterangan: string
  dasar: DasarTema
  susunanBeranda: null
  /** Screenshot sungguhan website Sungai Sialang dengan tema ini, 1280 x 800. */
  pratinjau: string
}

const tema = (id: IdTema, nama: string, keterangan: string, pratinjau: string): TemaGaleri => ({
  id, nama, keterangan, dasar: DASAR_TEMA[id], susunanBeranda: null, pratinjau,
})

/** Delapan tema galeri, urutan tampil. Warta adalah tampilan v0.1 dan menjadi bawaan. */
export const GALERI_TEMA: readonly TemaGaleri[] = [
  tema('warta', 'Warta', 'Tampilan warta desa seperti v0.1: kepala bertanggal dan foto berbingkai.', pratinjauWarta),
  tema('balai', 'Balai', 'Rapi dan lega seperti balai desa: kepala satu baris, foto melebar.', pratinjauBalai),
  tema('pesisir', 'Pesisir', 'Lembut untuk desa tepi sungai dan pantai: sudut bulat, pita kepala, foto melebar.', pratinjauPesisir),
  tema('serambi', 'Serambi', 'Hangat seperti serambi rumah: huruf Fraunces, latar kertas, foto berbingkai.', pratinjauSerambi),
  tema('ladang', 'Ladang', 'Padat dan jelas untuk desa yang banyak kabar: jarak rapat, huruf Bitter.', pratinjauLadang),
  tema('tenun', 'Tenun', 'Tegas dan berwarna: pita ungu songket, huruf Archivo, foto melebar.', pratinjauTenun),
  tema('rimba', 'Rimba', 'Teduh dan rapat: hijau lumut, sudut bulat, foto melebar.', pratinjauRimba),
  tema('bandar', 'Bandar', 'Cekatan seperti pelabuhan: pita biru laut dan motif mega mendung.', pratinjauBandar),
]

export function temaGaleri(id: IdTema): TemaGaleri {
  const ditemukan = GALERI_TEMA.find((t) => t.id === id)
  if (!ditemukan) throw new Error(`Tema galeri tidak dikenal: ${id}`)
  return ditemukan
}
