/** Tabel kode wilayah minimal (SPEC §4.5). Kode mengikuti Permendagri kode wilayah (SPEC Lampiran A). */
export const PROVINSI: Readonly<Record<string, string>> = {
  '11': 'Aceh', '12': 'Sumatera Utara', '13': 'Sumatera Barat', '14': 'Riau', '15': 'Jambi',
  '16': 'Sumatera Selatan', '17': 'Bengkulu', '18': 'Lampung', '19': 'Kepulauan Bangka Belitung',
  '21': 'Kepulauan Riau', '31': 'DKI Jakarta', '32': 'Jawa Barat', '33': 'Jawa Tengah', '34': 'DI Yogyakarta',
  '35': 'Jawa Timur', '36': 'Banten', '51': 'Bali', '52': 'Nusa Tenggara Barat', '53': 'Nusa Tenggara Timur',
  '61': 'Kalimantan Barat', '62': 'Kalimantan Tengah', '63': 'Kalimantan Selatan', '64': 'Kalimantan Timur',
  '65': 'Kalimantan Utara', '71': 'Sulawesi Utara', '72': 'Sulawesi Tengah', '73': 'Sulawesi Selatan',
  '74': 'Sulawesi Tenggara', '75': 'Gorontalo', '76': 'Sulawesi Barat', '81': 'Maluku', '82': 'Maluku Utara',
  '91': 'Papua', '92': 'Papua Barat', '93': 'Papua Selatan', '94': 'Papua Tengah', '95': 'Papua Pegunungan',
  '96': 'Papua Barat Daya',
}

/** Kabupaten/kota di Riau + kabupaten asal pendatang yang dipakai data dummy (SPEC §12.5). Diverifikasi 25 Sep 2026. */
export const KABUPATEN: Readonly<Record<string, string>> = {
  '1401': 'Kampar', '1402': 'Indragiri Hulu', '1403': 'Bengkalis', '1404': 'Indragiri Hilir',
  '1405': 'Pelalawan', '1406': 'Rokan Hulu', '1407': 'Rokan Hilir', '1408': 'Siak', '1409': 'Kuantan Singingi',
  '1410': 'Kepulauan Meranti', '1471': 'Pekanbaru', '1472': 'Dumai',
  '3309': 'Boyolali', '3310': 'Klaten', '1306': 'Agam', '1202': 'Tapanuli Utara', '1212': 'Toba',
}

export const KECAMATAN: Readonly<Record<string, string>> = {
  '140501': 'Ukui', '140502': 'Pangkalan Kerinci', '140503': 'Pangkalan Kuras', '140504': 'Pangkalan Lesung',
  '140505': 'Langgam', '140506': 'Pelalawan', '140507': 'Kerumutan', '140508': 'Bunut', '140509': 'Teluk Meranti',
  '140510': 'Kuala Kampar', '140511': 'Bandar Sei Kijang', '140512': 'Bandar Petalangan',
  // Kecamatan desa lain di Konsol (SPEC §12.8). Diverifikasi 13 Okt 2026 dari daftar kecamatan di Wikipedia.
  '140103': 'Tambang', '140117': 'Kampa', '140802': 'Sungai Apit', '140804': 'Tualang',
  '140407': 'Mandah', '140408': 'Kateman', '140906': 'Benai', '140909': 'Pangean',
}

/** "140509" → "Teluk Meranti, Pelalawan"; "331001" → "Klaten, Jawa Tengah"; tidak dikenal → null. */
export function namaWilayah(kode6: string): string | null {
  const kecamatan = KECAMATAN[kode6] as string | undefined
  const kabupaten = KABUPATEN[kode6.slice(0, 4)] as string | undefined
  const provinsi = PROVINSI[kode6.slice(0, 2)] as string | undefined
  if (kecamatan && kabupaten) return `${kecamatan}, ${kabupaten}`
  if (kabupaten && provinsi) return `${kabupaten}, ${provinsi}`
  return provinsi ?? null
}

/** "140509" → "14.05.09", "1405" → "14.05": kode wilayah bertitik seperti di data desa. */
export const bertitik = (kode: string): string => kode.replace(/(\d{2})(?=\d)/g, '$1.')

const tanpaTitik = (kode: string): string => kode.replaceAll('.', '')

export type OpsiWilayah = { kode: string; nama: string }
const urutNama = (a: OpsiWilayah, b: OpsiWilayah) => a.nama.localeCompare(b.nama, 'id')

/** Pilihan provinsi isian Tambah desa (SPEC §11), urut nama. */
export const daftarProvinsi = (): OpsiWilayah[] => Object.entries(PROVINSI).map(([kode, nama]) => ({ kode, nama })).sort(urutNama)

/** Kabupaten/kota satu provinsi yang ada di tabel minimal; kosong untuk provinsi yang belum dimuat. */
export const kabupatenDi = (provinsi: string): OpsiWilayah[] =>
  Object.entries(KABUPATEN)
    .filter(([k]) => k.startsWith(tanpaTitik(provinsi)))
    .map(([k, nama]) => ({ kode: bertitik(k), nama }))
    .sort(urutNama)

/** Kecamatan satu kabupaten yang ada di tabel minimal; kosong untuk kabupaten yang belum dimuat. */
export const kecamatanDi = (kabupaten: string): OpsiWilayah[] =>
  Object.entries(KECAMATAN)
    .filter(([k]) => k.startsWith(tanpaTitik(kabupaten)))
    .map(([k, nama]) => ({ kode: bertitik(k), nama }))
    .sort(urutNama)

/** Kecamatan, kabupaten, dan provinsi dari kode kecamatan bertitik; null bila salah satunya tidak dikenal. */
export function wilayahKecamatan(kode: string): { kecamatan: OpsiWilayah; kabupaten: OpsiWilayah; provinsi: OpsiWilayah } | null {
  const k = tanpaTitik(kode)
  const kecamatan = KECAMATAN[k] as string | undefined
  const kabupaten = KABUPATEN[k.slice(0, 4)] as string | undefined
  const provinsi = PROVINSI[k.slice(0, 2)] as string | undefined
  if (!kecamatan || !kabupaten || !provinsi) return null
  return {
    kecamatan: { kode: bertitik(k), nama: kecamatan },
    kabupaten: { kode: bertitik(k.slice(0, 4)), nama: kabupaten },
    provinsi: { kode: k.slice(0, 2), nama: provinsi },
  }
}
