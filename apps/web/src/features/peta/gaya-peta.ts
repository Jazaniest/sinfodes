import type { Map as PetaMapLibre, MapOptions } from 'maplibre-gl'
import type { JenisLapisan, LapisanPeta, Titik } from '@/domain/peta/schema'

// maplibre-gl 6 tidak mengekspor tipe spesifikasi gaya; diturunkan dari API-nya supaya tanpa pustaka tambahan.
export type StyleSpecification = Exclude<MapOptions['style'], string | undefined>
export type FilterSpecification = NonNullable<Parameters<PetaMapLibre['setFilter']>[1]>

/** Warna Register (src/ui/styles/register.css) untuk peta kertas. MapLibre butuh warna literal, bukan variabel CSS. */
export const WARNA_PETA = {
  kertas: '#F6F4EE',
  tutupan: '#E4E6D6',
  air: '#C9D9E0',
  sungai: '#9DB9C6',
  tepiJalan: '#DDD7CA',
  jalan: '#FFFEFA',
  dusunIsi: '#1F4E79',
  batas: '#5A636C',
  fasilitas: '#1B2631',
  kegiatan: '#8A6212',
  kegiatanSelesai: '#28704F',
  terpilih: '#A03A2C',
} as const

/** Tile vektor OpenFreeMap (skema OpenMapTiles), tanpa API key (SPEC §3.7). */
export const SUMBER_DASAR = 'https://tiles.openfreemap.org/planet'
const ATRIBUSI =
  '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> · Data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'

/** Lapisan MapLibre untuk tiap lapisan yang bisa dinyalakan dan dimatikan (SPEC §8). */
export const ID_LAPISAN: Readonly<Record<JenisLapisan, readonly string[]>> = {
  dusun: ['dusun-isi', 'dusun-garis', 'dusun-terpilih'],
  fasilitas: ['fasilitas', 'fasilitas-terpilih'],
  kegiatan: ['kegiatan', 'kegiatan-terpilih'],
}

/** Lapisan yang bisa diklik untuk membuka panel info. */
export const LAPISAN_KLIK: Readonly<Record<string, JenisLapisan>> = { 'dusun-isi': 'dusun', fasilitas: 'fasilitas', kegiatan: 'kegiatan' }

type Properti = Record<string, string | number>
type Fitur<G> = { type: 'Feature'; properties: Properti; geometry: G }
type Koleksi<G> = { type: 'FeatureCollection'; features: Fitur<G>[] }
type Poligon = { type: 'Polygon'; coordinates: Titik[][] }
type Titiknya = { type: 'Point'; coordinates: Titik }

/** Data GeoJSON lapisan desa: batas dusun, fasilitas umum, dan lokasi kegiatan pembangunan. */
export function fiturPeta(l: LapisanPeta): { dusun: Koleksi<Poligon>; fasilitas: Koleksi<Titiknya>; kegiatan: Koleksi<Titiknya> } {
  return {
    dusun: {
      type: 'FeatureCollection',
      features: l.dusun.map((d) => ({ type: 'Feature', properties: { id: d.dusunId }, geometry: { type: 'Polygon', coordinates: [d.batas] } })),
    },
    fasilitas: {
      type: 'FeatureCollection',
      features: l.fasilitas.map((f) => ({
        type: 'Feature', properties: { id: f.id, jenis: f.jenis, nama: f.nama }, geometry: { type: 'Point', coordinates: f.titik },
      })),
    },
    kegiatan: {
      type: 'FeatureCollection',
      features: l.kegiatan.map((k) => ({
        type: 'Feature', properties: { id: k.id, status: k.status, nama: k.nama }, geometry: { type: 'Point', coordinates: k.titik },
      })),
    },
  }
}

/** Saringan satu objek menurut ID-nya; ID kosong berarti tidak ada yang disorot. */
export function saringId(id: string): FilterSpecification {
  return ['==', ['get', 'id'], id]
}

/** Sumber tile dasar, dipakai juga peta kabupaten. */
export const sumberDasar = (): StyleSpecification['sources'][string] => ({ type: 'vector', url: SUMBER_DASAR, attribution: ATRIBUSI })

/**
 * Lapisan peta kertas tanpa label nama tempat (SPEC §8): tile dasar hanya untuk air, sungai, tutupan lahan, dan jalan;
 * tidak ada lapisan `symbol`, jadi tidak perlu glyph atau sprite. Dipakai Peta Desa dan peta kabupaten.
 */
export const lapisanDasar = (): StyleSpecification['layers'] => [
  { id: 'latar', type: 'background', paint: { 'background-color': WARNA_PETA.kertas } },
  { id: 'tutupan', type: 'fill', source: 'dasar', 'source-layer': 'landcover', paint: { 'fill-color': WARNA_PETA.tutupan, 'fill-opacity': 0.7 } },
  { id: 'air', type: 'fill', source: 'dasar', 'source-layer': 'water', paint: { 'fill-color': WARNA_PETA.air } },
  { id: 'sungai', type: 'line', source: 'dasar', 'source-layer': 'waterway', paint: { 'line-color': WARNA_PETA.sungai, 'line-width': 1.5 } },
  { id: 'jalan-tepi', type: 'line', source: 'dasar', 'source-layer': 'transportation', paint: { 'line-color': WARNA_PETA.tepiJalan, 'line-width': 3.5 } },
  { id: 'jalan', type: 'line', source: 'dasar', 'source-layer': 'transportation', paint: { 'line-color': WARNA_PETA.jalan, 'line-width': 1.5 } },
]

/** Gaya Peta Desa (SPEC §8): peta kertas, lalu lapisan desa sendiri. */
export function gayaPeta(l: LapisanPeta): StyleSpecification {
  const f = fiturPeta(l)
  return {
    version: 8,
    sources: {
      dasar: sumberDasar(),
      dusun: { type: 'geojson', data: f.dusun },
      fasilitas: { type: 'geojson', data: f.fasilitas },
      kegiatan: { type: 'geojson', data: f.kegiatan },
    },
    layers: [
      ...lapisanDasar(),
      { id: 'dusun-isi', type: 'fill', source: 'dusun', paint: { 'fill-color': WARNA_PETA.dusunIsi, 'fill-opacity': 0.06 } },
      { id: 'dusun-garis', type: 'line', source: 'dusun', paint: { 'line-color': WARNA_PETA.batas, 'line-width': 1.5, 'line-dasharray': [3, 2] } },
      { id: 'dusun-terpilih', type: 'line', source: 'dusun', filter: saringId(''), paint: { 'line-color': WARNA_PETA.terpilih, 'line-width': 3 } },
      {
        id: 'fasilitas', type: 'circle', source: 'fasilitas',
        paint: { 'circle-radius': 5, 'circle-color': WARNA_PETA.fasilitas, 'circle-stroke-color': WARNA_PETA.kertas, 'circle-stroke-width': 1.5 },
      },
      {
        id: 'fasilitas-terpilih', type: 'circle', source: 'fasilitas', filter: saringId(''),
        paint: { 'circle-radius': 10, 'circle-opacity': 0, 'circle-stroke-color': WARNA_PETA.terpilih, 'circle-stroke-width': 2.5 },
      },
      {
        id: 'kegiatan', type: 'circle', source: 'kegiatan',
        paint: {
          'circle-radius': 7,
          'circle-color': ['match', ['get', 'status'], 'selesai', WARNA_PETA.kegiatanSelesai, WARNA_PETA.kegiatan],
          'circle-stroke-color': WARNA_PETA.kertas,
          'circle-stroke-width': 2,
        },
      },
      {
        id: 'kegiatan-terpilih', type: 'circle', source: 'kegiatan', filter: saringId(''),
        paint: { 'circle-radius': 12, 'circle-opacity': 0, 'circle-stroke-color': WARNA_PETA.terpilih, 'circle-stroke-width': 2.5 },
      },
    ],
  }
}
