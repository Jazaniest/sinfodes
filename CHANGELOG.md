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
