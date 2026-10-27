import type { IdMotif } from '@/domain/website/motif'

export type UbinMotif = { lebar: number; tinggi: number; jalur: string }

/**
 * Satu ubin pola pita motif (SPEC-V0.2 §11.1), diisi warna aksen desa dengan aturan isi `evenodd` supaya lubang tampil.
 * Ukuran dalam piksel SVG. Setiap ubin digambar sendiri sebagai bentuk geometris sederhana yang terinspirasi motifnya, bukan
 * tiruan kain aslinya. Nama dan asal daerah motif dicatat di `src/domain/website/motif.ts` beserta sumbernya.
 */
export const POLA_MOTIF: Readonly<Record<IdMotif, UbinMotif>> = {
  // Pucuk rebung: segitiga tegak dan terbalik berselang, seperti tepi kain songket.
  'pucuk-rebung': { lebar: 16, tinggi: 12, jalur: 'M0 12 L4 0 L8 12 Z M8 0 L12 12 L16 0 Z' },
  // Siku keluang: siku bersambung seperti sayap kelelawar.
  'siku-keluang': { lebar: 16, tinggi: 12, jalur: 'M0 0 L8 8 L16 0 L16 4 L8 12 L0 4 Z' },
  // Garis: garis miring sederhana, netral untuk daerah mana pun.
  garis: { lebar: 8, tinggi: 12, jalur: 'M0 12 L6 0 L8 0 L2 12 Z' },
  // Itik pulang petang: itik berderet menghadap satu arah (badan, leher, dan kepala).
  'itik-pulang-petang': {
    lebar: 20,
    tinggi: 12,
    jalur: 'M2 9 Q8 5 13 8 L13 4 A2.2 2.2 0 0 1 17.4 4 L19 5 L17 6 L17 8 Q17 11 9 11 Q2 11 2 9 Z',
  },
  // Awan larat: gulungan awan berupa lingkaran berlubang dengan ekor melengkung.
  'awan-larat': {
    lebar: 18,
    tinggi: 12,
    jalur: 'M2.5 6 A3.5 3.5 0 1 1 9.5 6 A3.5 3.5 0 1 1 2.5 6 Z M4.5 6 A1.5 1.5 0 1 0 7.5 6 A1.5 1.5 0 1 0 4.5 6 Z M10 4.5 Q14 1 18 4 Q14 3.5 11.5 7.5 Z',
  },
  // Tumpal: deret segitiga dengan segitiga kecil berlubang di dalamnya.
  tumpal: { lebar: 12, tinggi: 10, jalur: 'M0 10 L6 0 L12 10 Z M3.6 10 L6 4.4 L8.4 10 Z' },
  // Mega mendung: gumpalan awan berlapis, tepi luar bergelombang dengan lengkung dalam berlubang.
  'mega-mendung': {
    lebar: 24,
    tinggi: 12,
    jalur:
      'M0 12 V7 A4 4 0 0 1 8 7 A4 4 0 0 1 16 7 A4 4 0 0 1 24 7 V12 Z M2 12 V7.5 A2 2 0 0 1 6 7.5 V12 Z M10 12 V7.5 A2 2 0 0 1 14 7.5 V12 Z M18 12 V7.5 A2 2 0 0 1 22 7.5 V12 Z',
  },
  // Truntum: bintang bersudut empat yang bertaburan, ibarat bintang di langit malam.
  truntum: { lebar: 12, tinggi: 12, jalur: 'M6 0 L7.2 4.8 L12 6 L7.2 7.2 L6 12 L4.8 7.2 L0 6 L4.8 4.8 Z' },
  // Gigi haruan: tepi bergerigi tajam seperti gigi ikan haruan (gabus).
  'gigi-haruan': { lebar: 12, tinggi: 10, jalur: 'M0 10 L0 6 L3 2 L6 6 L9 2 L12 6 L12 10 Z' },
  // Tampuk manggis: kelopak buah manggis, lingkaran tengah dikelilingi empat kelopak.
  'tampuk-manggis': {
    lebar: 14,
    tinggi: 12,
    jalur:
      'M4.8 6 A2.2 2.2 0 1 1 9.2 6 A2.2 2.2 0 1 1 4.8 6 Z M5.5 2.5 A1.5 1.5 0 1 1 8.5 2.5 A1.5 1.5 0 1 1 5.5 2.5 Z M5.5 9.5 A1.5 1.5 0 1 1 8.5 9.5 A1.5 1.5 0 1 1 5.5 9.5 Z M2 6 A1.5 1.5 0 1 1 5 6 A1.5 1.5 0 1 1 2 6 Z M9 6 A1.5 1.5 0 1 1 12 6 A1.5 1.5 0 1 1 9 6 Z',
  },
  // Sisik ikan: setengah lingkaran bersusun berlubang, seperti sisik yang saling menindih.
  'sisik-ikan': { lebar: 12, tinggi: 6, jalur: 'M0 6 A6 6 0 0 1 12 6 Z M3 6 A3 3 0 0 1 9 6 Z' },
}
