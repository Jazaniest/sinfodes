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
