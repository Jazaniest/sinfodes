import type { KategoriPotensi, ProfilDesa } from '@/domain/website/schema'

/**
 * Profil Desa Sungai Sialang (fiktif). Sejarah ditulis sebagai cerita tetua kampung. Tempat yang disebut hanya wilayah
 * resmi dan desa fiktif dari SPEC §12.1 (Teluk Pauh). Jarak dibulatkan.
 */
export const PROFIL_DEMO: Omit<ProfilDesa, 'desaId'> = {
  foto: '/demo/foto/kantor-desa.jpg',
  sejarah: [
    'Menurut cerita para tetua, Sungai Sialang berawal dari beberapa rumah panggung di tepi anak Sungai Kampar pada awal abad ke-20. Para peramu hasil hutan singgah di sana karena di sepanjang anak sungai itu berdiri pohon-pohon sialang yang tinggi, tempat lebah hutan bersarang. Dari pohon itulah nama kampung ini berasal.',
    'Selama puluhan tahun kampung ini menjadi bagian dari Desa Teluk Pauh. Warga hidup dari menumbai, yaitu memanen madu sialang pada malam hari, dari menangkap ikan selais di sungai, dan dari berkebun karet. Perahu menjadi satu-satunya jalan ke ibu kota kecamatan sampai jalan tanah dibuka pada tahun 1980-an.',
    'Seiring bertambahnya penduduk, Sungai Sialang dimekarkan menjadi desa sendiri pada tahun 2003 dengan empat dusun: Kampung Tengah, Sialang Jaya, Teluk Rengas, dan Sungai Lamo. Kebun sawit rakyat mulai tumbuh pada masa yang sama dan kini menjadi sumber penghasilan utama sebagian besar keluarga, di samping karet, madu, dan ikan.',
  ],
  visi: 'Terwujudnya Desa Sungai Sialang yang maju, mandiri, dan sejahtera dengan menjaga adat Melayu serta kelestarian Sungai Kampar.',
  misi: [
    'Memberikan pelayanan administrasi yang cepat, terbuka, dan bisa diakses dari HP.',
    'Membangun jalan, air bersih, dan sarana umum yang merata di empat dusun.',
    'Meningkatkan kesehatan ibu dan anak melalui posyandu dan pencegahan stunting.',
    'Mengembangkan usaha warga dan BUMDes dari madu sialang, ikan salai, dan hasil kebun.',
    'Menjaga hutan sialang, Sungai Kampar, dan tradisi menumbai bersama lembaga adat.',
  ],
  jarak: [
    { ke: 'ibu kota kecamatan', tempat: 'Teluk Meranti', km: 14 },
    { ke: 'ibu kota kabupaten', tempat: 'Pangkalan Kerinci', km: 152 },
  ],
}

/** 6 potensi desa (SPEC §9, §12.6). `foto` adalah nama berkas di /demo/foto/ (kurasi tahap 5A). */
export const POTENSI_DEMO: readonly { judul: string; kategori: KategoriPotensi; ringkasan: string; isi: readonly string[]; foto: string }[] = [
  {
    judul: 'Madu sialang',
    kategori: 'Hasil hutan',
    ringkasan: 'Madu hutan dari lebah yang bersarang di pohon sialang, dipanen dengan tradisi menumbai.',
    isi: [
      'Pohon sialang di hutan desa dihuni koloni lebah hutan yang bisa menghasilkan puluhan kilogram madu dari satu pohon. Panen dilakukan pada malam hari dengan tradisi menumbai: pemanjat naik sambil melantunkan pantun untuk menenangkan lebah.',
      'Pohon sialang dilindungi aturan adat dan tidak boleh ditebang. Warga menjual madu dalam botol 250 ml dan 500 ml, terutama sesudah musim panen pada pertengahan dan akhir tahun.',
    ],
    foto: 'madu-sialang',
  },
  {
    judul: 'Kebun sawit rakyat',
    kategori: 'Perkebunan',
    ringkasan: 'Sekitar 1.150 hektare kebun sawit milik warga menjadi sumber penghasilan utama banyak keluarga.',
    isi: [
      'Kebun sawit rakyat tersebar di keempat dusun. Sebagian besar dikelola keluarga dengan luas 2 sampai 4 hektare, dan tandan buah segarnya dijual ke pengepul dan pabrik kelapa sawit di kecamatan.',
      'Desa juga memiliki kebun sawit tanah kas desa seluas 2,5 hektare yang hasilnya masuk ke pendapatan asli desa.',
    ],
    foto: 'kebun-sawit',
  },
  {
    judul: 'Karet rakyat',
    kategori: 'Perkebunan',
    ringkasan: 'Kebun karet tua dan muda masih disadap setiap pagi, terutama di Dusun III dan Dusun IV.',
    isi: [
      'Karet adalah tanaman warisan yang sudah ditanam sebelum sawit masuk. Penyadap bekerja sejak subuh, lalu getah dibekukan menjadi lum dan dijual setiap pekan.',
      'Sebagian kebun tua sedang diremajakan dengan bibit unggul, didampingi penyuluh pertanian kecamatan.',
    ],
    foto: 'sadap-karet',
  },
  {
    judul: 'Ikan salai selais',
    kategori: 'Perikanan',
    ringkasan: 'Ikan selais dan baung dari Sungai Kampar diasap menjadi salai, oleh-oleh khas yang tahan lama.',
    isi: [
      'Nelayan menangkap ikan selais, baung, dan patin di Sungai Kampar dan anak-anak sungainya. Ikan lalu diasap di atas para-para selama dua sampai tiga hari sampai kering dan berwarna keemasan.',
      'Sejak tahun ini BUMDes Sialang Makmur membeli salai dari warga dan memasarkannya dalam kemasan berlabel ke Pangkalan Kerinci dan Pekanbaru.',
    ],
    foto: 'ikan-salai',
  },
  {
    judul: 'Ombak Bono',
    kategori: 'Wisata',
    ringkasan: 'Gelombang pasang Sungai Kampar yang bisa diselancari, paling besar saat bulan purnama dan bulan baru.',
    isi: [
      'Bono terjadi ketika air pasang dari laut bertemu arus Sungai Kampar dan membentuk gelombang yang bergulung jauh ke hulu. Peselancar dari dalam dan luar negeri datang ke Teluk Meranti untuk merasakannya.',
      'Warga Sungai Sialang menyiapkan homestay dan perahu antar-jemput ke titik pengamatan Bono. Jadwal Bono terbesar biasanya diumumkan menjelang Festival Bono setiap tahun.',
    ],
    foto: 'ombak-bono',
  },
  {
    judul: 'Susur Sungai Kampar',
    kategori: 'Wisata',
    ringkasan: 'Perjalanan perahu menyusuri Sungai Kampar, melewati hutan rawa, kampung nelayan, dan pohon sialang.',
    isi: [
      'Perahu kayu bermesin masih menjadi alat angkut sehari-hari warga. Pengunjung bisa menyewa perahu beserta pemandunya untuk menyusuri sungai pada pagi atau sore hari.',
      'Perjalanan dua jam melewati kampung-kampung di tepi sungai, hutan rawa, dan pohon sialang yang tampak dari kejauhan.',
    ],
    foto: 'perahu-sungai',
  },
]

/** 5 UMKM warga (SPEC §9, §12.6). Nomor WhatsApp fiktif; Zulkifli memakai nomor akun warganya (SPEC §12.9). */
export const UMKM_DEMO: readonly { nama: string; pemilik: string; produk: string; dusun: number; whatsapp: string }[] = [
  { nama: 'Madu Sialang Tunas Rimba', pemilik: 'Syamsul Bahri', produk: 'Madu hutan sialang, botol 250 ml dan 500 ml', dusun: 2, whatsapp: '081275503418' },
  { nama: 'Salai Selais Mak Ijah', pemilik: 'Khadijah', produk: 'Ikan salai selais dan baung, kemasan 250 gram', dusun: 1, whatsapp: '082284117096' },
  { nama: 'Toko Bangunan Rengas Jaya', pemilik: 'Zulkifli', produk: 'Semen, besi, kayu, dan bahan bangunan lainnya', dusun: 3, whatsapp: '081371185570' },
  { nama: 'Anyaman Pandan Seri Kampar', pemilik: 'Rohani', produk: 'Tikar, tas, dan tudung saji anyaman pandan', dusun: 4, whatsapp: '085271640923' },
  { nama: 'Homestay Tepian Bono', pemilik: 'Hendra Gunawan', produk: 'Penginapan dan sewa perahu ke titik pengamatan Bono', dusun: 1, whatsapp: '081365208841' },
]
