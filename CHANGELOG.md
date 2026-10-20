# Catatan Perubahan

Semua perubahan penting Sinfodes dicatat di sini. Formatnya mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/), dan penomoran versinya mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [Belum dirilis]

Pekerjaan v0.2.0 (tahap 7A-7H) dicatat di sini selama berjalan di branch `develop`.

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

[Belum dirilis]: https://github.com/Jazaniest/sinfodes/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Jazaniest/sinfodes/releases/tag/v0.1.0
