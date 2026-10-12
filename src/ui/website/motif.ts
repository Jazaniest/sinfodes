import type { MotifWebsite } from '@/domain/website/schema'

/** Satu ubin pola pita motif (SPEC §9), diisi warna aksen desa. Ukuran dalam piksel SVG. */
export const POLA_MOTIF: Readonly<Record<MotifWebsite, { lebar: number; tinggi: number; jalur: string }>> = {
  // Pucuk rebung: segitiga tegak dan terbalik berselang (▲▼), seperti tepi kain songket Melayu.
  'pucuk-rebung': { lebar: 16, tinggi: 12, jalur: 'M0 12 L4 0 L8 12 Z M8 0 L12 12 L16 0 Z' },
  // Siku keluang: siku bersambung seperti sayap kelelawar.
  'siku-keluang': { lebar: 16, tinggi: 12, jalur: 'M0 0 L8 8 L16 0 L16 4 L8 12 L0 4 Z' },
  // Garis: garis miring sederhana, netral untuk daerah mana pun.
  garis: { lebar: 8, tinggi: 12, jalur: 'M0 12 L6 0 L8 0 L2 12 Z' },
}
