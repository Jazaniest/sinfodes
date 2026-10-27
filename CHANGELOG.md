# Catatan Perubahan

Semua perubahan penting Sinfodes dicatat di sini. Formatnya mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/), dan penomoran versinya mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [Belum dirilis]

### Diubah (tahap 8B)

- **Skema dan aturan domain menjadi paket `@sinfodes/kontrak`** (`packages/kontrak`), dan **pembangkit data demo menjadi paket `@sinfodes/demo`** (`packages/demo`). Keduanya paket sumber tanpa langkah build, disiapkan supaya server di tahap berikutnya memakai skema yang sama. Tidak ada perubahan perilaku.
- Impor `@/domain/...` di frontend tetap berlaku lewat alias. Impor pembangkit data kini `@sinfodes/demo/...`.
- Batas paket dijaga tiga lapis: `tsc` tanpa API DOM maupun Node, aturan impor ESLint di tiap paket, dan satu uji susunan di web.

### Diubah (tahap 8A)

- **Repositori menjadi monorepo pnpm.** Frontend pindah ke `apps/web` tanpa perubahan perilaku. Perintah dari akar (`pnpm dev`, `build`, `typecheck`, `lint`, `test`) tetap sama, dan `pnpm-lock.yaml` hanya memindahkan pengimpor `.` ke `apps/web`.
- Uji `panduan-demo` kini mencari `PANDUAN-DEMO.md` dari akar workspace lewat `akarRepo()`, dan tidak lagi lolos diam-diam bila berkas tidak ditemukan dari folder kerja.

## [0.2.0] - 2026-10-26

Rilis ini mengubah Sinfodes dari satu desa demo menjadi platform multi-desa yang utuh. Lima hal terbesarnya:

- **Alamat subdomain.** Desa, kabupaten, dan Konsol masing-masing punya alamat sendiri, mis. `sungaisialang.sinfodes.localhost`. Sesi terpisah per alamat, dan Konsol tidak lagi memuat isi data desa.
- **Kabupaten.** Kabupaten mitra punya portal publik dan dasbor: pemantauan, Dana Desa, peta, data gabungan, laporan bulanan, dan siaran ke desa.
- **Peringkat.** Indeks Desa Digital, sembilan kategori peringkat, lencana juara, dan podium publik.
- **Tagihan.** Langganan manual dengan nominal unik, bukti transfer, verifikasi di Konsol, kwitansi, dan penangguhan desa.
- **Tampilan desa.** Tema galeri, penyusun blok, CSS kustom, dan Blok HTML terkurung. Surat ikut berkembang: jenis surat buatan desa, tata letak surat, dan modul Posyandu.

Pekerjaannya dicatat per tahap (7A-7H) di bawah ini, lalu penutupnya.

### Ditambahkan (7A-1: alamat subdomain)

- **Setiap alamat punya isinya sendiri.**
  - Desa: `sungaisialang.sinfodes.localhost`, dengan website publik di `/`, layanan warga di `/warga`, dan panel di `/admin`.
  - Konsol: `konsol.…`. Halaman induk: `sinfodes.localhost`.
  - Domain induk diatur lewat `VITE_DOMAIN_INDUK`.
- **Aturan alamat desa.**
  - Nama desa saja; bila sudah dipakai, ditambah nama kabupaten, lalu nama kecamatan.
  - Nama terlarang ditolak.
  - Alamat lama v0.1 (`sungai-sialang`) disimpan sebagai alias dan dialihkan.
- **Alamat v0.1 dialihkan otomatis,** termasuk tautan verifikasi dengan `?kode=`.
  - `localhost` polos dialihkan ke alamat induk.
  - `/admin` dan `/warga` di alamat induk menunjukkan bahwa panel kini ada di alamat desa.
- **Sesi terpisah per alamat.**
  - API tiruan menentukan desa dari alamat.
  - Akun desa lain ditolak dengan petunjuk alamat desanya, hanya setelah kata sandinya benar.
  - NIK warga desa lain diperlakukan seperti NIK yang tidak dikenal.
- **Halaman masuk panel satu langkah,** dengan desa ditampilkan dari alamatnya. Halaman masuk warga ikut menampilkan nama desa.
- **Dunia demo bersama:** hub penyimpanan `hub-demo.html` di alamat induk. Perubahan di satu tab ikut tampil di tab alamat lain.
- **Masuk cepat demo lintas alamat** (`?demo=<id akun>`). Toolbar demo mendapat tautan "Halaman demo" dan keterangan bila data terpisah per alamat.
- **QR dan domain di surat** memakai alamat subdomain desa.

### Diubah

- Langkah "kenali email" di halaman masuk panel dihapus, karena desa sudah diketahui dari alamat.

### Ditambahkan (7A-2: landing, batas data Konsol, akses bantuan)

- **Konsol tidak lagi menampilkan isi data desa.** Jumlah penduduk, kelengkapan data, surat, dan angka layanan desa tidak muncul lagi.
  - Pemantauan wilayah ditutup untuk Tim Sinfodes; pemantau masih memakainya sampai dasbor kabupaten tersedia.
  - "Perlu perhatian" kini menghitung desa yang berhenti di langkah persiapan mana pun.
- **Layar Konsol menyesuaikan.**
  - Daftar desa menampilkan kolom Alamat, bukan Kelengkapan.
  - Tab Penggunaan menjadi Keaktifan: terakhir dipakai, akun aktif, penyimpanan berkas, dan grafik masuk per minggu.
  - Menu Pemantauan hanya untuk pemantau.
- **Alamat website di Tambah desa.** Alamat diusulkan otomatis dari nama desa dan langsung diperiksa ("bisa dipakai" atau "sudah dipakai desa lain").
- **Ubah alamat desa** dari Detail desa. Alamat lama tetap mengarah ke desa itu, tidak bisa dipakai desa lain, dan QR pada surat lama tetap berlaku.
- **Isi alamat desa mengikuti statusnya.**
  - Website desa Ditangguhkan tetap tayang, sehingga cek keaslian suratnya tetap jalan.
  - Desa Persiapan menampilkan "Website Desa … sedang disiapkan", dan layanan warganya ditutup dengan pesan.
  - Alamat yang tidak dikenal mendapat tautan ke Cari desa.
- **Cari desa** menurut nama, di halaman utama dan di halaman pindah panel. Hanya desa yang websitenya tayang yang muncul.
- **Halaman utama Sinfodes:**
  - pembuka dengan tombol "Daftarkan desa Anda" lewat WhatsApp;
  - tiga lampiran tangkapan layar (panel desa, layanan warga, website desa);
  - jumlah desa yang sudah memakai Sinfodes, berlabel "Data contoh" di demo;
  - tabel Paket dan harga, Cari desa, Coba demo (isi halaman demo lama), dan halaman Kebijakan privasi.
- **Akses bantuan Sinfodes di Pengaturan,** untuk Sekretaris dan Kepala Desa.
  - Desa memberi Tim Sinfodes izin melihat panel selama 2 jam, 24 jam, atau 3 hari, dengan pilihan menyamarkan NIK dan nomor KK.
  - Akses bisa dicabut kapan saja, dan riwayat mencatat siapa yang membuka dan halaman apa saja.
  - Menu Pengaturan Kepala Desa langsung membuka halaman ini.
- **Mode bantuan lihat saja.**
  - Tim Sinfodes membuka panel desa dari Konsol lewat tiket sekali pakai yang berlaku 60 detik.
  - Semua perubahan ditolak, setiap halaman yang dibuka tercatat, dan pita "Mode bantuan Sinfodes · lihat saja" tampil di atas panel.

### Ditambahkan (7B-1: akun, dasbor, dan portal kabupaten)

- **Kabupaten mitra punya alamatnya sendiri,** mis. `kab-pelalawan.sinfodes.localhost`. Demo memuat dua mitra: Pelalawan dan Siak.
- **Akun kabupaten dengan dua peran.**
  - Admin Kabupaten mengelola pengguna; Peninjau (mis. Kepala Dinas atau Bupati) melihat dan mengunduh tanpa mengubah apa pun.
  - Akun hanya bisa masuk di alamat kabupatennya. Akun kabupaten lain ditolak dengan petunjuk alamatnya, hanya setelah kata sandinya benar.
- **Dasbor kabupaten** di `/admin`, berkerangka sendiri dengan lambang contoh kabupaten.
  - Ringkasan: hal yang perlu perhatian dan adopsi, mis. "25 dari 104 desa di Kabupaten Pelalawan sudah memakai Sinfodes."
  - Pemantauan: angka layanan per kecamatan dan desa di wilayah sendiri saja, tanpa data pribadi warga. Nama desa bertautan ke websitenya, dan tabelnya bisa diunduh sebagai CSV.
- **Pengguna kabupaten:** Admin menambah pengguna, mengganti peran, serta menonaktifkan dan mengaktifkan lagi. Kabupaten selalu menyisakan paling sedikit satu Admin aktif.
- **Portal publik kabupaten** di `/` alamat kabupaten.
  - Desa yang sudah memakai Sinfodes per kecamatan, masing-masing bertautan ke websitenya.
  - Ajakan untuk desa yang belum, dengan tombol "Daftarkan desa Anda".
  - Alamat kabupaten yang belum mitra menampilkan keterangan dan Cari desa.
- **Menu Kabupaten di Konsol.**
  - Daftar kabupaten mitra dengan Admin, jumlah desa bergabung, dan tanggal bergabung.
  - Tambah kabupaten dengan Admin pertama dan surat penunjukan (PDF).
  - Detail kabupaten: surat penunjukan dan akun kabupaten, yang bisa dinonaktifkan Tim Sinfodes.
  - Ringkasan Konsol menyebut jumlah kabupaten mitra.
- **Halaman utama** menampilkan kabupaten mitra, masing-masing bertautan ke portalnya.
- **Coba demo** mendapat baris Dasbor kabupaten: masuk sebagai Admin atau Peninjau Pelalawan, atau Admin Siak, dan tautan ke portal Pelalawan.

### Diubah (7B-1)

- **Konsol hanya untuk Tim Sinfodes.** Peran pemantau dan menu Pemantauan di Konsol dihapus; Pemantauan kini ada di dasbor kabupaten. Alamat lama `/konsol/pemantauan` membuka Ringkasan.
- **Email unik di semua jenis akun.** Email akun desa, Konsol, dan kabupaten tidak bisa dipakai dua kali.
- Skenario demo 3 memakai Peninjau Kabupaten Pelalawan di dasbor kabupaten.

### Ditambahkan (7B-2: Dana Desa, data gabungan, peta, dan laporan kabupaten)

- **Dana Desa di dasbor kabupaten.**
  - Pagu dan realisasi belanja APBDes per kecamatan dan per desa, dalam rupiah dan persen, dengan Unduh CSV.
  - Desa yang realisasinya lebih dari 15 poin di bawah median kabupaten ditandai "Tertinggal" dan muncul di Perlu perhatian di Ringkasan.
- **Tenggat laporan ke kabupaten.**
  - Admin Kabupaten menambah, mengubah, dan menghapus tenggat (nama laporan dan tanggalnya).
  - Detail tenggat menampilkan status setiap desa: belum dikirim, lewat tenggat, sudah dikirim, atau dikirim terlambat, beserta tanggalnya. Tersedia filter status dan Unduh CSV.
  - Peninjau melihat semuanya tanpa bisa mengubah.
- **Pengingat tenggat di panel desa.**
  - Beranda menampilkan tenggat yang tinggal 14 hari atau kurang sampai desa menandainya terkirim.
  - Sekdes, Kades, dan Kaur Keuangan mendapat notifikasi 14, 7, dan 1 hari sebelum tenggat.
  - Halaman Keuangan punya bagian "Laporan ke Kabupaten …". Sekdes, Kades, dan Kaur Keuangan menandai "Sudah dikirim" beserta tanggalnya, dan bisa membatalkannya; kabupaten langsung melihat tandanya.
- **Data gabungan:** penduduk laki-laki dan perempuan, KK, kelompok umur, dan penerima bansos per program, per kecamatan dan per desa.
  - Angka 1-4 tampil sebagai "<5".
  - Angka lain ikut disamarkan dengan "*" bila angka kecilnya bisa dihitung dari jumlah baris atau kolomnya.
  - Angka sudah disamarkan sebelum keluar dari server, dan Unduh CSV memakai angka yang sama.
- **Peta kabupaten.**
  - Dasbor: titik desa dengan lapisan Status bergabung dan Realisasi Dana Desa, kartu desa, dan daftar desa sebagai jalan lain bila peta tidak bisa dipakai.
  - Portal publik: titik desa yang sudah bergabung dan yang sedang bersiap, tanpa angka apa pun, dengan tautan ke website desa.
- **Laporan bulanan** untuk setiap bulan yang sudah tutup sejak kabupaten bergabung.
  - Isinya sampul, ringkasan kabupaten, rincian per kecamatan, desa yang perlu perhatian, Dana Desa, dan lampiran tabel per desa.
  - Tampil sebagai lembar siap cetak; tombol "Cetak atau simpan PDF" membuka dialog cetak peramban.

### Diubah (7B-2)

- Menu dasbor kabupaten: Ringkasan · Pemantauan · Dana Desa · Peta · Data gabungan · Laporan · Pengguna.
- Data demo dibangkitkan ulang otomatis (versi data 22) dengan tenggat Dana Desa contoh.

### Ditambahkan (7B-3: Siaran kabupaten ke desa)

- **Menulis siaran.** Admin Kabupaten mengirim siaran berisi judul, isi teks biasa, dan lampiran PDF opsional (paling besar 5 MB).
  - Siaran bisa ditandai "Perlu tindak lanjut" beserta tenggatnya.
  - Sasarannya semua desa, kecamatan tertentu, atau desa tertentu; yang menerima hanya desa Aktif dan Uji coba pada saat kirim.
  - Sebelum terkirim, dialog menyebut jumlah desa penerima, karena siaran tidak bisa diubah setelah terkirim.
- **Siaran di panel desa.**
  - Kades, Sekdes, dan Operator menerima notifikasi dan melihat halaman "Siaran kabupaten" di menu bawah.
  - Siaran tercatat dibaca begitu dibuka siapa pun di desa itu.
  - Kades atau Sekdes menandai "Sudah ditindaklanjuti" dengan catatan opsional yang dilihat kabupaten.
- **Status per desa di dasbor kabupaten:** belum dibaca, dibaca beserta waktunya, atau ditindaklanjuti beserta catatannya, dengan filter status dan Unduh CSV.
- **Tarik siaran.** Admin bisa menarik siaran yang sudah terkirim; desa lalu hanya melihat keterangan "Ditarik oleh kabupaten" tanpa isinya.
- **Butir Ringkasan:** jumlah desa yang belum membaca siaran 30 hari terakhir, bertautan ke menu Siaran.
- **Landing:** lampiran keempat berisi screenshot dasbor kabupaten.
- **Coba demo:** skenario terpandu "Siaran kabupaten", dari menulis siaran sampai status tindak lanjut.

### Diubah (7B-3)

- Menu dasbor kabupaten: Ringkasan · Pemantauan · Dana Desa · Peta · Data gabungan · Laporan · Siaran · Pengguna.
- Data demo dibangkitkan ulang otomatis (versi data 23) dengan siaran contoh dari Kabupaten Pelalawan dan Siak.

### Ditambahkan (7C-1: Indeks dan peringkat di dasbor kabupaten)

- **Indeks Desa Digital dan sembilan kategori peringkat,** dihitung dari jejak sistem tiap desa.
  - Tujuh kategori berskor: Layanan Tercepat, Paling Responsif, Data Terlengkap, Paling Transparan, Warga Paling Digital, Website Teraktif, dan Serapan Dana Desa. Skor memakai ambang tetap, bukan peringkat relatif.
  - Dua kategori turunan: Paling Meningkat dan Juara Umum (Indeks). Indeks hanya ada bila desa memenuhi syarat di paling sedikit 5 dari 7 kategori.
  - Musim bulanan, triwulan, dan tahunan. Periode yang sudah tutup dibekukan; periode berjalan tampil sebagai klasemen sementara.
  - Tingkatan: Rintisan, Berkembang, Maju, Mandiri Digital. Seri memakai peringkat bersama (1, 1, 3).
- **Menu Indeks & Peringkat** di dasbor kabupaten.
  - Papan per kategori, periode, dan kecamatan; pilihan tinggal di URL, jadi papan bisa dibagikan lewat tautan.
  - Desa yang belum memenuhi syarat beserta alasannya.
  - Bagian se-provinsi: podium kabupaten (Juara Umum dan Paling Merata) dan posisi kabupaten sendiri. Kabupaten di luar podium tidak dikirim.
- **Ringkasan** menampilkan rata-rata Indeks, sebaran tingkatan, dan posisi se-provinsi.
- **Peta** mendapat lapisan Tingkatan Indeks (satu ramp biru, abu-abu untuk belum ber-Indeks), dan kartu desa menampilkan tingkatannya.
- **Laporan bulanan** mendapat bagian Podium untuk sembilan kategori.
- **API tiruan** `GET /kabupaten/indeks`, dengan batas data diuji: kabupaten hanya melihat desanya sendiri, kecamatan di luar wilayah ditolak, dan portal publik tidak memuat Indeks.

### Diubah (7C-1)

- Data demo: 47 desa (tujuh desa fiktif baru di Siak, Kampar, dan Indragiri Hilir), riwayat jejak bulanan sejak Januari dua tahun sebelum tahun acuan, dan versi data 24.
- Jumlah desa resmi kabupaten ditambah: Kampar 242, Bengkalis 136, Indragiri Hilir 197, dan Kuantan Singingi 218.
- Menu dasbor kabupaten: Ringkasan · Indeks & Peringkat · Pemantauan · Dana Desa · Peta · Data gabungan · Laporan · Siaran · Pengguna.

### Ditambahkan (7C-2: peringkat desa, lencana, podium publik)

- **Halaman Peringkat di panel desa.**
  - Menu *Peringkat* di bawah Beranda untuk semua peran, di `/admin/peringkat`.
  - Isinya: Indeks dan tingkatan desa, posisi di kecamatan dan kabupaten untuk sembilan kategori beserta ambang juara 3 (angkanya saja, tanpa nama desa lain), tren enam periode, dan saran naik dari data desa sendiri.
  - Musim dan periode bisa dipilih. Klasemen sementara hanya dilihat desa itu sendiri.
  - Desa yang belum Aktif membaca penjelasan, bukan tabel kosong.
- **Kartu Peringkat di Beranda:** Indeks bulan terakhir tutup, posisi Juara Umum di kabupaten, dan satu saran teratas.
- **Lencana juara.**
  - Terbit otomatis untuk juara 1-3 tingkat kabupaten, dan tingkat kecamatan bila paling sedikit tiga desa memenuhi syarat, untuk bulanan, triwulan, dan tahunan. Seri sama-sama mendapat lencana.
  - Tampil di atas beranda website desa (paling banyak 6, dari periode tutup terakhir).
  - Tab baru *Website Desa → Lencana* untuk menyembunyikan lencana dari website.
  - Setiap lencana punya halaman bukti di `sinfodes.localhost/lencana/{kode}` yang tetap terbuka walau lencana disembunyikan.
- **Podium publik:** tabel *Juara {bulan}* di portal kabupaten (beserta posisi se-provinsi bila masuk podium), dan *Juara bulan ini* di halaman utama Sinfodes.

### Diubah (7C-2)

- Data demo naik ke versi 25 (lencana dan periode yang sudah diproses). Tidak ada aliran acak baru.
- Perhitungan Indeks dipisah menjadi `src/mocks/indeks-hitung.ts` (murni) dan `src/mocks/indeks.ts` (akses data), supaya pembangkit data bisa menerbitkan lencana tanpa impor melingkar.

### Ditambahkan (7D-1: tagihan di panel desa)

- **Model tagihan baru.**
  - Status `Belum dibayar`, `Menunggu verifikasi`, `Lunas`, dan `Dibatalkan`; `Lewat jatuh tempo` dihitung dari tanggal, tidak disimpan.
  - Nominal unik = harga paket + kode 1-999, tidak bentrok di antara tagihan yang masih terbuka.
  - Periode kalender per triwulan atau per tahun (tahunan = 4 x triwulan), nomor `SFD/{tahun}/{T1-T4|TH}/{nomor desa}`, dan riwayat perubahan status yang siap diisi gateway pembayaran.
- **Terbit otomatis.** Tagihan periode berikutnya terbit 14 hari sebelum periode mulai untuk desa Aktif, jatuh tempo 14 hari sesudah periode mulai. Desa Persiapan, Uji coba, dan Ditangguhkan tidak mendapat tagihan baru. Masa aktif mengikuti periode tagihan terakhir.
- **Pengaturan → Langganan** untuk Kepala Desa, Sekretaris Desa, dan Kaur Keuangan.
  - Paket, masa aktif, tagihan berjalan dengan nominal besar, tombol *Salin nominal*, rekening tujuan, dan *Unduh tagihan* (lembar A4 siap cetak atau simpan PDF).
  - Unggah bukti transfer (PNG, JPG, WebP, atau PDF sampai 2 MB) dengan tanggal, nama pengirim, dan nominal. Nominal yang berbeda hanya diberi peringatan.
  - Bukti yang ditolak Tim tampil sebagai banner beserta alasannya. Riwayat tagihan di bawahnya.
- **Pengingat.** Pita tagihan di Beranda mulai H-14 sebelum jatuh tempo (dan keterangan bahwa bukti sedang diperiksa), serta notifikasi pada H-14, H-7, H-1, dan hari jatuh tempo.
- **Konsol:** tab *Langganan* di Detail desa menampilkan tagihan dengan status baru.

### Diubah (7D-1)

- Jatuh tempo tagihan menjadi 14 hari (sebelumnya 30 hari). Tagihan v0.1 yang sudah dibayar menjadi `Lunas`; yang belum dibayar menjadi `Belum dibayar`.
- Menu *Pengaturan* Kepala Desa langsung membuka Langganan (sebelumnya Akses Sinfodes), dan Kaur Keuangan kini punya menu Pengaturan yang membuka Langganan. Tab Pengaturan: Identitas · Wilayah · Pengguna · Penomoran · Langganan · Akses Sinfodes.
- Data demo naik ke versi 26: tagihan dipindah dari `langganan.tagihan` ke `db.tagihan`, ditambah tagihan contoh (dua menunggu verifikasi dengan bukti bergambar "CONTOH", satu dibatalkan beserta penggantinya) tanpa aliran acak baru.
- Rekening tujuan demo (`Bank Contoh Nusantara`) sengaja jelas palsu.

### Ditambahkan (7D-2: tagihan di Konsol, kwitansi, penangguhan)

- **Menu Tagihan di Konsol** untuk Tim Sinfodes.
  - Lima tab dengan angkanya: Menunggu verifikasi (bawaan bila ada isinya), Belum dibayar, Lewat jatuh tempo, Lunas, dan Semua.
  - Cari nominal: mengetik `1.500.127`, `1500127`, atau `Rp 1.500.127` langsung menemukan tagihannya di semua tab; nomor tagihan dan nama desa dicari dalam tab yang aktif. Kata kunci tidak masuk alamat halaman.
  - Detail tagihan: pratinjau bukti beserta data yang diisi desa, *Tandai lunas* (tanggal dan nominal diterima), *Tolak bukti* (alasan wajib, dikirim sebagai notifikasi), *Batalkan tagihan*, dan riwayat. Dua tim yang bertindak bersamaan: yang kedua mendapat pesan dan layar dimuat ulang.
  - Ringkasan Konsol: butir *bukti bayar menunggu verifikasi* bertautan ke tab-nya.
- **Kwitansi** terbit otomatis saat tagihan ditandai lunas (`KW/{tahun}/{urut}`), dengan nominal dan terbilangnya, dari "Tim Sinfodes" tanpa tanda tangan elektronik. Bisa dicetak dari Konsol dan diunduh desa di Pengaturan → Langganan.
- **Ubah status desa** di Detail desa → Langganan: Persiapan → Uji coba (setelah lima langkah persiapan selesai), Uji coba → Aktif (langganan mulai hari ini, tagihan pertama terbit), Aktif ↔ Ditangguhkan. Setiap perubahan butuh alasan dan tercatat di riwayat status. Periode tagihan (triwulan atau tahunan) juga diatur di sana dan berlaku mulai tagihan berikutnya.
- **Desa Ditangguhkan:** panel hanya bisa dilihat, diunduh, dan diekspor, dengan pita *Langganan ditangguhkan, hubungi Sinfodes*. Menu Langganan dan Akses Sinfodes tetap bisa dipakai; website publik dan cek keaslian surat tetap jalan. Pengajuan surat dan pengaduan baru dari warga ditutup dengan pesan; masuk dan melihat riwayat tetap jalan. Desa tidak ikut peringkat selama masa tangguh.
- Skenario terpandu *Tagihan langganan* di halaman Coba demo.

### Diubah (7D-2)

- Semua pemeriksaan hak akses di layar panel kini lewat `useBoleh()` yang memperhitungkan penangguhan, dan semua endpoint tulis desa menolak desa Ditangguhkan dengan 403 (kecuali unggah bukti tagihan dan akses bantuan).
- Menu Konsol: Ringkasan · Desa · Kabupaten · Tagihan.
- Data demo naik ke versi 27: riwayat status untuk dua desa Ditangguhkan.

### Ditambahkan (7E-1: tampilan Dasar website desa)

- **Website Desa › Tampilan › Dasar:** desa mengatur warna utama dan aksen (delapan preset, pemilih warna, atau kode `#RRGGBB`), latar (putih atau kertas), pasangan huruf (Plex, Source, Literata, Fraunces, Bitter, Archivo), sudut (tajam, sedikit melengkung, bulat), kepadatan (lega atau rapat), motif pita, logo, foto sampul, serta foto latar dan kalimat sambutan halaman masuk warga. Pratinjau langsung HP (390 px) dan desktop (1280 px).
- **Pemeriksa kontras** di formulir dan di API: warna utama di atas latar dan teks putih di atas warna utama minimal 4,5 : 1, warna aksen di atas latar minimal 3 : 1. *Pakai versi lebih gelap* menurunkan kecerahan warna (OKLCH) sampai lolos. API menolak tema yang gagal dengan 422 walau layar dilewati.
- **Sebelas motif** pita: tiga lama ditambah itik pulang petang, awan larat, tumpal, mega mendung, truntum, gigi haruan, tampuk manggis, dan sisik ikan. Asal daerah tiap motif tertera di formulir dan di `src/domain/website/motif.ts`.
- **Kontrak tema v1:** variabel `--desa-*` dan nama bagian (`data-bagian`) ditetapkan sebagai satu konstanta (`src/domain/website/kontrak-tema.ts`) sebagai dasar galeri tema, editor susunan, dan CSS kustom di tahap berikutnya. Halaman Cek keaslian ikut tema dan diberi `data-bagian="cek-keaslian"`.
- **Halaman masuk dan layanan warga** memakai warna utama, logo, dan huruf judul desa; halaman masuk juga menampilkan sambutan dan foto latar (panel kiri di layar lebar, pita atas di HP, teks selalu di atas lembar putih).
- **Panel admin:** garis aksen 3 px di tepi atas sidebar dan bilah atas HP, serta favicon lambang desa (atau monogram inisial desa). Warna lain di panel tetap Register.
- Huruf website dimuat sesuai pilihan saja (`@fontsource`, subset latin), tidak ikut JS awal.

### Diubah (7E-1)

- Tampilan website kini disimpan di dokumen `situs` per desa (`GET /website/situs`, `PUT /website/situs/tema`), menggantikan `/website/tampilan`. Bentuk dokumen sudah menyediakan `draf` dan `riwayat` untuk alur draf → terbit di tahap 7F.
- `GET /publik/:slug` membawa `tema` dan `favicon` (menggantikan `aksen`, `motif`, `logo`); `GET /alamat` membawa `tampilanWarga`; sesi panel membawa `tampilanPanel`.
- Data tampilan v0.1 dipindah: aksen lama menjadi warna utama dan aksen. Desa tanpa pengaturan tampil dengan tema Warta bawaan.
- Data demo naik ke versi 28.

### Ditambahkan (7E-2: galeri tema, website desa rekaman, mode gelap)

- **Galeri tema** di awal Website Desa › Tampilan › Dasar: delapan tema (Warta, Balai, Pesisir, Serambi, Ladang, Tenun, Rimba, Bandar) dengan screenshot pratinjau sungguhan, *Lihat pratinjau* (gambar besar), dan *Pakai tema ini*. Memasang tema langsung menyimpannya dan mengganti warna, huruf, sudut, kepadatan, kepala, foto, dan motif; logo, sampul, foto latar, dan sambutan tetap. Formulir yang belum disimpan diperingatkan akan hilang. Semua pengaturan tetap bisa diubah, dan tanda *Dipakai* hilang begitu ada yang berbeda dari tema.
- **Tema berbeda strukturnya:** dua pengaturan baru, bentuk kepala halaman (Warta, Ringkas, Pita) dan perlakuan foto (Bingkai atau Penuh dengan keterangan di atas lapisan gelap tipis). Keduanya juga bisa diatur sendiri di kelompok *Kepala dan foto*.
- **Website minimal desa rekaman:** desa fiktif memakai tema galeri yang dipilih acak secara deterministik (paling sedikit lima tema berbeda), dan Beranda serta Profil desa rekaman menampilkan *Profil singkat* dua paragraf, jam layanan, dan kontak kantor, bukan bagian kabar yang kosong.
- **Mode gelap pribadi** untuk panel desa, dasbor kabupaten, dan Konsol: *Terang*, *Gelap*, atau *Ikuti perangkat* di menu akun, disimpan per perangkat (`localStorage` `sinfodes.mode`). Website publik, layanan warga, dan tampilan cetak tidak pernah gelap; pratinjau website di Tampilan dan lembar surat, laporan, tagihan, serta kwitansi tetap terang di dalam panel gelap. Palet gelap Register diuji kontrasnya (teks, biru, warna di atas warna isi, garis isian, dan status hijau, oker, merah tetap terbedakan).
- **Skenario Coba demo *Ganti tema website*:** Operator memasang tema dari galeri, lalu melihat website Sungai Sialang berubah.
- Halaman katalog tema `/katalog/tema/{id}` (hanya build demo, dibuka di alamat desa) untuk mengambil screenshot pratinjau galeri.

### Diubah (7E-2)

- `temaDasarSchema` mendapat `kepala`, `foto`, dan `idGaleri` (bawaan `warta`, `bingkai`, `null` untuk data lama). `idGaleri` dihitung ulang server dari pengaturan yang disimpan, bukan dipercaya dari klien.
- `GET /publik/:slug/beranda` dan `GET /publik/:slug/profil` membawa `profilSingkat` (null untuk desa yang punya kabar atau profil).
- Overlay dialog dan laci memakai token `--color-tirai`, bukan `bg-tinta/30`, supaya tetap gelap di mode gelap.
- Data demo naik ke versi 29.

### Ditambahkan (7F-1: susunan blok, halaman tambahan, menu website)

- **Beranda dari susunan blok:** website desa kini dirender dari susunan blok terbit. Katalog 16 jenis blok (Sampul, Kabar terbaru, Layanan cepat, Angka desa, APBDes ringkas, Pengumuman & agenda, Galeri, Peta, Potensi, Video, Sambutan Kades, Teks, Ajakan, Kontak & jam layanan, Lencana juara, Pemisah motif) dengan 2-3 varian tiap jenis, plus lebar Penuh/Lebar/Sempit (Lebar lalu Sempit menjadi pasangan berdampingan di layar lebar). Susunan bawaan Warta mereproduksi beranda v0.1, dan delapan tema galeri mempunyai susunan berandanya sendiri yang bisa dipasang bersama temanya.
- **Halaman tambahan** `/halaman/{nama}` (paling banyak 10, 30 blok per halaman) dengan menu website yang bisa diatur urutannya: halaman sistem bisa disembunyikan (kecuali Layanan dan Cek keaslian yang wajib tampil), halaman tambahan bisa dikeluarkan dari menu, dan paling banyak 2 tautan luar yang dibuka di tab baru.
- **Dokumen `situs` draf, terbit, dan riwayat** per desa: `PUT /website/situs/draf`, `DELETE draf`, `POST terbitkan` dengan catatan, `GET riwayat` (20 terbitan terakhir, gambar diganti penanda), dan `POST riwayat/:id/pulihkan` menjadi draf. Website publik hanya membaca versi terbit.
- **API publik blok:** `GET /publik/:slug/beranda` dan `GET /publik/:slug/halaman/:nama` mengembalikan daftar blok yang sudah berisi datanya; blok kosong, tersembunyi, dan Ajakan ke halaman yang sudah dihapus tidak dikirim. `GET /publik/:slug` membawa `menu` yang sudah diselesaikan.
- **Blok Video YouTube** dengan gambar pratinjau `i.ytimg.com` dan tombol *Putar video*; iframe `youtube-nocookie` baru dimuat setelah diklik.
- Nama bagian kontrak tema v1 bertambah: `blok-sampul`, `blok-pengumuman-agenda`, `blok-galeri`, `blok-peta`, `blok-video`, `blok-sambutan`, `blok-teks`, `blok-ajakan`, `blok-kontak`, `blok-lencana`, dan `blok-pemisah`.

### Diubah (7F-1)

- `versiSitusSchema` mendapat `id` (`vrs_{n}`), `susunan`, dan `catatan`; respons `GET /website/situs` kini `{ terbit, draf }`.
- Data demo naik ke versi 30: setiap situs desa memperoleh susunan beranda dari temanya (Warta untuk Sungai Sialang dan Tanjung Lamo).

### Ditambahkan (7F-2: penyunting susunan, draf, riwayat)

- **Sub-tab Susunan di *Website - Tampilan*** dengan penyunting blok: daftar blok (seret-taruh, tombol *Naik*/*Turun*, *Gandakan*, *Sembunyikan*/*Tampilkan*, *Hapus* dengan konfirmasi bila berisi), katalog 16 jenis blok, panel pengaturan (varian, lebar, isian per jenis, galat skema per isian), dan pratinjau HP 390 px/desktop 1280 px yang bisa diklik untuk memilih blok. Blok yang sumber datanya kosong bertanda *Kosong, tidak tampil di website*; pilihan halaman tersimpan di `?halaman=`.
- **Menu website** disusun di sub-tab Susunan: urutan dengan *Naik*/*Turun*, saklar *Tampil* (Layanan dan Cek keaslian wajib ada), halaman tambahan bisa dikeluarkan dan dimasukkan kembali, serta *Tambah tautan luar* (paling banyak 2).
- **Halaman tambahan** ditambah, diubah judul/namanya, dan dihapus dari pemilih halaman; nama diusulkan dari judul, halaman baru berisi satu blok Teks kosong dan langsung masuk menu, dan penghapusan ditolak bila halaman masih menjadi tujuan blok Ajakan.
- **Alur draf untuk seluruh Tampilan:** perubahan Dasar dan Susunan tersimpan otomatis 1 detik kemudian. Bilah draf berisi status simpan, *Terbitkan* (dengan catatan), *Buang draf*, dan *Riwayat*; laci Riwayat memuat 20 terbitan terakhir dengan *Pulihkan* yang menyalinnya menjadi draf; simpanan yang ditimpa tab lain ditolak 409 dengan banner *Muat ulang*.
- `POST /website/situs/pratinjau` mengembalikan blok halaman yang sedang disunting beserta tanda `kosong`; hasilnya sama dengan yang akan tampil di website.
- Dialog pasang tema galeri mendapat kotak centang *Juga pakai susunan beranda tema ini*; hasil pemasangan tema masuk draf, bukan langsung tayang.

### Diubah (7F-2)

- `PUT /website/situs/draf` membutuhkan `dasarId` (ID draf yang dimuat klien, `null` bila mulai dari terbit) dan menolak 409 "Draf diubah di tempat lain" bila draf di server sudah berganti.
- `PUT /website/situs/tema` dihapus; pengaturan Dasar kini mengalir lewat draf dan tayang lewat *Terbitkan*.
- Tombol *Simpan* dan *Batalkan perubahan* di Tampilan Dasar dihapus; galat isian ditampilkan langsung pada isian yang bersangkutan, dan isian yang tidak sah menahan simpanan draf.
- Wadah blok website memperoleh `data-blok`; di pratinjau penyunting, blok tersembunyi digambar redup dan blok kosong menjadi kotak bergaris putus.

### Ditambahkan (7G: tampilan Lanjut)

- **Saklar Tingkat Lanjut** per desa di sub-tab Kode (*Website - Tampilan*) dengan kalimat konfirmasi. Saklar mati menyembunyikan CSS kustom dan Blok HTML dari website publik tanpa menghapus isinya; keadaannya disimpan lewat `PUT /website/situs/lanjut`.
- **CSS kustom terlingkup** (keputusan 1): ditulis operator, diperiksa `css-tree` lebih dulu, lalu ditolak berbaris dengan pesan `Baris {n}: …` bila memuat `@import`, `url()` ke media di luar daftar foto demo, atau aturan yang bisa membuat halaman tidak terbaca. String di dalam `image-set()`, `image()`, `src()`, dan `cross-fade()` diperiksa seperti `url()`; kata `behavior` hanya ditolak sebagai kata sendiri, sehingga `scroll-behavior` dan `overscroll-behavior` tetap sah. Kode yang lolos dibungkus `:where([data-situs-kustom])` dan hanya tayang setelah *Terbitkan*; halaman Cek keaslian tidak memakainya.
- **Blok HTML terkurung** (keputusan 5): katalog blok ke-17 *Blok HTML* menjalankan kode desa di bingkai `srcdoc` bersandbox `allow-scripts` dengan CSP `default-src 'none'` — tanpa kuki, penyimpanan, jaringan, jendela lain, maupun dokumen induk. Tinggi otomatis mengikuti pesan `sinfodes-tinggi` dari bingkai (keputusan 7) atau tetap 40-3000 px; bila kode di dalam bingkai berpindah halaman, `srcdoc` dipasang ulang (keputusan 6). Kode dikelola di penyunting Blok HTML (paling banyak 10 kode, 64 KB per kode) dan tiap blok wajib menunjuk kode yang ada di daftar (keputusan 4).
- **Salin prompt AI**: tombol di sub-tab Kode yang menyalin teks berbahasa Indonesia berisi peran, nilai tema sekarang, nama bagian kontrak, aturan CSS dan batas CSP, format jawaban, dan batas ukuran untuk AI pilihan operator. Sinfodes tidak memanggil AI apa pun.
- **Uji kontrak tema** (`kontrak-tema.test.tsx`): `VERSI_KONTRAK_TEMA` dijaga tetap `kontrak-tema v1`, setiap variabel kontrak dipastikan terpasang di wadah `[data-situs]` dengan nilai tidak kosong, dan setiap nama bagian kontrak dipastikan muncul di halaman beranda, Kabar, atau Cek keaslian.

### Diubah (7G)

- `versiSitusSchema` mendapat `cssKustom`, `cssTerlingkup`, dan `blokHtml`; `GET /website/situs` dan `DELETE /website/situs/draf` kini ikut membawa `lanjut`; `PUT /website/situs/draf` menolak 422 pada isian `cssKustom` dan `blokHtml` untuk kode yang tidak sah.
- Sub-tab *Website - Tampilan* kini Dasar, Susunan, dan Kode.
- Nama bagian kontrak tema v1 bertambah `blok-html`.
- Data demo naik ke versi 31.
- `panggilApi` menerima skema berupa fungsi pemuat (`SumberSkema`); `api/publik.ts` dan `api/website.ts` memuat skema blok, tema, dan situs lewat `import()` saat respons datang, sehingga skema itu keluar dari JS awal (208.775 B menjadi 202.546 B gzip, di bawah 200 KiB).

### Ditambahkan (7H-1: jenis surat buatan desa, modul Posyandu)

- **Jenis surat buatan desa.** Tombol *Tambah jenis surat* di Layanan Surat › Jenis Surat membuka dialog: mulai dari kosong, atau salin dari jenis desa itu (termasuk yang diarsipkan; salinan dalam, jadi mengubah salinan tidak mengubah sumber). Kode 2-5 huruf kapital dan unik di desa, termasuk terhadap jenis arsip. Jenis baru berasal `desa`, belum dilayani, dan editornya langsung terbuka.
- **Hapus, arsipkan, aktifkan lagi.** Hanya jenis buatan desa. Hapus hanya bila belum pernah dipakai permohonan apa pun (selebihnya 409 `Jenis ini sudah pernah dipakai. Arsipkan saja.`, dan layar menawarkan *Arsipkan*). Jenis arsip tidak bisa dipilih untuk surat baru dari loket maupun layanan warga (409 `Jenis surat ini tidak tersedia.`) dan tidak bisa diubah (409), tetapi surat lamanya tetap tampil, permohonan yang sedang berjalan tetap bisa ditandatangani, dan kode verifikasinya tetap sah di Cek keaslian. *Aktifkan lagi* mengosongkan arsip; layanannya tetap mati sampai desa menyalakannya. Jenis bawaan tidak bisa dihapus atau diarsipkan (422).
- **Daftar Jenis Surat**: penyaring *Semua · Aktif · Dihentikan · Diarsipkan* (di URL `?status=`), penanda *Buatan desa*, dan menu *Aksi* per baris. Jenis arsip dibuka sebagai tampilan baca dengan banner dan tombol *Aktifkan lagi*.
- **Pengaturan › Modul** (khusus Sekretaris Desa, kemampuan baru `modul.kelola`): saklar *Kesehatan (Posyandu)*. Dimatikan: menu Kesehatan hilang, `GET /kesehatan/*` menjawab 403 `Modul Kesehatan tidak aktif di desa ini.` (layar yang sedang terbuka menampilkan keterangan, bukan halaman kosong), jadwal posyandu hilang dari Layanan website, Layanan cepat, Beranda warga, dan Beranda Kepala Dusun. Data tidak dihapus. Bawaan: Sungai Sialang dan desa fiktif rekaman menyala; Tanjung Lamo dan desa yang ditambah lewat Konsol mati.
- **Konsol**: tab Keaktifan desa menampilkan *Modul aktif*.

### Diubah (7H-1)

- `JenisSurat` mendapat `asal` (`bawaan` atau `desa`) dan `diarsipkan`; `GET /jenis-surat` menambah `dipakai` per baris dan menerima `?status=`.
- Sesi admin membawa `modul`; `kemampuanEfektif`, `bolehDi`, `useBoleh`, dan menu panel memperhitungkannya.
- Data demo naik ke versi 33.

### Ditambahkan (7H-2: tata letak surat)

- **Pengaturan › Tata letak surat** (Operator dan Sekretaris Desa, sesudah Penomoran): tiga tata letak siap pakai (*Standar tata naskah dinas*, *Kop dua lambang*, *Kop rata tengah*) dengan tanda *Dipakai*, lalu pengaturan per bagian.
  - **Kop**: jumlah dan posisi lambang, 1-5 baris teks dengan sisipan `{kab}`, `{kec}`, `{desa}`, `{alamat}` (markup tampil sebagai teks), dan garis tunggal, ganda, atau tebal-tipis.
  - **Kertas**: A4 atau F4, margin 10-40 mm. **Huruf**: Tinos, Arimo, atau IBM Plex Serif; 11-13 pt; jarak baris 1, 1,15, atau 1,5.
  - **Tanda tangan**: posisi kanan atau tengah, urutan unsur (Naik/Turun; tempat-tanggal, jabatan, dan nama wajib), NIP, dan tempat cap (kotak 3 × 3 cm, tidak tercetak di mode TTE).
  - **QR dan kode verifikasi**: kiri bawah, kanan bawah, atau di bawah tanda tangan. Tidak bisa dimatikan; nomor surat juga selalu tercetak.
  - Pratinjau lembar langsung di sampingnya (jenis SKTM bawaan, bisa diganti) dengan nomor dan kode verifikasi contoh.
- **Pengecualian per jenis.** Editor jenis surat mendapat bagian *Tata letak*: *Ikuti tata letak desa* atau *Tata letak khusus untuk jenis ini* (dimulai dari salinan tata letak desa).
- **Tata letak beku saat terbit.** `terbit.tataLetak`, `terbit.kop` (lambang desa dan kabupaten), dan `terbit.penandatangan.nip` diisi saat tanda tangan; mengganti tata letak, lambang, atau NIP sesudahnya tidak mengubah surat lama (ruang kerja, cetak, dan unduhan warga).
- **Lambang kabupaten** diunggah di Pengaturan › Identitas; tanpa unggahan, kop dua lambang memakai lambang tiruan netral berlabel *Lambang kabupaten*.
- **NIP penanda tangan** (opsional, 18 digit) diatur Sekretaris Desa di Pengaturan › Pengguna (*Atur NIP*, juga untuk akunnya sendiri).
- Endpoint: `GET/PUT /surat/tata-letak`, `PATCH /jenis-surat/:id` menerima `tataLetak`, `PUT /pengaturan/desa` menerima `lambangKabupaten`, `PATCH /pengaturan/pengguna/:id` menerima `nip`. Skema ketat: kunci tambahan, QR yang dimatikan, atau CSS/HTML yang diselipkan ditolak (422).

### Diubah (7H-2)

- `pengaturanSurat.kertas` dan `huruf` pindah ke `pengaturanSurat.tataLetak`; `LembarSurat` menerima `tataLetak` (margin, ukuran huruf, dan jarak baris inline dalam mm dan pt). Tata letak standar menghasilkan kerangka lembar yang sama dengan v0.1.
- `GET /warga/permohonan/:id` tidak lagi mengirim `pengaturan`; lembar unduhan memakai `terbit.tataLetak`.
- `PratinjauLembar` menerima `lebarCm` supaya F4 tidak terpotong.
- Data demo naik ke versi 34.

### Ditambahkan (Penutup v0.2)

- **Skenario terpandu *Akses bantuan Sinfodes*** di Coba demo, yang ketujuh: Sekretaris Desa memberi akses sementara, Tim Sinfodes membuka Detail desa dan masuk dengan data pribadi tersamar, lalu desa melihat halaman yang dibuka di riwayat akses.
- **Uji alur demo v0.2** (`src/mocks/alur-demo-v02.test.ts`): enam alur berurutan pada satu dunia demo tanpa reset antaruji.
  - Alamat dan sesi, kabupaten, peringkat, tagihan, tampilan, dan surat.
  - Alur tagihan berjalan di atas hasil alur siaran, sehingga notifikasi tagihan dan siaran pada pengguna yang sama ikut teruji.
- **`PANDUAN-DEMO.md` ditulis ulang** untuk v0.2: peta alamat subdomain, akun per alamat, toolbar dan dunia demo bersama, data demo, isi aplikasi per bagian, tujuh skenario terpandu, langkah hosting wildcard (`*.demo.sinfodes.com`), dan batasan demo. Akun, skenario, dan jalur di dalamnya dijaga uji (`src/mocks/panduan-demo.test.ts`).

### Diubah (Penutup v0.2)

- Versi paket menjadi `0.2.0`.

## [0.1.0] - 2026-10-16

Demo tahap 1: frontend sungguhan dengan API tiruan (MSW) dan data dummy Desa Sungai Sialang, Kabupaten Pelalawan.

### Ditambahkan

- **Fondasi.**
  - Design system "Register" dan aturan domain: tanggal, uang, NIK, nomor KK, dan nomor surat.
  - Pembangkit data dummy dan API tiruan.
  - Halaman demo dengan reset data, dan katalog komponen.
- **Panel admin desa.**
  - Kerangka dan halaman masuk.
  - Peran: Operator, Sekdes, Kades, Kaur Keuangan, Kadus.
  - Beranda per peran, pencarian cepat (Ctrl+K), dan notifikasi.
- **Kependudukan.**
  - Daftar dan profil penduduk, serta Keluarga (KK).
  - Formulir tambah dan ubah, dan mutasi lahir, meninggal, pindah, dan datang.
  - Statistik, impor Excel, unduh CSV, dan cetak Buku Induk.
- **Layanan Surat.**
  - 12 jenis surat bawaan dan lembar siap cetak (kop, QR, A4/F4).
  - Permohonan dan ruang kerja dengan semua aksi status.
  - Loket buat surat dan tumpukan tanda tangan Kades (juga di HP).
  - Arsip surat keluar dan masuk, Buku Agenda, dan halaman Jenis Surat.
- **Modul lain:** Pengaduan, Bantuan Sosial, Kesehatan (posyandu dan balita), Keuangan (APBDes), Pembangunan, Aset, Lembaga, Peta Desa, Pengaturan, Website Desa, dan Buku Administrasi.
- **Layanan mandiri warga** untuk HP.
  - Masuk dengan NIK dan PIN.
  - Beranda, Riwayat, dan Akun.
  - Ajukan surat 5 langkah, Keluarga saya, dan Pengaduan.
- **Website publik desa** bergaya warta desa.
  - Beranda, Kabar, dan Layanan.
  - Cek keaslian surat lewat QR.
  - Profil, Transparansi, Statistik, Potensi, dan Kredit foto.
- **Konsol Sinfodes.**
  - Ringkasan, Daftar desa, Detail desa, dan Tambah desa.
  - Persiapan desa baru sampai tuntas.
  - Undangan Sekretaris Desa dan Pemantauan wilayah.
- **Skenario terpandu dan tiga alur demo**, diuji otomatis.

[Belum dirilis]: https://github.com/Jazaniest/sinfodes/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Jazaniest/sinfodes/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Jazaniest/sinfodes/releases/tag/v0.1.0
