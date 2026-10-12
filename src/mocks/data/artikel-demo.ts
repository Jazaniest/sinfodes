/**
 * Naskah 12 artikel kabar desa demo (SPEC §12.6): 150–300 kata, ditulis sejalan dengan data modul lain (kegiatan
 * pembangunan, agenda, pengumuman, posyandu). `foto` adalah nama berkas foto kurasi di galeri, atau null.
 */
export type NaskahArtikel = { ringkasan: string; isi: readonly string[]; foto: string | null }

export const NASKAH_ARTIKEL: Readonly<Record<string, NaskahArtikel>> = {
  'Musyawarah Desa Penetapan Penerima BLT Dana Desa 2026': {
    ringkasan:
      'Musyawarah desa khusus menyepakati daftar keluarga penerima BLT Dana Desa 2026 setelah data diperiksa ulang bersama ketua RT dan kepala dusun.',
    isi: [
      'Pemerintah Desa Sungai Sialang menggelar musyawarah desa khusus untuk menetapkan keluarga penerima Bantuan Langsung Tunai (BLT) Dana Desa tahun 2026. Musyawarah berlangsung di balai desa dan dihadiri Badan Permusyawaratan Desa (BPD), kepala dusun, ketua RT, pendamping desa, serta perwakilan warga dari empat dusun.',
      'Sebelum ditetapkan, daftar calon penerima diperiksa ulang bersama ketua RT di setiap dusun. Prioritas diberikan kepada keluarga miskin yang belum menerima Program Keluarga Harapan (PKH), keluarga dengan anggota yang sakit menahun, dan lansia yang tinggal sendiri. Beberapa nama dicoret karena sudah pindah atau kini memiliki penghasilan tetap.',
      'Kepala Desa H. Muhammad Nasir menyampaikan bahwa besaran BLT tahun ini Rp300.000 per keluarga setiap bulan dan dibayarkan per tiga bulan. “Kalau ada tetangga yang layak tetapi belum masuk daftar, sampaikan ke ketua RT atau langsung ke kantor desa,” ujarnya.',
      'Daftar penerima yang sudah disepakati ditempel di kantor desa dan di setiap dusun selama tujuh hari. Dengan begitu, warga masih bisa memberi masukan sebelum daftar dikirim ke kecamatan dan ditetapkan dengan keputusan kepala desa.',
    ],
    foto: 'musyawarah-balai-desa',
  },
  'Semenisasi Jalan Dusun III Capai 70 Persen': {
    ringkasan:
      'Semenisasi jalan lingkungan sepanjang 450 meter di RT 011–013 sudah mencapai 70 persen dan ditargetkan rampung dalam satu setengah bulan.',
    isi: [
      'Pekerjaan semenisasi jalan lingkungan di Dusun III kini sudah mencapai 70 persen. Jalan sepanjang 450 meter yang menghubungkan RT 011 sampai RT 013 itu sebelumnya berupa tanah liat yang licin dan berlumpur setiap kali hujan turun, sehingga anak-anak sering terlambat ke sekolah.',
      'Kegiatan ini dibiayai Dana Desa sebesar Rp245 juta dan dikerjakan Tim Pelaksana Kegiatan (TPK) dengan melibatkan tenaga kerja dari warga setempat. Dengan pola padat karya, upah kerja ikut berputar di desa sendiri dan warga dapat mengawasi mutu pekerjaan dari dekat.',
      'Ketua TPK menjelaskan bahwa pengecoran sisa ruas dilakukan bertahap agar jalan tetap bisa dilalui warga. Kendaraan roda empat diminta tidak melintas di ruas yang baru dicor paling tidak selama tujuh hari, supaya semen mengeras sempurna dan jalan tidak cepat retak.',
      'Perkembangan fisik dan pemakaian anggaran kegiatan ini dapat dipantau warga di halaman Transparansi website desa, lengkap dengan foto sebelum, saat, dan sesudah pengerjaan. Pekerjaan ditargetkan rampung dalam satu setengah bulan ke depan.',
    ],
    foto: 'semenisasi-50',
  },
  'Tradisi Menumbai: Panen Madu Sialang Kembali Digelar': {
    ringkasan:
      'Warga kembali menggelar menumbai, tradisi memanen madu lebah liar dari pohon sialang pada malam hari sambil melantunkan pantun.',
    isi: [
      'Tradisi menumbai kembali digelar warga Sungai Sialang di kawasan hutan desa. Menumbai adalah cara turun-temurun memanen madu lebah liar dari sarang yang menggantung di dahan pohon sialang, pohon tinggi yang batangnya bisa menjulang puluhan meter dan menjadi tempat bersarang ratusan koloni lebah.',
      'Panen dilakukan pada malam hari tanpa cahaya terang agar lebah tidak menyerang. Pemanjat naik membawa tunam, yaitu suluh dari sabut kelapa yang hanya mengeluarkan bara. Sambil memanjat, ia melantunkan pantun dan syair yang dipercaya menenangkan lebah, dijawab oleh warga yang menunggu di bawah pohon.',
      'Sarang madu dipotong lalu diturunkan dengan ember bertali. Hasil panen dibagi kepada pemanjat dan pemilik pohon, sedangkan sebagian disisihkan untuk kegiatan desa. Madu sialang dikenal kental dan harum, dan banyak dicari pembeli dari Pangkalan Kerinci maupun Pekanbaru.',
      'Pemerintah desa mengajak warga menjaga pohon sialang yang tersisa. Pohon ini tidak boleh ditebang, karena dari sanalah madu sialang, salah satu potensi desa, berasal. Menumbai juga diharapkan terus diwariskan kepada generasi muda.',
    ],
    foto: 'madu-sialang',
  },
  'Posyandu Kenanga Selesai Direhab, Layanan Balita Kembali Normal': {
    ringkasan: 'Gedung Posyandu Kenanga di Dusun III selesai direhabilitasi dengan Alokasi Dana Desa sebesar Rp58,5 juta.',
    isi: [
      'Rehabilitasi gedung Posyandu Kenanga di Dusun III telah selesai. Mulai bulan ini, penimbangan, imunisasi, dan pemberian makanan tambahan untuk balita kembali dilaksanakan di gedung tersebut, setelah selama beberapa bulan dipindahkan sementara ke rumah salah seorang kader. Para kader menyambut baik selesainya pekerjaan ini karena ruang pelayanan kini lebih luas dan terang.',
      'Pekerjaan meliputi perbaikan atap yang bocor, penggantian lantai, pengecatan, serta pembuatan ruang tunggu yang lebih teduh bagi ibu dan anak. Gedung juga dilengkapi tempat cuci tangan dan meja pendaftaran baru. Kegiatan ini dibiayai Alokasi Dana Desa sebesar Rp58,5 juta.',
      'Kader posyandu mengingatkan orang tua untuk membawa buku KIA setiap datang ke posyandu. Pencatatan berat dan tinggi badan yang rutin membantu bidan desa mengenali tanda-tanda gangguan pertumbuhan sejak dini, sehingga anak bisa segera mendapat penanganan.',
      'Jadwal posyandu di setiap dusun dapat dilihat di halaman Layanan website desa. Warga yang belum terdaftar sebagai peserta posyandu dapat langsung datang pada hari pelayanan dengan membawa Kartu Keluarga.',
    ],
    foto: 'posyandu',
  },
  'Gotong Royong Bersihkan Parit Jelang Musim Pasang': {
    ringkasan: 'Puluhan warga Dusun II membersihkan parit dari sampah dan eceng gondok agar air pasang tidak meluap ke permukiman.',
    isi: [
      'Menjelang musim pasang besar, warga Dusun II bergotong royong membersihkan parit di sepanjang jalan dusun. Sejak pagi, warga membawa cangkul, parang, dan karung untuk mengangkat sampah serta eceng gondok yang menyumbat aliran air menuju Sungai Kampar. Kegiatan dimulai pukul tujuh pagi dan selesai menjelang zuhur.',
      'Kepala Dusun II, Sukardi, menyebut parit yang tersumbat menjadi penyebab air meluap ke halaman rumah warga saat pasang naik. “Kalau paritnya lancar, air cepat surut dan jalan tidak tergenang berhari-hari,” katanya di sela kegiatan.',
      'Ibu-ibu PKK menyiapkan makanan dan minuman untuk para peserta. Sampah yang terkumpul diangkut ke tempat pembuangan sementara dengan bantuan kendaraan desa, sedangkan eceng gondok dikeringkan untuk dijadikan pupuk oleh kelompok tani. Kegiatan ditutup dengan makan bersama di halaman rumah ketua RT.',
      'Pemerintah desa mengimbau warga tidak membuang sampah ke parit. Gotong royong serupa akan dilanjutkan di parit RT 006–007. Jadwalnya diumumkan di halaman Agenda website desa dan melalui ketua RT masing-masing. Warga diharapkan kembali hadir membawa peralatan sendiri.',
    ],
    foto: 'gotong-royong',
  },
  'Penyaluran BLT Tahap III Dijadwalkan 30 September': {
    ringkasan:
      'Penerima BLT Dana Desa diminta datang ke kantor desa pada 30 September pukul 09.00–12.00 dengan membawa KTP-el dan KK asli.',
    isi: [
      'Penyaluran BLT Dana Desa tahap III untuk periode Juli–September dijadwalkan pada 30 September di Kantor Desa Sungai Sialang, mulai pukul 09.00 sampai 12.00 WIB. Setiap keluarga penerima akan menerima Rp900.000 untuk tiga bulan sekaligus.',
      'Penerima diminta membawa KTP-el dan Kartu Keluarga asli. Bila penerima berhalangan hadir karena sakit atau sudah lanjut usia, bantuan dapat diambil anggota keluarga yang tercantum dalam KK yang sama dengan membawa surat kuasa yang ditandatangani penerima. Formulir surat kuasa dapat diminta di kantor desa pada hari kerja.',
      'Untuk menghindari antrean panjang, penerima dipanggil bergiliran sesuai dusun. Jadwal per dusun disampaikan melalui kepala dusun dan ketua RT. Penerima yang datang lebih awal diminta menunggu di balai desa. Petugas kantor desa juga akan membantu warga yang belum lancar membaca untuk menandatangani tanda terima.',
      'Warga yang belum terdaftar tetapi merasa layak menerima bantuan dapat menyampaikan usulan ke kantor desa atau melalui menu Pengaduan di layanan mandiri warga. Usulan akan diperiksa dan dibahas pada musyawarah desa berikutnya.',
    ],
    foto: 'penyaluran-bantuan',
  },
  'Kelas Ibu Balita: Cegah Stunting dari Dapur Sendiri': {
    ringkasan: 'Kelas ibu balita mengajarkan cara menyusun makanan bergizi dari bahan pangan yang mudah didapat di desa.',
    isi: [
      'Puluhan ibu dari empat dusun mengikuti kelas ibu balita yang digelar pemerintah desa bersama bidan desa dan kader posyandu. Kelas ini membahas cara mencegah stunting, yaitu kondisi anak lebih pendek dari anak seusianya akibat kekurangan gizi dalam waktu lama.',
      'Peserta belajar menyusun menu dari bahan pangan yang mudah didapat di sekitar rumah, seperti ikan sungai, telur, sayur daun ubi, dan kacang-kacangan. Bidan desa menekankan pentingnya protein hewani setiap hari, terutama bagi anak di bawah dua tahun yang sedang tumbuh pesat.',
      'Selain praktik memasak, peserta juga diajari membaca grafik pertumbuhan di buku KIA. Dengan begitu, orang tua bisa ikut memantau perkembangan anaknya di rumah dan tidak menunggu sampai jadwal posyandu berikutnya bila ada yang mengkhawatirkan. Bidan desa juga membuka sesi tanya jawab, dan setiap peserta pulang membawa buku resep sederhana.',
      'Karena peminatnya banyak, pendaftaran kelas gelombang kedua sudah dibuka di kader posyandu masing-masing dusun dengan kuota 30 orang. Kelas ini tidak dipungut biaya dan terbuka bagi ibu hamil maupun ibu yang memiliki balita.',
    ],
    foto: null,
  },
  'BUMDes Sialang Makmur Mulai Pasarkan Ikan Salai Selais': {
    ringkasan:
      'BUMDes Sialang Makmur membeli ikan salai selais dari nelayan desa dan memasarkannya dalam kemasan ke Pangkalan Kerinci dan Pekanbaru.',
    isi: [
      'Badan Usaha Milik Desa (BUMDes) Sialang Makmur mulai memasarkan ikan salai selais hasil olahan warga. Ikan selais yang ditangkap nelayan di Sungai Kampar diasapi di atas bara kayu hingga kering, lalu dikemas dalam plastik vakum agar lebih tahan lama dan mudah dikirim.',
      'Selama ini, nelayan menjual ikan salai kepada pengepul dengan harga yang ditentukan sepihak. Melalui BUMDes, nelayan mendapat harga yang lebih pasti dan dibayar tunai saat menyetor. Keuntungan usaha ini juga menambah pendapatan asli desa.',
      'Produk pertama sudah dikirim ke beberapa toko oleh-oleh di Pangkalan Kerinci dan Pekanbaru. BUMDes juga menerima pesanan langsung melalui WhatsApp, termasuk dari perantau asal Sungai Sialang yang rindu akan rasa ikan salai kampung halaman. Harga ikan salai dalam kemasan 250 gram dapat ditanyakan langsung kepada pengurus BUMDes.',
      'Untuk menjaga mutu, BUMDes akan menggelar pelatihan pengolahan ikan salai bagi warga di balai desa. Pelatihan ini terbuka untuk nelayan dan ibu-ibu yang ingin ikut mengolah, mulai dari membersihkan ikan, mengatur bara, sampai mengemas.',
    ],
    foto: 'ikan-salai',
  },
  '24 Lampu Jalan Tenaga Surya Kini Terangi Dusun I dan II': {
    ringkasan:
      'Sebanyak 24 titik lampu jalan tenaga surya yang dibangun dengan Dana Desa kini menerangi jalan utama Dusun I dan Dusun II.',
    isi: [
      'Jalan utama di Dusun I dan Dusun II kini lebih terang pada malam hari. Pemerintah desa memasang 24 titik lampu jalan tenaga surya yang dibiayai Dana Desa sebesar Rp72 juta, terutama di ruas yang selama ini gelap dan rawan kecelakaan.',
      'Lampu tenaga surya dipilih karena tidak membutuhkan sambungan listrik dan tidak menambah tagihan desa. Setiap tiang dilengkapi panel surya dan baterai yang mampu menyalakan lampu sepanjang malam, bahkan setelah seharian mendung. Lampu menyala otomatis saat hari mulai gelap dan padam sendiri ketika pagi.',
      'Warga merasakan manfaatnya, terutama anak-anak yang pulang mengaji dan nelayan yang berangkat ke sungai sebelum subuh. “Dulu harus membawa senter, sekarang jalannya sudah terang,” ujar seorang warga Dusun I yang setiap pagi berangkat ke pelantar perahu.',
      'Pemerintah desa meminta warga ikut menjaga lampu dari kerusakan dan pencurian. Lampu yang mati dapat dilaporkan ke kantor desa atau melalui menu Pengaduan di layanan mandiri warga, agar segera diperiksa oleh petugas. Pemeriksaan rutin juga dilakukan setiap tiga bulan.',
    ],
    foto: null,
  },
  'Layanan Surat Kini Bisa Diajukan dari HP': {
    ringkasan:
      'Warga kini dapat mengajukan surat keterangan dari HP lewat layanan mandiri, lalu memantau perkembangannya tanpa bolak-balik ke kantor desa.',
    isi: [
      'Pemerintah Desa Sungai Sialang membuka layanan mandiri warga. Melalui layanan ini, warga dapat mengajukan surat keterangan seperti surat keterangan tidak mampu, surat domisili, dan surat keterangan usaha langsung dari HP, kapan saja dan dari mana saja.',
      'Untuk masuk, warga memakai NIK dan PIN enam angka yang diberikan kantor desa. Setelah memilih jenis surat dan melampirkan foto persyaratan, warga mendapat nomor tiket. Kabar perkembangan permohonan dikirim lewat WhatsApp, sehingga warga tidak perlu menunggu di kantor desa.',
      'Surat yang ditandatangani secara elektronik bisa langsung diunduh. Setiap surat memuat kode dan QR yang dapat dipindai siapa saja, misalnya pihak bank atau sekolah, untuk memastikan keasliannya di halaman Cek surat website desa.',
      'Warga yang belum memiliki PIN dapat memintanya di kantor desa dengan membawa KTP-el. Pelayanan langsung di kantor desa tetap dibuka seperti biasa bagi warga yang lebih nyaman datang sendiri. Petugas juga siap membantu warga yang baru pertama kali memakai layanan ini, termasuk mengatur PIN dan nomor WhatsApp.',
    ],
    foto: 'kantor-desa',
  },
  'Festival Bono Teluk Meranti, Warga Siapkan Homestay': {
    ringkasan:
      'Menjelang Festival Bono, warga menyiapkan rumah singgah bagi peselancar dan wisatawan yang datang menyaksikan ombak Bono.',
    isi: [
      'Festival Bono kembali akan digelar di Teluk Meranti. Gelombang Bono, ombak yang terbentuk saat air laut pasang bertemu arus Sungai Kampar, setiap tahun menarik peselancar dari dalam dan luar negeri serta ribuan wisatawan yang ingin menyaksikannya dari tepi sungai.',
      'Warga Sungai Sialang menyiapkan rumah singgah atau homestay bagi wisatawan. Pemerintah desa bersama pemuda Karang Taruna mendata rumah warga yang layak, lalu memberikan pelatihan singkat tentang kebersihan, keamanan, dan cara melayani tamu. Setiap rumah singgah akan diberi papan nama dan daftar harga yang disepakati bersama.',
      'Selain menginap, wisatawan dapat mencicipi ikan salai selais dan madu sialang, serta melihat perahu nelayan yang berlabuh di tepi Sungai Kampar. Kelompok ibu-ibu juga menyiapkan lapak makanan khas di dekat lokasi festival. Perahu nelayan juga bisa disewa untuk melihat Bono dari dekat dengan pendamping yang berpengalaman.',
      'Warga yang ingin rumahnya didaftarkan sebagai rumah singgah dapat menghubungi kantor desa. Pendataan dibuka sampai dua pekan sebelum festival dimulai, supaya rumah yang terdaftar sempat diperiksa petugas.',
    ],
    foto: 'ombak-bono',
  },
  'Hasil Musrenbangdes: 5 Usulan Prioritas untuk 2027': {
    ringkasan: 'Musyawarah perencanaan pembangunan desa menyepakati lima usulan prioritas untuk RKPDes 2027.',
    isi: [
      'Musyawarah Perencanaan Pembangunan Desa (Musrenbangdes) Sungai Sialang menyepakati lima usulan prioritas untuk tahun 2027. Usulan dihimpun lebih dulu dari musyawarah dusun di empat dusun, lalu dibahas bersama BPD, lembaga desa, dan perwakilan kelompok perempuan.',
      'Kelima usulan itu adalah semenisasi jalan lingkungan Dusun IV, penambahan sumur bor air bersih, perbaikan titian kayu penghubung antardusun, pelatihan pengolahan hasil perikanan, dan penambahan alat kesehatan untuk posyandu. Kelima usulan itu dipilih dari 23 usulan yang masuk dari musyawarah dusun.',
      'Kepala Desa H. Muhammad Nasir menjelaskan bahwa urutan prioritas disusun berdasarkan jumlah warga yang merasakan manfaatnya dan tingkat kebutuhan yang paling mendesak. Usulan yang belum masuk prioritas tetap dicatat untuk tahun berikutnya. Ia berterima kasih kepada warga yang hadir dan menyampaikan usulan secara langsung.',
      'Usulan ini akan dibahas lebih lanjut dalam musyawarah desa penyusunan RKPDes 2027 dan disesuaikan dengan pagu anggaran yang tersedia. Hasilnya diumumkan kepada warga melalui website desa dan papan pengumuman di setiap dusun, agar seluruh warga dapat ikut mengawal.',
    ],
    foto: 'musyawarah-balai-desa',
  },
}
