/**
 * Foto demo hasil kurasi (SPEC §9, K8): semuanya dari Wikimedia Commons dengan lisensi bebas, tanpa foto buatan AI.
 * `berkas` adalah nama berkas di public/demo/foto/. Dipakai pembangkit data (kredit galeri) dan scripts/unduh-foto-demo.mjs,
 * jadi berkas ini tidak boleh mengimpor apa pun.
 */
export type FotoDemo = {
  berkas: string
  /** Judul berkas di Wikimedia Commons. */
  judulCommons: string
  pembuat: string
  lisensi: string
  tautanLisensi: string
}

export const FOTO_DEMO: readonly FotoDemo[] = [
  {
    berkas: 'sampul-sungai-kampar',
    judulCommons: 'Sungai Kampar.jpg',
    pembuat: 'M Zai Ar',
    lisensi: 'CC BY-SA 4.0',
    tautanLisensi: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  {
    berkas: 'kantor-desa',
    judulCommons: 'KANTOR DESA.jpg',
    pembuat: 'Desa Sungai Jering',
    lisensi: 'CC BY-SA 4.0',
    tautanLisensi: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  {
    berkas: 'musyawarah-balai-desa',
    judulCommons: 'Musyawarah.jpg',
    pembuat: 'Yohere',
    lisensi: 'CC0',
    tautanLisensi: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  {
    berkas: 'posyandu',
    judulCommons: 'Kegiatan Posyandu Desa Koto Cerenti.jpg',
    pembuat: 'Refki Assadiky',
    lisensi: 'CC BY-SA 4.0',
    tautanLisensi: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  {
    berkas: 'gotong-royong',
    judulCommons: 'Gotong Royong, Kerja Tanpa Pamrih.jpg',
    pembuat: 'Adyagustian',
    lisensi: 'CC BY-SA 4.0',
    tautanLisensi: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  {
    berkas: 'penyaluran-bantuan',
    judulCommons: 'SerahTerima Bantuan Pangan Bulog Kepada Warga Desa Tawangargo.jpg',
    pembuat: 'Sakila Karema',
    lisensi: 'CC0',
    tautanLisensi: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  {
    berkas: 'semenisasi-0',
    judulCommons: 'Street in Lojejer, Jember Regency, East Java, Indonesia.jpg',
    pembuat: 'sugeng widodo',
    lisensi: 'CC BY-SA 3.0',
    tautanLisensi: 'https://creativecommons.org/licenses/by-sa/3.0/',
  },
  {
    berkas: 'semenisasi-50',
    judulCommons: 'Pembangunan Jalan Usaha Tani Desa Bandung Kec.Kebumen Kab.Kebumen Jateng Indonesia.jpg',
    pembuat: 'SATELIT BM',
    lisensi: 'CC BY-SA 4.0',
    tautanLisensi: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  {
    berkas: 'semenisasi-100',
    judulCommons: 'Jalan Rabat Beton.jpg',
    pembuat: 'DARMAS BS 9',
    lisensi: 'CC BY-SA 4.0',
    tautanLisensi: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  {
    berkas: 'madu-sialang',
    judulCommons: 'Madu Sialang Nagari Latang.jpg',
    pembuat: 'Zhilal Darma',
    lisensi: 'CC BY-SA 4.0',
    tautanLisensi: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  {
    berkas: 'kebun-sawit',
    judulCommons: 'Kebun kelapa sawit milik keluarga bibi·tante–mina saya di Desa Samba Danum (20260411 130456).jpg',
    pembuat: 'Gabpzxs',
    lisensi: 'CC0',
    tautanLisensi: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  {
    berkas: 'sadap-karet',
    judulCommons: 'Sadap Karet.jpg',
    pembuat: 'Herylondo',
    lisensi: 'CC BY-SA 4.0',
    tautanLisensi: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  {
    berkas: 'ikan-salai',
    judulCommons: 'Salai 20200227 102852 tdp.jpg',
    pembuat: 'Wibowo Djatmiko (Wie146)',
    lisensi: 'CC BY-SA 4.0',
    tautanLisensi: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  {
    berkas: 'ombak-bono',
    judulCommons: 'Bekudo Bono.jpg',
    pembuat: 'Domiyanto1977',
    lisensi: 'CC BY-SA 4.0',
    tautanLisensi: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  {
    berkas: 'perahu-sungai',
    judulCommons: 'Berkendara di atas Kendaraan kabupaten Siak-Riau.jpg',
    pembuat: 'Ken Hadi Syah putra',
    lisensi: 'CC BY-SA 4.0',
    tautanLisensi: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
]

/** Halaman berkas di Wikimedia Commons, untuk kredit foto. */
export const halamanCommons = (judul: string): string =>
  `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(judul.replace(/ /g, '_'))}`
