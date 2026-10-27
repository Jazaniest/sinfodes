# Panduan Demo Sinfodes v0.2

Sinfodes adalah **Sistem Informasi Desa (SID) multi-desa** berbentuk SaaS. Satu aplikasi melayani banyak desa. Setiap desa punya panel admin, layanan mandiri untuk warga, dan website publik di alamatnya sendiri. Tim Sinfodes bekerja lewat Konsol. Kabupaten mitra punya portal publik dan dasbor.

Versi ini adalah **demo v0.2.0**. Seluruh tampilan (frontend) sudah utuh. Datanya fiktif dan diolah oleh API tiruan di dalam peramban. Tidak ada server. Semua perubahan, misalnya surat yang ditandatangani atau tagihan yang dilunasi, tersimpan di peramban yang dipakai.

---

## Daftar isi

1. [Menjalankan demo](#1-menjalankan-demo)
2. [Peta alamat](#2-peta-alamat)
3. [Akun demo per alamat](#3-akun-demo-per-alamat)
4. [Toolbar demo dan dunia demo bersama](#4-toolbar-demo-dan-dunia-demo-bersama)
5. [Data demo](#5-data-demo)
6. [Isi aplikasi per bagian](#6-isi-aplikasi-per-bagian)
7. [Tujuh skenario terpandu](#7-tujuh-skenario-terpandu)
8. [Hosting demo dengan wildcard](#8-hosting-demo-dengan-wildcard)
9. [Batasan demo](#9-batasan-demo)
10. [Persiapan desa baru](#10-persiapan-desa-baru)
11. [Hak akses per peran](#11-hak-akses-per-peran)
12. [Masalah umum](#12-masalah-umum)
13. [Untuk pengembang](#13-untuk-pengembang)

---

## 1. Menjalankan demo

**Yang dibutuhkan:** Node.js, pnpm, dan salah satu peramban ini dalam versi terbaru: Chrome, Edge, atau Firefox.

1. Pasang dependensi (sekali saja):

   ```bash
   pnpm install
   ```

2. Jalankan server pengembangan:

   ```bash
   pnpm dev
   ```

3. Buka `http://sinfodes.localhost:5173`. Alamat `localhost:5173` yang polos dialihkan ke sana. Halaman pertama adalah halaman utama Sinfodes. Bagian **Coba demo** di halaman itu berisi tombol masuk dan skenario terpandu.

Semua alamat demo berbentuk `*.sinfodes.localhost:5173`. Chrome, Edge, dan Firefox mengarahkan `*.localhost` ke komputer sendiri, jadi berkas hosts tidak perlu diubah. Peramban juga menganggap alamat itu aman, sehingga API tiruan (service worker MSW) tetap jalan.

Berkas `apps/web/.env` berisi `VITE_DEMO=true`, yang menyalakan API tiruan dan toolbar demo. Saat pertama dibuka, data demo dibangkitkan lalu disimpan di peramban.

> **Tips:**
> - Layanan warga dan tampilan tanda tangan Kepala Desa dirancang untuk HP. Kecilkan jendela peramban (lebar ±375 px) atau pakai mode perangkat di DevTools.
> - Alamat `*.sinfodes.localhost` hanya dikenal oleh komputer yang menjalankannya. HP sungguhan baru bisa membuka demo setelah demo dipasang di server dengan wildcard ([bagian 8](#8-hosting-demo-dengan-wildcard)).

---

## 2. Peta alamat

Setiap bagian punya alamat sendiri. Semua bagian milik satu desa ada di bawah satu subdomain, dan dibedakan dengan jalur.

| Alamat | Isi | Untuk |
|---|---|---|
| `sinfodes.localhost:5173` | Halaman utama: pembuka, Cari desa, Paket dan harga, Coba demo, Kebijakan privasi | Publik |
| `sungaisialang.sinfodes.localhost:5173` | Website publik desa (`/`) | Publik |
| `sungaisialang.sinfodes.localhost:5173/warga` | Layanan mandiri warga | Warga |
| `sungaisialang.sinfodes.localhost:5173/admin` | Panel perangkat desa | Perangkat desa |
| `konsol.sinfodes.localhost:5173` | Konsol Sinfodes (Ringkasan di `/`, lalu `/desa`, `/kabupaten`, `/tagihan`) | Tim Sinfodes |
| `kab-pelalawan.sinfodes.localhost:5173` | Portal publik Kabupaten Pelalawan | Publik |
| `kab-pelalawan.sinfodes.localhost:5173/admin` | Dasbor Kabupaten Pelalawan | Admin Kabupaten dan Peninjau |

- **Dua kabupaten mitra:** Pelalawan (`kab-pelalawan`) dan Siak (`kab-siak`).
- **Dua desa dengan panel penuh:** Sungai Sialang (`sungaisialang`) dan Tanjung Lamo (`tanjunglamo`, berstatus Persiapan).
- **Halaman website desa:** `/`, `/profil`, `/kabar`, `/transparansi`, `/statistik`, `/potensi`, `/layanan`, `/verifikasi` (Cek keaslian surat), `/kredit-foto`, dan halaman tambahan buatan desa di `/halaman/<nama>`.
- **Isi alamat desa mengikuti statusnya.**
  - Persiapan: website menampilkan "Website Desa … sedang disiapkan", dan layanan warga ditutup dengan pesan.
  - Uji coba dan Aktif: semuanya jalan.
  - Ditangguhkan: website dan Cek keaslian surat tetap jalan.
- **Alamat yang tidak dikenal** menampilkan tautan ke Cari desa.

### Alamat lama v0.1

Alamat lama tetap bisa dibuka. Demo mengalihkannya ke alamat baru.

- `/desa/<slug>/…` di alamat utama dialihkan ke subdomain desa, dengan query ikut terbawa. Contohnya `sungai-sialang` menjadi `sungaisialang`, termasuk tautan verifikasi dengan `?kode=`.
- `/admin…` dan `/warga…` di alamat utama membuka halaman "Panel desa sekarang ada di alamat desa Anda", lengkap dengan Cari desa.
- `/konsol…` di alamat utama dialihkan ke `konsol.sinfodes.localhost:5173`.

### Sesi terpisah per alamat

Sesi masuk berlaku di satu alamat saja. Masuk di panel Sungai Sialang tidak membuka Konsol maupun dasbor kabupaten, dan sebaliknya. Akun desa lain yang dicoba di alamat ini ditolak dengan petunjuk alamat desanya, tetapi hanya setelah kata sandinya benar.

---

## 3. Akun demo per alamat

Cara tercepat: tombol masuk di bagian **Coba demo** pada halaman utama. Satu klik membuka alamat tujuan dengan akun yang tepat, tanpa mengetik kata sandi. Tombol itu memakai ID akun di alamat, bukan NIK dan bukan kata sandi.

Masuk biasa juga bisa: `/admin/masuk` di alamat desa dan di alamat kabupaten, `/warga/masuk` di alamat desa, dan `/masuk` di alamat Konsol.

### Panel desa: Desa Sungai Sialang

Alamat: `sungaisialang.sinfodes.localhost:5173/admin`. Kata sandi semua akun panel: **`demo`**.

| Nama | Peran | Email |
|---|---|---|
| Rosmiati | Operator | `rosmiati@sungaisialang.desa.id` |
| Hendri Saputra | Sekretaris Desa | `hendri@sungaisialang.desa.id` |
| H. Muhammad Nasir | Kepala Desa | `kades@sungaisialang.desa.id` |
| Nurhayati | Kaur Keuangan | `nurhayati@sungaisialang.desa.id` |
| Sukardi | Kepala Dusun II | `sukardi@sungaisialang.desa.id` |

**Passphrase tanda tangan elektronik (simulasi): `sialang2026`.**

### Panel desa baru: Desa Tanjung Lamo (berstatus Persiapan)

Alamat: `tanjunglamo.sinfodes.localhost:5173/admin`.

| Nama | Peran | Email |
|---|---|---|
| Yusri | Operator | `operator@tanjunglamo.desa.id` |

Akun desa Persiapan yang dibuat selama demo juga muncul sebagai tombol di halaman utama. Contohnya Sekretaris Desa yang diundang dari Konsol, atau admin pertama dari *Tambah desa*.

### Layanan warga

Alamat: `sungaisialang.sinfodes.localhost:5173/warga`. Masuk dengan NIK dan PIN 6 angka.

| Nama | NIK | PIN | Keadaan awal |
|---|---|---|---|
| Siti Rahmah | `1405095203918002` | `246810` | Punya balita, penerima BLT, satu permohonan Domisili sedang diproses |
| Zulkifli | `1405091706848005` | `135790` | Pemilik usaha; Surat Keterangan Usaha-nya sedang dikembalikan Kepala Desa |

### Konsol Sinfodes

Alamat: `konsol.sinfodes.localhost:5173`. Kata sandi: **`demo`**.

| Nama | Peran | Email |
|---|---|---|
| Dina | Tim Sinfodes (semua desa) | `dina@sinfodes.id` |

### Dasbor kabupaten

Kata sandi: **`demo`**. Akun hanya bisa masuk di alamat kabupatennya sendiri.

| Nama | Peran | Alamat | Email |
|---|---|---|---|
| Fajar Ramadhan | Admin Kabupaten Pelalawan | `kab-pelalawan.sinfodes.localhost:5173/admin` | `admin.pelalawan@demo.sinfodes.id` |
| Hj. Rosnani | Peninjau, Kepala Dinas PMD Kabupaten Pelalawan | `kab-pelalawan.sinfodes.localhost:5173/admin` | `pmd.pelalawan@demo.sinfodes.id` |
| Wahyu Saputra | Admin Kabupaten Siak | `kab-siak.sinfodes.localhost:5173/admin` | `admin.siak@demo.sinfodes.id` |

Admin mengelola pengguna dan menulis siaran. Peninjau hanya melihat dan mengunduh. Admin Siak ada untuk menunjukkan batas antarkabupaten: ia tidak pernah melihat data Pelalawan.

---

## 4. Toolbar demo dan dunia demo bersama

Bilah kecil bertanda **DEMO** di pojok bawah tampil di semua alamat.

| Kontrol | Fungsi |
|---|---|
| **Peran** (hanya di panel desa) | Berpindah ke akun lain Desa Sungai Sialang tanpa keluar. Bila yang sedang masuk akun desa lain (mis. Yusri), akun itu tampil apa adanya. |
| **Halaman demo** (di semua alamat selain alamat utama) | Kembali ke daftar akun dan skenario di alamat utama. |
| **Koneksi: Normal / Lambat (3G) / Gagal** | Mensimulasikan jaringan. *Lambat* menunjukkan tampilan memuat. *Gagal* menunjukkan pesan galat dan tombol *Coba lagi*. |
| **Reset data** | Mengembalikan seluruh dunia demo ke kondisi awal, di semua alamat. |
| **×** | Menyembunyikan toolbar, mis. bila menutupi tombol di layar HP. |

### Dunia demo bersama

Peramban menyimpan data terpisah untuk setiap alamat. Padahal alur demo melintasi alamat: bukti transfer yang diunggah desa harus sampai ke Konsol. Karena itu seluruh basis data demo disimpan sekali, di halaman kecil `hub-demo.html` pada alamat utama.

- Setiap alamat memuat halaman itu lewat bingkai tersembunyi, lalu membaca dan menulis datanya.
- Perubahan di satu tab langsung tampil di tab alamat lain.
- Sesi masuk tidak ikut dibagi. Sesi tetap per alamat.
- Batas data tetap ditegakkan di API tiruan. Konsol tidak pernah memuat isi data desa, dan kabupaten hanya melihat desa di wilayahnya.
- Bila hub gagal dimuat dalam 3 detik, aplikasi memakai penyimpanan per alamat. Toolbar lalu menampilkan **Data demo terpisah per alamat**, dan alur lintas alamat tidak akan sampai.

---

## 5. Data demo

- **Desa utama: Sungai Sialang**, Kecamatan Teluk Meranti, Kabupaten Pelalawan, Riau:
  - 2.812 jiwa dalam 806 KK di 4 dusun;
  - 24 bulan riwayat mutasi dan permohonan surat 12 bulan;
  - pengaduan, bansos, posyandu, APBDes, pembangunan, aset, lembaga, isi website, dan lain-lain.
- **Desa Tanjung Lamo** (Kecamatan Kuala Kampar): desa baru berstatus *Persiapan*, datanya masih kosong. Dipakai untuk mencoba [persiapan desa baru](#10-persiapan-desa-baru).
- **Konsol: 47 desa pelanggan.** Selain Sungai Sialang dan Tanjung Lamo, 45 desa adalah **desa contoh**: angkanya rekaman, tanpa data panel sungguhan.
  - Desa contoh punya website minimal dengan tema galeri yang dipilih secara deterministik, supaya tautan dari portal kabupaten tidak buntu.
  - Halaman utama menghitung desa yang bergabung (Aktif dan Uji coba) dengan label *Data contoh*.
- **Dua kabupaten mitra:** Pelalawan dan Siak, masing-masing dengan Admin Kabupaten. Pelalawan juga punya Peninjau.
- **Peringkat:** 33 periode bulanan, dari Januari 2024 sampai September 2026. September 2026 masih berjalan, jadi tampil sebagai klasemen sementara. Triwulan dan tahun yang sudah tutup juga sudah dihitung, dan lencana juaranya sudah terbit.
- **Tagihan contoh** dalam semua status. Dua tagihan menunggu verifikasi, lengkap dengan bukti bergambar "CONTOH". Satu tagihan dibatalkan dan sudah punya penggantinya. Rekening tujuannya sengaja jelas palsu (`Bank Contoh Nusantara`).
- **Contoh lain:** siaran dari Pelalawan dan Siak, riwayat akses bantuan, dan tenggat laporan Dana Desa.
- **Semua nama, NIK, nomor KK, dan nomor telepon fiktif.** Data dibangkitkan dari seed tetap, jadi isinya selalu sama setiap kali di-reset. Kode lencana dan halaman buktinya juga selalu sama.
- **Penyimpanan:** data disimpan di peramban (IndexedDB), di hub alamat utama. Menutup tab tidak menghapusnya. *Reset data* atau berganti peramban memulai dari awal. Bila versi data naik, data lama di perangkat diganti otomatis.

---

## 6. Isi aplikasi per bagian

### 6.1 Panel desa (`/admin`)

Panel kerja perangkat desa. Menu yang tampil menyesuaikan peran: menu yang tidak berhak dibuka disembunyikan, bukan dinonaktifkan. Angka di samping menu menunjukkan hal yang perlu ditindaklanjuti peran itu.

**Beranda** berbeda per peran.

| Peran | Isi Beranda |
|---|---|
| **Operator** | *Perlu ditindaklanjuti* (permohonan menunggu, pengaduan belum dibalas, laporan warga, data belum lengkap), *Buku hari ini*, keadaan desa dalam kalimat, realisasi APBDes, dan agenda |
| **Sekretaris Desa** | Sama dengan Operator, ditambah *Perlu paraf Anda* di paling atas |
| **Kepala Desa** | *Menunggu tanda tangan Anda* dengan tombol *Mulai tanda tangani*, keadaan desa, realisasi APBDes per bidang, pengaduan terbaru, dan pembangunan berjalan |
| **Kaur Keuangan** | Realisasi pendapatan dan belanja, serta progres keuangan kegiatan |
| **Kepala Dusun** | Pengaduan, laporan, keadaan, dan posyandu dusunnya |
| **Desa berstatus Persiapan** | Daftar lima langkah persiapan ([bagian 10](#10-persiapan-desa-baru)) |

Beranda juga memuat hal yang baru di v0.2:
- kartu *Peringkat* (Indeks bulan terakhir tutup, posisi Juara Umum di kabupaten, dan satu saran teratas);
- pita *Tagihan* mulai 14 hari sebelum jatuh tempo;
- tenggat laporan ke kabupaten yang tinggal 14 hari atau kurang.

**Pencarian cepat (Ctrl+K).** Tekan **Ctrl+K** (Cmd+K di Mac), atau klik kotak cari di sidebar. Yang bisa dicari: penduduk (nama atau NIK), keluarga (nomor KK), surat (nomor), permohonan (nama pemohon), dan aksi seperti *Buat surat*, *Tambah penduduk*, atau *Catat kelahiran*.

**Pelayanan**
- **Layanan Surat** terdiri dari tab Permohonan, Arsip, dan Jenis Surat.
  - **Permohonan:** antrean surat per status. Ruang kerja satu surat memuat aksi Proses, Tolak, Ajukan tanda tangan, Paraf, Kembalikan, Tanda tangan (dengan passphrase), Batalkan, Cetak/PDF, Kirim WA, dan Tandai diambil, serta pratinjau lembar surat.
  - **Buat surat:** surat loket dalam 4 langkah dengan pratinjau langsung.
  - **Tanda tangan** (`/admin/surat/tanda-tangan`): tumpukan surat Kepala Desa yang nyaman di HP.
  - **Arsip:** surat keluar, surat masuk, dan Buku Agenda.
  - **Jenis Surat:** 12 jenis bawaan dengan saklar *Aktif* dan *Layanan online*. Desa juga bisa **menambah jenis surat sendiri** (dari kosong atau salinan), menghapusnya selama belum pernah dipakai, dan mengarsipkannya. Surat lama dari jenis yang diarsipkan tetap tampil, dan kode verifikasinya tetap sah.
- **Pengaduan:** kotak masuk dan percakapan dengan warga.
- **Siaran kabupaten:** siaran dari kabupaten untuk Operator, Sekretaris Desa, dan Kepala Desa. Siaran tercatat dibaca begitu dibuka. Kepala Desa atau Sekretaris Desa menandainya *Sudah ditindaklanjuti* dengan catatan.

**Data desa:** Kependudukan (Penduduk, Keluarga, Mutasi, Statistik), Bantuan Sosial, Kesehatan (posyandu, bisa dimatikan di *Pengaturan › Modul*), dan Peta Desa.

**Tata kelola:** Keuangan (APBDes, sinkron Siskeudes tiruan, dan *Laporan ke Kabupaten* untuk menandai laporan terkirim), Pembangunan, Aset Desa, Lembaga Desa, Buku Administrasi, dan **Peringkat** (`/admin/peringkat`).

**Website Desa:** Artikel, Pengumuman, Agenda, Galeri, Tampilan, dan Lencana. Isi Tampilan ada di [bagian 6.3](#63-website-publik-desa).

**Pengaturan.** Tab-nya Identitas · Wilayah · Pengguna · Penomoran · Tata letak surat · Modul · Langganan · Akses Sinfodes. Tidak semua peran melihat semuanya.
- **Identitas:** alamat, kontak, jam layanan, lambang desa, dan lambang kabupaten, dengan pratinjau kop.
- **Wilayah:** istilah wilayah dan nama kepala dusun serta ketua RW/RT.
- **Pengguna:** undang, ganti peran, nonaktifkan, dan **Atur NIP** penanda tangan. Hanya Sekretaris Desa.
- **Penomoran:** format nomor surat.
- **Tata letak surat** (Operator dan Sekretaris Desa): tiga tata letak siap pakai (*Standar tata naskah dinas*, *Kop dua lambang*, *Kop rata tengah*), lalu pengaturan kop, kertas (A4 atau F4, margin 10-40 mm), huruf, blok tanda tangan, dan posisi QR. Pratinjau lembar tampil di sampingnya. QR, kode verifikasi, dan nomor surat selalu tercetak. Satu jenis surat boleh punya tata letak khusus di editor jenisnya. **Surat yang sudah terbit tidak berubah** bila tata letak, lambang, atau NIP diganti sesudahnya.
- **Modul** (Sekretaris Desa): saklar Kesehatan (Posyandu).
- **Langganan** (Kepala Desa, Sekretaris Desa, Kaur Keuangan): paket, masa aktif, tagihan berjalan beserta nominal uniknya, rekening tujuan, unggah bukti transfer, dan unduh kwitansi.
- **Akses Sinfodes** (Kepala Desa dan Sekretaris Desa): memberi Tim Sinfodes izin lihat saja selama 2 jam, 24 jam, atau 3 hari, dengan pilihan menyamarkan NIK dan nomor KK. Akses bisa dicabut kapan saja, dan riwayat mencatat siapa yang masuk dan halaman apa yang dibuka.

**Notifikasi:** permohonan baru, surat ditandatangani atau dikembalikan, pengaduan baru, siaran kabupaten, tenggat laporan, dan tagihan.

**Mode gelap.** Menu akun punya pilihan *Terang*, *Gelap*, atau *Ikuti perangkat*, disimpan per perangkat. Mode ini berlaku di panel desa, dasbor kabupaten, dan Konsol. Website publik, layanan warga, dan tampilan cetak tidak pernah gelap.

**Desa Ditangguhkan.** Panel hanya bisa dilihat, diunduh, dan diekspor, dengan pita *Langganan ditangguhkan, hubungi Sinfodes*. Menu Langganan dan Akses Sinfodes tetap bisa dipakai. Pengajuan surat dan pengaduan baru dari warga ditutup dengan pesan.

### 6.2 Layanan mandiri warga (`/warga`)

Dirancang untuk HP (±360 px). Masuk dengan **NIK + PIN**. Salah PIN berkali-kali mengunci sementara, dan ada tautan *Lupa PIN*. Halaman masuk memakai warna utama, logo, huruf judul, sambutan, dan foto latar dari tema desa.

| Menu | Isi |
|---|---|
| **Beranda** | Permohonan yang sedang berjalan, pintasan, dan pengumuman desa |
| **Ajukan** | Mengajukan surat dalam 5 langkah: pilih jenis, isian, unggah foto syarat (foto dikecilkan otomatis), periksa, kirim. Draf tersimpan, dan ada *Kirim ulang* bila koneksi putus |
| **Riwayat** | Status setiap permohonan. Surat yang sudah selesai bisa dibuka dan diunduh sebagai PDF, dengan tata letak saat surat terbit |
| **Keluarga** | Anggota KK; *Laporkan perubahan data* atau kelahiran ke kantor desa |
| **Pengaduan** | Menyampaikan pengaduan dan membalas percakapan dengan perangkat desa |
| **Akun** | Data akun dan keluar |

Sesi warga terpisah dari sesi panel, jadi keduanya bisa terbuka bersamaan di satu peramban.

### 6.3 Website publik desa

Website desa untuk umum, tanpa perlu masuk. Alamatnya `sungaisialang.sinfodes.localhost:5173`.

| Halaman | Isi |
|---|---|
| **Beranda** | Disusun dari blok terbit: kabar, layanan, angka desa, APBDes, galeri, lencana juara, dan lain-lain |
| **Kabar** | Daftar artikel per kategori beserta halaman artikel |
| **Layanan** | Jenis surat yang dilayani, syarat, dan perkiraan waktu |
| **Profil** | Sejarah, visi-misi, geografi, peta, dan struktur pemerintahan |
| **Transparansi** | APBDes dan pembangunan, siap cetak |
| **Statistik** | Statistik penduduk agregat, tanpa data pribadi |
| **Potensi** | Potensi desa dan UMKM warga |
| **Cek keaslian surat** (`/verifikasi`) | Masukkan kode surat atau pindai QR di lembar surat |
| **Kredit foto** | Sumber foto yang dipakai |
| **Halaman tambahan** (`/halaman/<nama>`) | Paling banyak 10 halaman buatan desa |

**Website Desa › Tampilan** punya tiga sub-tab, dan perubahannya masuk draf lebih dulu. Website baru berubah setelah **Terbitkan**.
- **Dasar:** galeri delapan tema (Warta, Balai, Pesisir, Serambi, Ladang, Tenun, Rimba, Bandar) dengan tombol *Pakai tema ini*, lalu warna utama dan aksen, latar, pasangan huruf, sudut, kepadatan, bentuk kepala halaman, perlakuan foto, motif pita, logo, dan foto sampul. Pemeriksa kontras menolak warna yang sulit dibaca. Pratinjau HP dan desktop tampil langsung.
- **Susunan:** penyusun blok untuk Beranda dan halaman tambahan (seret-taruh, gandakan, sembunyikan), menu website, dan pratinjau yang bisa diklik. Draf tersimpan otomatis. *Riwayat* memuat 20 terbitan terakhir dan bisa dipulihkan menjadi draf.
- **Kode** (tingkat Lanjut): saklar tingkat Lanjut, CSS kustom terlingkup, Blok HTML terkurung, dan tombol *Salin prompt AI*. CSS yang memuat `@import` atau `url()` ke luar ditolak dengan pesan berbaris. Saklar yang dimatikan menyembunyikan CSS dan Blok HTML dari website tanpa menghapus isinya.

**Website Desa › Lencana** menyembunyikan lencana juara dari website. Halaman bukti setiap lencana tetap terbuka.

### 6.4 Konsol Sinfodes (`konsol.sinfodes.localhost:5173`)

Untuk Tim Sinfodes. Menu: Ringkasan · Desa · Kabupaten · Tagihan. **Konsol tidak menampilkan isi data desa**: jumlah penduduk, surat, pengaduan, dan NIK tidak pernah muncul di sini.

| Layar | Isi |
|---|---|
| **Ringkasan** | *Perlu perhatian* (desa tidak aktif, desa berhenti di langkah persiapan, tagihan lewat jatuh tempo, bukti bayar menunggu verifikasi), jumlah kabupaten mitra, dan angka platform dalam kalimat |
| **Desa** | Daftar 47 desa dengan kolom alamat, filter provinsi, kabupaten, status, dan paket |
| **Detail desa** | Empat tab: **Ringkasan** (identitas, kontak, dan alamat yang bisa diubah), **Persiapan** (lima langkah; bisa *Undang Sekretaris Desa*), **Keaktifan** (terakhir dipakai, akun aktif, modul aktif, penyimpanan berkas, dan **Akses bantuan**), dan **Langganan** (tagihan, periode tagihan, dan **Ubah status desa**) |
| **Tambah desa** | Nama, wilayah bertingkat, paket, alamat website (diusulkan dan langsung diperiksa), dan email admin pertama. Admin pertama berperan Sekretaris Desa |
| **Kabupaten** | Daftar kabupaten mitra, tambah kabupaten dengan Admin pertama dan surat penunjukan, dan detail beserta akun kabupaten |
| **Tagihan** | Lima tab (Menunggu verifikasi, Belum dibayar, Lewat jatuh tempo, Lunas, Semua), cari nominal, periksa bukti, *Tandai lunas*, *Tolak bukti*, *Batalkan tagihan*, dan kwitansi |

- **Akses bantuan.** Tombol *Buka panel desa (lihat saja)* hanya ada bila desa memberi izin. Panel terbuka lewat tiket sekali pakai yang berlaku 60 detik. Semua perubahan ditolak, dan pita *Mode bantuan Sinfodes · lihat saja* tampil di atas panel.
- **Ubah status desa:** Persiapan menjadi Uji coba (setelah lima langkah selesai), Uji coba menjadi Aktif, dan Aktif atau Ditangguhkan bergantian. Setiap perubahan butuh alasan dan tercatat.

### 6.5 Kabupaten

**Portal publik** (`kab-pelalawan.sinfodes.localhost:5173`): desa yang sudah memakai Sinfodes per kecamatan dengan tautan ke websitenya, tabel *Juara {bulan}*, peta titik desa, dan ajakan "Daftarkan desa Anda" untuk desa yang belum. Portal tidak memuat angka layanan, Indeks, atau skor.

**Dasbor** (`/admin` di alamat kabupaten). Menu: Ringkasan · Indeks & Peringkat · Pemantauan · Dana Desa · Peta · Data gabungan · Laporan · Siaran · Pengguna.
- **Ringkasan:** hal yang perlu perhatian, adopsi desa, rata-rata Indeks, dan posisi se-provinsi.
- **Indeks & Peringkat:** sembilan kategori, tiga musim (bulanan, triwulan, tahunan), filter kecamatan, dan desa yang belum memenuhi syarat beserta alasannya. Pilihan tinggal di URL, jadi papan bisa dibagikan.
- **Pemantauan:** angka layanan per kecamatan dan desa di wilayah sendiri saja, tanpa data pribadi warga.
- **Dana Desa:** pagu dan realisasi, desa yang tertinggal, dan tenggat laporan beserta status tiap desa.
- **Peta, Data gabungan, Laporan:** titik desa dengan lapisan, tabel agregat dengan angka kecil disamarkan (`<5` dan `*`), dan laporan bulanan siap cetak.
- **Siaran:** menulis siaran (judul, isi, lampiran PDF, dan tindak lanjut opsional), status per desa, dan tarik siaran.
- **Pengguna:** hanya Admin. Kabupaten selalu menyisakan paling sedikit satu Admin aktif.

### 6.6 Halaman utama (`sinfodes.localhost:5173`)

Pembuka dengan tombol "Daftarkan desa Anda" lewat WhatsApp, empat lampiran tangkapan layar (panel desa, layanan warga, website desa, dasbor kabupaten), jumlah desa yang bergabung (berlabel *Data contoh*), kabupaten mitra yang bertautan ke portalnya, *Juara bulan ini*, tabel Paket dan harga, **Cari desa**, **Coba demo**, dan Kebijakan privasi. Cari desa hanya menampilkan desa yang websitenya tayang.

---

## 7. Tujuh skenario terpandu

Ketujuh skenario ada sebagai tombol langkah demi langkah di bagian **Coba demo** pada halaman utama. Setiap tombol membuka alamat tujuan dengan akun yang tepat. Skenario berurutan boleh dijalankan dalam satu dunia demo. Klik **Reset data** di toolbar bila hasilnya tidak seperti yang dijelaskan di sini.

### 1. SKTM dari HP sampai verifikasi QR

1. **Siti Rahmah** (layanan warga, tampilan HP) mengajukan *Surat Keterangan Tidak Mampu* di `/warga/ajukan`.
2. **Rosmiati** (Operator) memproses permohonan itu di `/admin/surat`, lalu *Ajukan tanda tangan*.
3. **Hendri Saputra** (Sekretaris Desa) membuka daftar *Perlu TTD* di `/admin/surat?status=perlu-ttd` dan memaraf surat itu.
4. **H. Muhammad Nasir** (Kepala Desa) membuka `/admin/surat/tanda-tangan` dalam tampilan HP, lalu menandatangani dengan passphrase `sialang2026`.
5. **Siti Rahmah** melihat status *Selesai* di `/warga/riwayat` dan membuka suratnya.
6. Di website desa, `/verifikasi` menerima kode surat itu (atau pindai QR-nya), dan suratnya dinyatakan asli.

### 2. Mencatat kelahiran

1. **Rosmiati** mencatat kelahiran anak Siti Rahmah di `/admin/kependudukan/mutasi/lahir`.
2. KK Syahrial bertambah satu anggota di `/admin/kependudukan/keluarga/kk_syahrial`, dan bayinya berstatus **BELUM ADA NIK**.
3. Statistik (`/admin/kependudukan/statistik`), Buku Mutasi (`/admin/buku/mutasi-penduduk`), *Buku hari ini* di Beranda (`/admin`), dan halaman `/statistik` di website ikut berubah.

### 3. Pemantauan kabupaten

1. **Hj. Rosnani** (Peninjau Kabupaten Pelalawan) membuka `/admin/pemantauan` di dasbor kabupaten, lalu Kecamatan Teluk Meranti.
2. Bandingkan angka Sungai Sialang dengan panel desanya: kelengkapan data dengan preset *Data belum lengkap* di `/admin/kependudukan/penduduk?preset=data-belum-lengkap`, dan realisasi APBDes di `/admin/keuangan`. Angkanya sama.

### 4. Siaran kabupaten

1. **Fajar Ramadhan** (Admin Kabupaten Pelalawan) menulis siaran ke Kecamatan Teluk Meranti di `/admin/siaran/tulis`, dengan tindak lanjut.
2. **H. Muhammad Nasir** membuka siaran itu dari notifikasi di `/admin/siaran`, lalu menandainya sudah ditindaklanjuti dengan catatan.
3. Fajar Ramadhan melihat Sungai Sialang dibaca dan ditindaklanjuti di `/admin/siaran` dasbor kabupaten. Siaran juga bisa ditarik. Admin Siak tidak melihat siaran ini.

### 5. Tagihan langganan

1. **Nurhayati** (Kaur Keuangan) membuka `/admin/pengaturan/langganan`, menyalin nominal unik tagihan, lalu mengunggah bukti transfer.
2. **Dina** (Tim Sinfodes) mencari nominalnya di `/tagihan` Konsol, memeriksa bukti, lalu menandai lunas.
3. Nurhayati kembali ke `/admin/pengaturan/langganan`: tagihan Lunas dan kwitansinya bisa diunduh. Notifikasi *Pembayaran diterima* ikut muncul. Kabupaten tidak melihat tagihan sama sekali.

### 6. Ganti tema website

1. **Rosmiati** membuka `/admin/website/tampilan` dan memasang tema dari galeri. Tema masuk draf, dan website belum berubah.
2. Setelah **Terbitkan**, website Sungai Sialang di `/` berubah.

### 7. Akses bantuan Sinfodes

1. **Hendri Saputra** (Sekretaris Desa) memberi akses sementara di `/admin/pengaturan/akses-sinfodes`, dengan pilihan *Sembunyikan data pribadi warga* tetap menyala (bawaannya menyala).
2. **Dina** membuka Detail desa Sungai Sialang di `/desa/desa_sungai_sialang` Konsol, tab *Keaktifan*, lalu menekan *Buka panel desa (lihat saja)*. Panel terbuka dengan pita mode bantuan, NIK tersamar, dan semua perubahan ditolak.
3. Hendri Saputra kembali ke `/admin/pengaturan/akses-sinfodes` dan melihat halaman yang dibuka Tim Sinfodes di riwayat akses. Ia juga bisa mencabut akses.

---

## 8. Hosting demo dengan wildcard

Demo v0.2 memakai satu subdomain per desa, jadi server biasa tidak cukup. Demo v0.1.0 di cabang `main` tidak berubah sampai v0.2.0 dirilis.

**Kebutuhan**
- DNS wildcard: `*.demo.sinfodes.com` ditambah `demo.sinfodes.com`, keduanya ke server yang sama.
- Sertifikat TLS wildcard, misalnya dari Let's Encrypt lewat tantangan DNS-01. Sertifikat harus mencakup `demo.sinfodes.com` dan `*.demo.sinfodes.com`. Wildcard hanya mencakup satu tingkat, itu sebabnya semua bagian desa memakai satu subdomain dan dibedakan dengan jalur.
- Server statis yang menyajikan `index.html` untuk semua host dan jalur yang tidak dikenal.

**Langkah**
1. Buat DNS wildcard dan sertifikatnya.
2. Bangun aplikasi dengan dua variabel lingkungan:
   - `VITE_DEMO=true` menyalakan API tiruan dan toolbar demo;
   - `VITE_DOMAIN_INDUK=demo.sinfodes.com` menjadikan alamat `sungaisialang.demo.sinfodes.com`, `konsol.demo.sinfodes.com`, dan seterusnya. Tanpa variabel ini bawaannya `sinfodes.localhost`.

   ```bash
   pnpm build
   ```

3. Salin isi `apps/web/dist/` ke server. Berkas `mockServiceWorker.js` dan `hub-demo.html` harus ikut dan dilayani apa adanya.
4. Atur server supaya host `demo.sinfodes.com` dan `*.demo.sinfodes.com` menyajikan isi `apps/web/dist/` yang sudah disalin, dengan cadangan `index.html`. Contoh untuk Nginx:

   ```nginx
   server {
     listen 443 ssl;
     server_name demo.sinfodes.com *.demo.sinfodes.com;
     ssl_certificate     /etc/letsencrypt/live/demo.sinfodes.com/fullchain.pem;
     ssl_certificate_key /etc/letsencrypt/live/demo.sinfodes.com/privkey.pem;
     root /var/www/sinfodes/dist;
     location / { try_files $uri /index.html; }
   }
   ```

**Pemeriksaan setelah pasang**
1. `https://demo.sinfodes.com` menampilkan halaman utama dengan bagian Coba demo.
2. `https://sungaisialang.demo.sinfodes.com` menampilkan website desa, dan `/admin` membuka halaman masuk panel.
3. Jalankan skenario *Tagihan langganan* sampai langkah 2. Bukti transfer yang diunggah di alamat desa harus muncul di `https://konsol.demo.sinfodes.com/tagihan`. Ini membuktikan dunia demo bersama bekerja. Bila toolbar menampilkan **Data demo terpisah per alamat**, hub belum termuat.
4. `https://kab-pelalawan.demo.sinfodes.com` menampilkan portal kabupaten.
5. Alamat desa lain yang tidak ada, misalnya `https://tidakada.demo.sinfodes.com`, menampilkan tautan ke Cari desa, bukan galat server.
6. Sertifikat dikenali peramban di semua alamat itu tanpa peringatan.

---

## 9. Batasan demo

- **Data dan API tiruan.** Tidak ada server. Semua permintaan dijawab oleh API tiruan (MSW) di peramban, dan data hanya ada di peramban itu. Data tidak berpindah antarperangkat.
- **Unggahan.** Berkas yang diunggah umumnya hanya dicatat nama dan ukurannya. Yang disimpan sebagai gambar adalah bukti transfer tagihan, logo, lambang, dan sampul website.
- **Tanda tangan elektronik disimulasikan.** Passphrase demo tidak terhubung ke BSrE atau penyedia TTE mana pun, dan lembar surat diberi tanda simulasi.
- **Pembayaran tagihan manual.** Transfer tidak sungguhan. Kwitansi terbit dari "Tim Sinfodes" tanpa tanda tangan elektronik.
- **Undangan pengguna tiruan.** Tidak ada email yang terkirim. Akun undangan langsung aktif dengan kata sandi `demo`.
- **Kirim WA dan sinkron Siskeudes tiruan.**
- **Impor Excel memakai berkas contoh.** API tiruan tidak membaca isi berkas yang diunggah.
- **Desa contoh Konsol** (selain Sungai Sialang dan Tanjung Lamo) hanya berisi angka rekaman, tanpa data panel sungguhan.
- **Blok HTML dan navigasi bingkai.** Kode Blok HTML berjalan di bingkai terkurung tanpa kuki, penyimpanan, atau jaringan. Bila kode di dalam bingkai berpindah halaman, bingkai dipasang ulang ke kode semula. Halaman Cek keaslian tidak memakai CSS kustom.
- **Kode lencana tetap.** Kode lencana dibangkitkan dari seed, jadi tautan bukti lencana tidak berubah setelah *Reset data*.
- **Cetak dan PDF memakai dialog cetak peramban.**

---

## 10. Persiapan desa baru

Desa berstatus *Persiapan* menampilkan **lima langkah persiapan** di Beranda, lengkap dengan progresnya. Tim Sinfodes melihat progres yang sama di tab *Persiapan* pada Detail desa.

| Langkah | Tempat | Selesai bila |
|---|---|---|
| 1. Isi identitas dan kop surat | *Pengaturan › Identitas* | Alamat, kode pos, surel, telepon, dan jam layanan terisi |
| 2. Atur wilayah (dusun/RW/RT) | *Pengaturan › Wilayah* (tambah dusun, RW, RT) | Desa punya minimal satu dusun |
| 3. Impor data penduduk dari Excel | *Kependudukan › Penduduk › Impor* (*Coba dengan file contoh*) | Desa punya penduduk |
| 4. Tambah pengguna | *Pengaturan › Pengguna* (Sekretaris Desa) | Desa punya lebih dari satu akun |
| 5. Pilih jenis surat yang dilayani | *Layanan Surat › Jenis Surat* (nyalakan saklar *Aktif*) | Minimal satu jenis surat aktif |

### Mencoba dengan Tanjung Lamo

1. Masuk sebagai **Yusri** di `tanjunglamo.sinfodes.localhost:5173/admin`. Beranda menunjukkan 0 dari 5.
2. Kerjakan langkah 1, 2, 3, dan 5. Impor baru bisa dilakukan sesudah dusun dibuat. Sesudah impor, susunan dusun, RW, dan RT terkunci. Namanya tetap bisa diubah.
3. Langkah 4 hanya bisa dikerjakan Sekretaris Desa, dan Tanjung Lamo belum punya. Masuk Konsol sebagai **Dina**, buka *Desa › Tanjung Lamo › Persiapan*, lalu **Undang Sekretaris Desa**. Di demo, akunnya langsung aktif dengan kata sandi `demo`.
4. Beranda menjadi 5 dari 5: *Semua langkah selesai*. Akun Sekretaris Desa yang baru juga muncul sebagai tombol di halaman utama.
5. Dina lalu bisa memakai **Ubah status desa** di *Detail desa › Langganan* untuk memindahkan Tanjung Lamo dari Persiapan ke Uji coba.

### Mencoba dengan desa baru dari Konsol

1. Sebagai **Dina**, buka *Desa › Tambah desa*, isi formulirnya (alamat website diusulkan dan langsung diperiksa), lalu simpan.
2. Admin pertama (Sekretaris Desa) muncul di halaman utama sebagai "Admin desa · Sekretaris Desa …". Masuk dengan akun itu. Kelima langkah bisa dikerjakan sendiri.

---

## 11. Hak akses per peran

| Kemampuan | Operator | Sekdes | Kades | Kaur Keuangan | Kadus |
|---|---|---|---|---|---|
| Beranda, Peta, Lembaga, Pembangunan, Peringkat, Notifikasi | ✓ | ✓ | ✓ | ✓ | ✓ |
| Layanan Surat: memproses | ✓ | ✓ | lihat | - | lihat (dusunnya) |
| Layanan Surat: paraf | - | ✓ | - | - | - |
| Layanan Surat: tanda tangan | - | a.n. (bila jenis surat mengizinkan) | ✓ | - | - |
| Pengaduan: menanggapi | ✓ | ✓ | lihat | - | ✓ (dusunnya) |
| Kependudukan: ubah dan catat mutasi | ✓ | ✓ | lihat | - | lihat (dusunnya) |
| Bansos, Kesehatan: lihat (Kesehatan bila modulnya menyala) | ✓ | ✓ | ✓ | - | ✓ (dusunnya) |
| Keuangan: lihat / sinkron Siskeudes | lihat | lihat | lihat | ✓ | - |
| Laporan ke kabupaten: tandai terkirim | - | ✓ | ✓ | ✓ | - |
| Aset, Buku Administrasi: lihat dan unduh | ✓ | ✓ | ✓ | ✓ (buku keuangan) | - |
| Siaran kabupaten: membaca | ✓ | ✓ | ✓ | - | - |
| Siaran kabupaten: menandai tindak lanjut | - | ✓ | ✓ | - | - |
| Website Desa: kelola (termasuk Tampilan) | ✓ | ✓ | - | - | - |
| Pengaturan: identitas, wilayah, penomoran, tata letak surat | ✓ | ✓ | - | - | - |
| Pengaturan: pengguna dan NIP, modul | - | ✓ | - | - | - |
| Pengaturan: Langganan, lihat dan unggah bukti | - | ✓ | ✓ | ✓ | - |
| Pengaturan: Akses Sinfodes | - | ✓ | ✓ | - | - |

"Dusunnya" berarti data otomatis dibatasi ke dusun milik Kepala Dusun tersebut. Untuk Sukardi, itu Dusun II. Menu *Pengaturan* Kepala Desa langsung membuka Langganan, dan menu Kaur Keuangan juga membuka Langganan.

---

## 12. Masalah umum

| Gejala | Penyebab dan cara mengatasi |
|---|---|
| Data terlihat aneh atau tidak sesuai panduan | Klik **Reset data** di toolbar demo |
| Muncul pesan galat di semua halaman | Cek pilihan **Koneksi** di toolbar. Mungkin masih *Gagal*. Kembalikan ke *Normal* |
| Semua terasa lambat | Pilihan **Koneksi** mungkin masih *Lambat (3G)* |
| Toolbar demo menutupi tombol di layar HP | Klik **×** di toolbar untuk menyembunyikannya |
| Diarahkan ke halaman masuk | Sesi belum ada atau sudah keluar. Sesi berlaku per alamat, jadi masuk lewat tombol di bagian Coba demo |
| Akun ditolak dengan petunjuk alamat lain | Akun desa atau kabupaten hanya bisa masuk di alamatnya sendiri. Ikuti petunjuk alamat yang muncul |
| Toolbar menampilkan "Data demo terpisah per alamat" | Hub data demo belum termuat, jadi alur lintas alamat tidak akan sampai. Muat ulang halaman. Bila tetap begitu, pakai peramban Chrome, Edge, atau Firefox terbaru |
| Alamat `*.sinfodes.localhost` tidak terbuka | Pakai Chrome, Edge, atau Firefox terbaru. Alamat ini hanya dikenal oleh komputer yang menjalankan demo |
| Menu yang dicari tidak ada | Menu disembunyikan sesuai peran. Ganti peran lewat toolbar, mis. *Pengaturan › Pengguna* hanya untuk Sekretaris Desa |
| Toolbar dan API tiruan tidak muncul | Pastikan `apps/web/.env` berisi `VITE_DEMO=true`, lalu jalankan ulang `pnpm dev` |

---

## 13. Untuk pengembang

| Perintah | Fungsi |
|---|---|
| `pnpm dev` | Server pengembangan dengan API tiruan |
| `pnpm test` | Seluruh uji (Vitest, sekitar 2.900 uji) |
| `pnpm typecheck` | Pemeriksaan tipe TypeScript |
| `pnpm lint` | ESLint |
| `pnpm build` | Build produksi. Dengan `VITE_DEMO=false`, API tiruan dan toolbar demo tidak ikut, dan aplikasi memanggil API sungguhan di `VITE_API_BASE` (bawaan `/api/v1`) |

- **Stack:** Vite, React 19, TypeScript (strict), Tailwind CSS v4, TanStack Router dan Query, React Aria Components, Zod 4, MSW 2, dan Vitest.
- **Spesifikasi:** `SPEC-DESAIN-FE.md` untuk dasar (kontrak API di §3.4) dan `SPEC-V0.2.md` untuk v0.2. Bila keduanya bertentangan, `SPEC-V0.2.md` yang berlaku.
- **Variabel lingkungan:** `VITE_DEMO`, `VITE_DOMAIN_INDUK` (bawaan `sinfodes.localhost`), dan `VITE_API_BASE`, diatur di `apps/web/.env`.
- **Susunan repositori:** monorepo pnpm. Perintah di atas dijalankan dari akar repositori dan diteruskan ke `apps/web`. Skrip di `apps/web/scripts/` dijalankan dari folder `apps/web`.
- **Struktur kode:**
  - `packages/kontrak/src/`: aturan bisnis dan skema (di web diimpor sebagai `@/domain/...`);
  - `packages/demo/src/`: pembangkit dan data demo (di web diimpor sebagai `@sinfodes/demo/...`);
  - `apps/web/src/api/`: pemanggil API;
  - `apps/web/src/features/`: layar;
  - `apps/web/src/ui/`: komponen dasar;
  - `apps/web/src/mocks/`: API tiruan (penangan, basis data di peramban);
  - `apps/web/src/routes/`: rute.
- **Anggaran JavaScript awal:** paling besar 200 KiB (gzip), diukur dari berkas JS yang dirujuk `index.html`.
- **Riwayat perubahan:** `CHANGELOG.md`.
