import type { IdPasanganHuruf } from '@/domain/website/tema'

/**
 * Pemuat CSS huruf per pasangan (SPEC-V0.2 §11.1). Hanya kerangka website, halaman masuk warga, dan kerangka warga yang
 * memanggilnya, jadi chunk awal tidak membawa huruf desa. Plex sudah dimuat aplikasi. `font-display: swap` bawaan
 * fontsource menampilkan huruf cadangan sampai berkas selesai dimuat.
 */
const PEMUAT: Readonly<Record<IdPasanganHuruf, () => Promise<unknown>>> = {
  plex: () => Promise.resolve(),
  source: () =>
    Promise.all([
      import('@fontsource/source-serif-4/latin-600.css'),
      import('@fontsource/source-sans-3/latin-400.css'),
      import('@fontsource/source-sans-3/latin-600.css'),
    ]),
  literata: () =>
    Promise.all([
      import('@fontsource/literata/latin-600.css'),
      import('@fontsource/public-sans/latin-400.css'),
      import('@fontsource/public-sans/latin-600.css'),
    ]),
  fraunces: () =>
    Promise.all([
      import('@fontsource/fraunces/latin-600.css'),
      import('@fontsource/work-sans/latin-400.css'),
      import('@fontsource/work-sans/latin-600.css'),
    ]),
  bitter: () =>
    Promise.all([
      import('@fontsource/bitter/latin-600.css'),
      import('@fontsource/atkinson-hyperlegible/latin-400.css'),
      import('@fontsource/atkinson-hyperlegible/latin-700.css'),
    ]),
  archivo: () =>
    Promise.all([
      import('@fontsource/archivo/latin-400.css'),
      import('@fontsource/archivo/latin-600.css'),
      import('@fontsource/archivo/latin-700.css'),
    ]),
}

const termuat = new Map<IdPasanganHuruf, Promise<void>>()
let sudahMemperingatkan = false

/** Memuat satu pasangan huruf sekali saja. Tidak pernah melempar: bila gagal, website tetap tampil dengan huruf cadangan. */
export function muatPasanganHuruf(id: IdPasanganHuruf): Promise<void> {
  const ada = termuat.get(id)
  if (ada) return ada
  const janji = PEMUAT[id]().then(
    () => undefined,
    (galat: unknown) => {
      if (!sudahMemperingatkan) {
        sudahMemperingatkan = true
        console.warn('Huruf website gagal dimuat; memakai huruf cadangan.', galat)
      }
    },
  )
  termuat.set(id, janji)
  return janji
}
