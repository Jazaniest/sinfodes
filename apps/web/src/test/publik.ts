import type { IdentitasPublik } from '@/domain/publik/schema'
import { TEMA_WARTA_BAWAAN } from '@/domain/website/tema'
import { DESA_DEMO, ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'

/** Identitas website Desa Sungai Sialang dengan tampilan bawaannya. Khusus uji. */
export function contohIdentitasPublik(): IdentitasPublik {
  const d = DESA_DEMO.find((x) => x.id === ID_SUNGAI_SIALANG)
  if (!d) throw new Error('Desa demo tidak ada')
  const dasar = `/desa/${d.slug}`
  return {
    slug: d.slug, nama: d.nama, kecamatan: d.kecamatan, kabupaten: d.kabupaten, provinsi: d.provinsi, alamatKantor: d.alamatKantor,
    kodePos: d.kodePos, surel: d.surel, telepon: d.telepon, jamLayanan: d.jamLayanan, luasKm2: d.luasKm2,
    tema: (({ warga, ...t }) => (void warga, t))(TEMA_WARTA_BAWAAN('#1F4E79')),
    favicon: null,
    menu: [
      { label: 'Beranda', href: dasar, luar: false },
      { label: 'Profil', href: `${dasar}/profil`, luar: false },
      { label: 'Kabar', href: `${dasar}/kabar`, luar: false },
      { label: 'Transparansi', href: `${dasar}/transparansi`, luar: false },
      { label: 'Statistik', href: `${dasar}/statistik`, luar: false },
      { label: 'Potensi', href: `${dasar}/potensi`, luar: false },
      { label: 'Layanan', href: `${dasar}/layanan`, luar: false },
      { label: 'Cek surat', href: `${dasar}/verifikasi`, luar: false },
    ],
    cssKustom: null,
  }
}
