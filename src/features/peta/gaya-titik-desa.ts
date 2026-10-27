import type { KelasRealisasi, KelasTingkatan } from '@/domain/kabupaten/peta'
import type { Titik } from '@/domain/peta/titik'
import type { StatusDesa } from '@/domain/wilayah/schema'
import { lapisanDasar, saringId, sumberDasar, WARNA_PETA, type StyleSpecification } from './gaya-peta'

/** Satu titik desa beserta warnanya; warnanya ditentukan lapisan yang sedang dipilih. */
export type TitikBerwarna = { id: string; titik: Titik; warna: string }

/** Warna titik desa (literal untuk MapLibre, dari palet Register yang sama dengan `WARNA_PETA`). */
export const WARNA_TITIK = {
  status: { Aktif: '#28704F', 'Uji coba': '#1F4E79', Persiapan: '#8A6212', Ditangguhkan: '#5A636C' } satisfies Record<StatusDesa, string>,
  realisasi: { tertinggal: '#A03A2C', bawah: '#8A6212', atas: '#28704F', kosong: '#5A636C' } satisfies Record<KelasRealisasi, string>,
  // Satu ramp biru dari terang (Rintisan) ke pekat (Mandiri Digital), abu-abu untuk belum ber-Indeks; tanpa merah supaya tidak terasa menghukum.
  tingkatan: { rintisan: '#A9C4DB', berkembang: '#6A93B8', maju: '#2F6A9B', mandiri: '#123F66', kosong: '#8A9097' } satisfies Record<KelasTingkatan, string>,
  portal: { bergabung: '#28704F', persiapan: '#8A6212' },
  sorotan: WARNA_PETA.fasilitas,
} as const

type Koleksi = {
  type: 'FeatureCollection'
  features: { type: 'Feature'; properties: { id: string; warna: string }; geometry: { type: 'Point'; coordinates: Titik } }[]
}

export function fiturTitik(titik: readonly TitikBerwarna[]): Koleksi {
  return {
    type: 'FeatureCollection',
    features: titik.map((t) => ({ type: 'Feature', properties: { id: t.id, warna: t.warna }, geometry: { type: 'Point', coordinates: t.titik } })),
  }
}

/** Kotak terkecil yang memuat semua titik, untuk `fitBounds`; null bila tidak ada titik. */
export function batasTitik(titik: readonly TitikBerwarna[]): [Titik, Titik] | null {
  if (titik.length === 0) return null
  const bujur = titik.map((t) => t.titik[0])
  const lintang = titik.map((t) => t.titik[1])
  return [
    [Math.min(...bujur), Math.min(...lintang)],
    [Math.max(...bujur), Math.max(...lintang)],
  ]
}

/** Gaya peta kabupaten (SPEC-V0.2 §8.2, §8.3 butir 5): peta kertas Peta Desa, lalu titik desa berwarna dan sorotan pilihan. */
export function gayaTitikDesa(titik: readonly TitikBerwarna[]): StyleSpecification {
  return {
    version: 8,
    sources: { dasar: sumberDasar(), titik: { type: 'geojson', data: fiturTitik(titik) } },
    layers: [
      ...lapisanDasar(),
      {
        id: 'titik', type: 'circle', source: 'titik',
        paint: { 'circle-radius': 6, 'circle-color': ['get', 'warna'], 'circle-stroke-color': WARNA_PETA.kertas, 'circle-stroke-width': 1.5 },
      },
      {
        id: 'titik-terpilih', type: 'circle', source: 'titik', filter: saringId(''),
        paint: { 'circle-radius': 11, 'circle-opacity': 0, 'circle-stroke-color': WARNA_TITIK.sorotan, 'circle-stroke-width': 2.5 },
      },
    ],
  }
}
