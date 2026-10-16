# Catatan Perubahan

Semua perubahan penting Sinfodes dicatat di sini. Formatnya mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/), dan penomoran versinya mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [Belum dirilis]

Pekerjaan v0.2.0 (tahap 7A–7H) dicatat di sini selama berjalan di branch `develop`.

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
