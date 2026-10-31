# Sinfodes API

Server API Sinfodes: Hono, PostgreSQL, dan Drizzle. Sampai tahap 8E3 server memuat identitas empat pelaku, akses bantuan Tim Sinfodes, serta kependudukan (penduduk, keluarga, wilayah, mutasi, laporan data, impor, buku, statistik, cari) yang menjawab kontrak yang sama dengan API tiruan di `apps/web`:

| Rute | Isi |
| --- | --- |
| `GET /api/v1/alamat` | Apa yang ada di alamat ini: desa, alias lama, induk, atau Konsol |
| `POST /api/v1/sesi/masuk` | Masuk panel desa; sesi dibawa cookie `__Host-panel` |
| `GET /api/v1/sesi` | Sesi yang sedang berjalan |
| `POST /api/v1/sesi/keluar` | Keluar; sesi dicabut |
| `GET /api/v1/penduduk`, `POST /api/v1/penduduk/cari`, `GET /api/v1/penduduk/ringkasan` | Daftar, pencarian, dan angka kepala halaman Penduduk |
| `GET /api/v1/penduduk/:id`, `GET /api/v1/penduduk/:id/riwayat` | Detail penduduk (NIK dan telepon dibuka dari sandi) dan tab Riwayat |
| `POST /api/v1/penduduk`, `PATCH /api/v1/penduduk/:id`, `POST /api/v1/penduduk/cek-nik` | Tambah (ke KK yang ada atau KK baru), ubah (tiap perubahan field tercatat), dan cek NIK; hanya Operator dan Sekretaris Desa |
| `POST /api/v1/penduduk/ekspor` | Seluruh baris tersaring untuk CSV atau Buku Induk; tercatat di Buku hari ini dan jejak audit |
| `GET /api/v1/keluarga`, `POST /api/v1/keluarga/cari`, `GET /api/v1/keluarga/:id` | Daftar KK, pencarian nomor KK atau nama kepala, dan detail KK beserta anggota |
| `POST /api/v1/keluarga/:id/ganti-kepala`, `POST /api/v1/keluarga/:id/pecah` | Ganti kepala keluarga dan pecah KK (nomor KK baru) |
| `GET /api/v1/mutasi`, `GET /api/v1/mutasi/ringkasan` | Buku Mutasi (per bulan dan jenis, terbaru dulu) dan angka per jenis pada satu bulan; Kepala Dusun hanya dusunnya |
| `POST /api/v1/mutasi/lahir`, `/meninggal`, `/pindah`, `/datang` | Catat kelahiran, kematian, kepindahan, kedatangan; hanya Operator dan Sekretaris Desa. Header `Idempotency-Key` (opsional): pengiriman ulang mengembalikan hasil pertama (`Idempotency-Replayed: true`) |
| `GET /api/v1/laporan-data`, `GET /api/v1/laporan-data/:id`, `POST /api/v1/laporan-data/:id/terapkan`, `POST /api/v1/laporan-data/:id/tolak` | Laporan data dari warga: daftar, detail, terapkan perbaikan, tolak (alasan opsional) |
| `POST /api/v1/impor/penduduk`, `POST /api/v1/impor/penduduk/:id/konfirmasi` | Impor penduduk dari `.xlsx` atau `.csv`: unggah (multipart `berkas`, atau `{ "contoh": true }` untuk berkas contoh) lalu konfirmasi dengan pemetaan kolom; hanya Operator dan Sekretaris Desa |
| `GET /api/v1/buku-administrasi`, `GET /api/v1/buku-administrasi/:kode` | Daftar buku dan isi satu halaman; lima buku penduduk dan Buku Agenda (surat keluar dan masuk) tersedia, sembilan buku lain menunggu tahap 8G |
| `GET /api/v1/statistik/penduduk` | Angka agregat penduduk Hidup (`?dusun=` nomor dusun; Kepala Dusun selalu dusunnya) |
| `POST /api/v1/cari` | Pencarian cepat penduduk, KK, dan surat (kata di badan, bukan URL) |
| `GET/PUT /api/v1/pengaturan/wilayah` | Istilah wilayah dan susunan dusun, RW, RT (terbuka selama desa belum punya penduduk) |
| `GET /api/v1/jenis-surat` (`?status=aktif\|dihentikan\|diarsipkan`), `GET /api/v1/jenis-surat/:id` | Katalog jenis surat desa dan satu jenis beserta pratinjau (pemohon contoh tanpa NIK); butuh hak melihat Layanan Surat |
| `POST /api/v1/jenis-surat`, `PATCH`/`DELETE /api/v1/jenis-surat/:id`, `POST /api/v1/jenis-surat/:id/arsipkan`, `/aktifkan-lagi` | Tambah (kosong atau salinan), sunting, hapus (hanya jenis buatan desa), arsipkan, dan aktifkan lagi; hanya Operator dan Sekretaris Desa. Jenis bawaan tidak bisa dihapus atau diarsipkan |
| `GET /api/v1/permohonan` (`?status=&periode=&jenis=&page=&pageSize=`), `GET /permohonan/jumlah`, `GET /permohonan/antrian-ttd`, `GET /permohonan/penduduk/:id`, `GET /permohonan/:id`, `GET /permohonan/saran` | Daftar satu tab status, angka tab dan "perlu tindakan", tumpukan tanda tangan, surat per penduduk, detail lengkap, dan isian awal dari mutasi; butuh hak melihat Layanan Surat (antrean: hak menandatangani; saran: hak membuat surat) |
| `POST /api/v1/permohonan/cari`, `POST /api/v1/permohonan`, `PATCH /api/v1/permohonan/:id` | Cari nama, NIK, atau nomor surat; buat dari loket (draf atau ajukan); sunting isian dan catatan internal. Membuat dan menyunting hanya Operator dan Sekretaris Desa |
| `POST /api/v1/permohonan/:id/proses`, `/tolak`, `/ajukan-ttd`, `/paraf`, `/kembalikan` | Aksi status. Tanda tangan, batal, tandai diambil, dan kirim WhatsApp ada di bagian "Tanda tangan dan verifikasi surat" |
| `GET /api/v1/permohonan/:id/lampiran/:lampiranId` | Membuka foto syarat yang diunggah warga (gambar tampil, PDF diunduh); butuh hak melihat Layanan Surat, Kepala Dusun hanya dusunnya, sesi bantuan Tim Sinfodes ditolak |
| `GET /api/v1/surat-keluar` (`?bulan=&jenis=&penandatangan=&page=&pageSize=`, `?semua=1`), `GET /api/v1/surat-masuk` (`?bulan=`) | Arsip surat keluar (permohonan yang pernah terbit, termasuk yang dibatalkan, bulan menurut WIB) dan register surat masuk |
| `POST /api/v1/surat-masuk`, `GET /api/v1/surat-masuk/:id/scan` | Catat surat masuk (multipart, pindaian PDF, JPG, atau PNG paling besar 5 MB; hanya Operator dan Sekretaris Desa) dan buka pindaiannya (sesi bantuan ditolak) |
| `GET/PUT /api/v1/surat/tata-letak`, `GET/PUT /api/v1/pengaturan/penomoran` | Tata letak surat desa (`siap` dihitung server) dan format nomor, urutan, serta kode surat desa; hanya yang berhak mengelola Pengaturan desa |
| `POST /api/v1/warga/masuk`, `/warga/lupa-pin`, `GET /warga/sesi`, `PATCH /warga/akun`, `POST /warga/sesi/keluar` | Layanan warga: NIK dan PIN di alamat desa, cookie `__Host-warga` |
| `GET /api/v1/warga/jenis-surat`, `/warga/keluarga`, `/warga/permohonan`, `/warga/permohonan/:id` | Layanan warga (tahap 8F3): jenis yang bisa diajukan beserta perkiraan lama proses, keluarga saya, riwayat dan detail permohonan milik warga |
| `POST /api/v1/warga/permohonan` | Pengajuan surat dari HP: multipart `data` (JSON) dan foto `lampiran` berurutan; 201 untuk pengajuan baru, 200 untuk kirim ulang dengan `kunci` yang sama |
| `POST /api/v1/kabupaten/sesi/masuk`, `GET /kabupaten/sesi`, `POST /kabupaten/sesi/keluar` | Dasbor kabupaten di alamat `kab-...`, cookie `__Host-kab` |
| `POST /api/v1/konsol/sesi/masuk`, `GET /konsol/sesi`, `POST /konsol/sesi/keluar` | Konsol di alamat `konsol`, dengan kode TOTP, cookie `__Host-konsol` |
| `GET/POST/DELETE /api/v1/pengaturan/akses-sinfodes` | Desa memberi, melihat, dan mencabut akses bantuan Tim Sinfodes (Sekretaris dan Kepala Desa) |
| `POST /api/v1/konsol/desa/:id/tiket-bantuan`, `POST /api/v1/sesi/bantuan` | Konsol menerbitkan tiket sekali pakai (60 detik); tiket ditukar di alamat desa menjadi sesi bantuan lihat-saja |

Rute lain belum ada dan menjawab `NOT_FOUND`. Rancangan lengkapnya ada di `SPEC-V0.3.md` (akar repositori).

## Menyalakan

Butuh PostgreSQL 15 atau lebih baru (disarankan 17), mis. dari Laragon, yang sedang menyala.

1. Buat `apps/api/.env.local` berisi satu baris, lalu ganti kata sandi dan port sesuai server Anda:

   ```
   PG_SUPERUSER_URL=postgres://postgres:KATA_SANDI_ANDA@localhost:5432/postgres
   ```

2. Siapkan basis data, lima peran, dan kunci enkripsi (sekali saja; aman diulang):

   ```bash
   pnpm --filter @sinfodes/api db:siapkan
   ```

   Skrip menambahkan sisa pengaturan (alamat basis data tiap peran, kunci) ke `.env.local` tanpa mencetak nilainya.

3. Terapkan migrasi dan isi dengan dunia demo:

   ```bash
   pnpm --filter @sinfodes/api db:migrasi
   ```

   ```bash
   pnpm --filter @sinfodes/api db:semai
   ```

   Menyemai ulang basis yang sudah berisi (mis. sesudah migrasi baru menambah tabel yang diisi dunia demo) harus memakai `--acuan` yang sama dengan semai pertama, yaitu waktu `desa.dibuat`: `pnpm --filter @sinfodes/api db:semai -- --acuan=<waktu ISO>`. Acuan lain membangkitkan dunia demo yang berbeda dan semai berhenti di kunci asing.

4. Nyalakan server di `http://127.0.0.1:3001`, lalu frontend mode nyata:

   ```bash
   pnpm dev:api
   ```

   ```bash
   pnpm dev:nyata
   ```

   Masuk di `http://sungaisialang.sinfodes.localhost:5173/admin/masuk` dengan akun demo mana pun (kata sandi `demo`), mis. `rosmiati@sungaisialang.desa.id`.

## Akun Tim Sinfodes (Konsol)

Akun Konsol pertama tidak punya pendaftaran sendiri. Pemilik membuatnya di terminalnya sendiri:

```bash
pnpm --filter @sinfodes/api db:akun-tim --email=orang@contoh.id --nama="Nama Lengkap"
```

Kata sandi acak dan kunci TOTP dicetak **sekali** di layar itu. Di aplikasi autentikator (Google Authenticator, Microsoft Authenticator, Aegis, dan sejenisnya) pilih memasukkan kunci setelan secara manual, jenis berbasis waktu, lalu ketik kuncinya. Masuk di `http://konsol.sinfodes.localhost:5173` dengan email, kata sandi, dan kode enam angka.

Bila akun Konsol (atau akun lain) terkunci karena orang lain sengaja salah memasukkan kata sandi, buka kuncinya dari terminal Anda: `pnpm --filter @sinfodes/api db:buka-kunci --jenis=konsol` (pilihan: `konsol`, `kabupaten`, `warga`, `panel`, `semua`).

Aturan TOTP: akun yang sudah didaftarkan TOTP-nya selalu wajib kode. Di `staging` dan `produksi` akun tanpa TOTP ditolak; di `pengembangan` dan `uji` akun semai (tanpa TOTP) boleh masuk dengan kata sandi saja.

`db:semai` menolak lingkungan `staging` dan `produksi` kecuali diberi `--izinkan-lingkungan-nyata`, karena akun demo berkata sandi bersama.

## Akses bantuan Tim Sinfodes

Desa memegang kuncinya: Sekretaris atau Kepala Desa memberi akses (2 jam, 24 jam, atau 3 hari) dari Pengaturan, Akses Sinfodes, dan bisa mencabutnya kapan saja. Dari Konsol, Tim mengambil tiket (`POST /konsol/desa/:id/tiket-bantuan`) lalu membuka `http://<desa>.sinfodes.localhost/admin/bantuan?tiket=...`; tiket sekali pakai, berumur 60 detik, dan ditukar menjadi sesi bantuan di cookie panel (menganggur 30 menit, batas mutlak 8 jam, mati seketika bila akses dicabut atau habis).

Aturannya satu lapisan (`src/lapisan/bantuan.ts`), bukan per rute:

- semua metode selain GET dan HEAD ditolak sebelum rute dipilih; hanya keluar, masuk panel, tukar tiket, dan jalur pencarian-baca (`JALUR_CARI_BACA`) yang lolos;
- setiap halaman dicatat di `jejak_bantuan` (hanya tambah) sebelum jawabannya dikirim;
- bila "sembunyikan data pribadi" menyala: setiap string 16 angka di jawaban JSON disamarkan (`1405••••••••8002`), pencarian yang memuat lima angka berurutan ditolak, dan jawaban bukan-JSON ditolak.

Modul baru yang punya pencarian lewat POST wajib menambahkan jalurnya ke `JALUR_CARI_BACA` setelah memastikan ia tidak mengubah data; jalur lain otomatis tertolak. Layar Konsol untuk mengambil tiket baru dibangun di 8J; sampai itu tiket diambil lewat konsol peramban (lihat arahan pengujian tahap 8D2).

Daftar pencarian-baca kini `/penduduk/cari` dan `/keluarga/cari`. `POST /penduduk/cek-nik` dan `POST /penduduk/ekspor` sengaja tidak termasuk: yang pertama membuka keberadaan NIK, yang kedua mengeluarkan data pribadi massal. NIK yang tercatat berkelompok di Riwayat (`140509 520391 8002`) ikut disamarkan.

## Impor berkas

- Format: `.xlsx` (lembar pertama) dan `.csv` (pemisah koma, titik koma, atau tab; UTF-8 atau Windows-1252). Kepala kolom dikenali dari nama dan sinonim lazim (mis. `Tgl. Lahir`, `SHDK`, `No. KK`).
- Batas: 10 MB, 10.000 baris, 40 kolom, 500 karakter per sel. Lebih dari 10 MB (11 MB pada badan permintaan) ditolak lapisan HTTP; rute lain tetap dibatasi 1 MB.
- Rumus Excel tidak dievaluasi. Kolom NIK dan nomor KK harus berformat **Teks** di Excel: angka 16 digit yang disimpan sebagai angka sudah terpotong oleh Excel dan berkas ditolak.
- Berkas contoh untuk pengujian: `apps/api/test/contoh/impor-3-baris.csv` dan `.xlsx` (dibuat oleh `skrip/buat-contoh-impor.ts`).
- Jalur `{ "contoh": true }` (tombol "Coba dengan file contoh") memasukkan penduduk fiktif; penutupannya untuk produksi menunggu 8K.

## Tanda tangan dan verifikasi surat

Rute (tahap 8F2b):

- `GET` dan `PUT /api/v1/sesi/passphrase-tanda-tangan`: status passphrase penanda tangan dan penetapannya (kata sandi akun diminta ulang). Hanya peran yang boleh menandatangani.
- `POST /api/v1/permohonan/:id/tandatangani|batalkan|tandai-diambil|kirim-wa`: empat aksi surat terbit, dengan urutan pemeriksaan dan pesan yang sama dengan API tiruan.
- `POST /api/v1/publik/:slug/verifikasi`: verifikasi kode surat tanpa sesi. Berjalan di transaksi peran `sinfodes_publik`, hanya di alamat desa, dan `:slug` harus slug desa alamat itu.

Menetapkan passphrase di basis data dev: masuk sebagai Kepala Desa atau Sekretaris Desa, buka dialog **Tanda tangani** pada surat di tahap tanda tangan; formulir "Tetapkan passphrase" muncul bila belum diatur. Tidak ada passphrase bawaan di server (passphrase demo hanya ada di mode demo web).

Aturan yang harus dipegang kode baru:

- **Urutan kunci tetap, tidak boleh dibalik**: (1) baris permohonan `FOR UPDATE`, (2) kunci penasihat pengguna untuk percobaan passphrase, (3) kunci penasihat nomor surat per desa dan tahun. Kunci nomor urut permohonan (`permohonan-nourut`) tidak dipegang bersama ketiganya.
- **`GalatDisimpan`** (`src/galat.ts`) menjawab 4xx tanpa membatalkan transaksi permintaan, supaya hitungan percobaan dan jejak audit tersimpan. Lempar hanya sebelum ada tulis domain apa pun selain pencatat itu; `lapisanTransaksi` tetap membatalkan untuk galat biasa dan status 5xx.
- **Pemicu `permohonan_beku`** (migrasi `0013`) menjaga surat terbit: berlaku untuk semua peran termasuk pemilik skema. Pemeliharaan harus eksplisit lewat `ALTER TABLE permohonan DISABLE TRIGGER permohonan_beku`, bukan kebetulan hak.
- **Peran `sinfodes_publik`** tidak punya hak tabel apa pun; ia hanya boleh `EXECUTE verifikasi_surat(desa, kode, waktu)`, fungsi `SECURITY DEFINER` yang mencari kode dan mengelola pencacah percobaan salah di tabel `percobaan_verifikasi`. Ambang (10 kode salah dalam 10 menit mengunci 10 menit per desa) sama dengan `BATAS_VERIFIKASI` di kontrak; uji meta membandingkannya.
- Colokan `Penandatangan` dan `Pengirim` disuntik lewat `DepsApp` (simulator bawaan): tanda tangan simulator berawalan `sim1.` dan belum tersertifikasi; pengirim WhatsApp tidak mengirim apa pun. Kode verifikasi memakai `crypto.randomInt`, bukan `Math.random`.

## Layanan warga, arsip, dan berkas

Rute dan batasnya ada di tabel di atas. Hal yang harus dipegang kode baru (rencana 8F3, ruling lengkap di `RENCANA-08F3-LAYANAN-WARGA-ARSIP-AGENDA.md`):

- **Penyimpanan berkas.** Foto syarat warga dan pindaian surat masuk disimpan sebagai sandi biner (AES-256-GCM, `Penyandi.sandikanBita`, id baris ikut diautentikasi) di kolom `bytea` tabel `berkas_surat`, yang hanya bisa ditambah (peran desa tanpa UPDATE dan DELETE). `simpanBerkas` dan `bacaBerkas` (`src/berkas/layanan.ts`) adalah satu-satunya tempat yang menyentuh isi, jadi pindah ke disk atau S3 kelak hanya mengganti dua fungsi itu. Batas: foto 2 MB, pindaian 5 MB.
- **Isi diperiksa di server.** Tipe ditentukan dari byte (bukan `Content-Type` atau ekstensi kiriman), berkas terpotong atau berekor ditolak, PDF yang memuat penanda aktif (`/JavaScript`, `/JS`, `/Launch`, `/EmbeddedFile`, `/OpenAction`, termasuk yang disamarkan dengan escape `#XX`) ditolak, dan metadata gambar dibuang (EXIF, XMP, APP13, komentar JPEG; semua chunk PNG di luar daftar putih; EXIF dan XMP WebP). Ini penjaga lapis, bukan pemindai virus (v0.4): PDF yang menyembunyikan penanda di aliran terkompresi tetap lolos, karena itu PDF hanya disajikan sebagai unduhan.
- **Penyajian.** `jawabBerkas` memakai tipe hasil periksa, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; img-src 'self'; sandbox; frame-ancestors 'none'` (menggantikan CSP global yang terlalu ketat untuk gambar), gambar `inline` dan PDF `attachment`. Header global menyetel CSP hanya bila rute belum menyetelnya.
- **Sesi bantuan Tim Sinfodes tidak bisa membuka berkas** walau hanya membaca: foto KTP atau KK memuat NIK sebagai piksel. Berkas dari data contoh (disemai) hanya punya nama dan ukuran, jadi membukanya menjawab 404 "Berkas tidak tersimpan."
- **Pengajuan warga.** Satu inti `sisipkanPermohonanBaru` dipakai loket dan warga (satu antrean nomor urut). Kunci kirim dari HP (`kunci` di `data`) memakai `denganIdempotensi` dengan rujukan permohonan; sidiknya hanya atas `data`, bukan byte foto. Satu warga paling banyak punya `MAKS_PENGAJUAN_MENUNGGU` (5) pengajuan Menunggu, dihitung dan disisipkan di bawah kunci penasihat `ajukan-warga:<desa>:<penduduk>`.
- **Urutan kunci pembuatan permohonan:** kunci kirim, jenis (`FOR SHARE`), `ajukan-warga`, `permohonan-nourut`. Urutan kunci tanda tangan (baris permohonan, pengguna, nomor terbit) tidak berubah. Nomor agenda surat masuk memakai `surat-masuk-agenda:<desa>:<tahun>` dan tidak dipegang bersama kunci lain.
- **Risiko yang diterima sampai 8K.** Transaksi permintaan dibuka sebelum badan dibaca, jadi unggahan (sampai 21 MB untuk pengajuan, 6 MB untuk surat masuk) menahan satu koneksi basis data selama berjalan dan badannya ditampung di memori. Batas laju unggahan dan batas badan di proksi menyusul di 8K; penyimpan disk atau S3 serta pembersihan berkas surat tertutup di 8H atau 8K.
- **Belum ada di server nyata:** Beranda warga, laporan data warga, pengaduan warga, dan unduhan PDF surat oleh warga (8G dan 8H); menu Ajukan dan Riwayat dibuka lewat alamat langsung.

## Uji

```bash
pnpm --filter @sinfodes/api test
```

- Sekali per jalan, basis data cetakan dibangun (migrasi lalu semai); setiap berkas uji mengkloningnya, jadi uji tidak saling memengaruhi.
- Tanpa PostgreSQL, uji murni tetap jalan dan uji basis data **gagal** dengan pesan yang jelas (bukan terlewat).
- `test/meta/` memeriksa pagar keamanan basis data: RLS (tanpa konteks nol baris, antardesa terisolasi, konteks tidak tersisa di kolam), hak per peran, penggolongan tabel, dan indeks.
- `test/konformansi/` menjalankan modul `api/*` milik web terhadap server ini dan membandingkan jawabannya dengan perilaku API tiruan. Perbedaan yang disengaja ditandai komentar `Perbedaan sengaja:`.

## Susunan singkat

- `src/lapisan/`: urutan setiap permintaan (alamat dari Host, CSRF, transaksi per permintaan, sesi dari cookie, hak akses).
- `src/basisdata/`: skema Drizzle, empat kolam koneksi (satu login per peran), pelari migrasi.
- `src/kripto/`: enkripsi NIK, nomor KK, dan telepon (AES-256-GCM, kunci data dibungkus kunci utama), indeks HMAC, argon2id, token sesi.
- `migrasi/`: SQL tulisan tangan, hanya maju.
- `skrip/`: `db:siapkan`, `db:migrasi`, `db:semai`.

## Keamanan yang sudah berlaku

- Data desa dibatasi dua lapis: kode aplikasi dan RLS PostgreSQL (`ENABLE` dan `FORCE`, konteks desa disetel lokal pada transaksi).
- NIK, nomor KK, dan telepon tidak pernah tersimpan polos. Pencarian persis memakai indeks HMAC; pencarian sebagian dilakukan di aplikasi setelah dibuka.
- Masuk (panel, warga, kabupaten, Konsol) menjawab sama persis untuk akun tak dikenal, kata sandi atau PIN salah, akun nonaktif, akun milik alamat lain, dan kode TOTP salah; selalu ada satu verifikasi argon2.
- Percobaan gagal dihitung di PostgreSQL per akun (NIK atau email): 5 kegagalan mengunci 15 menit, lalu berlipat sampai 24 jam, dan bertahan saat server dimulai ulang. Di atasnya ada batas laju per IP di memori.
- Tiap pelaku punya cookie, tabel sesi, dan masa berlaku sendiri; cookie satu pelaku tidak pernah diterima pelaku atau alamat lain.
- Sesi bantuan Tim Sinfodes hanya melihat, setiap halamannya tercatat di jejak yang tak bisa dihapus, dan NIK serta nomor KK disamarkan bila desa meminta. Konsol tidak pernah membaca data desa: hak barunya hanya membaca status akses dan menambah tiket.
- Nilai NIK dan telepon di Riwayat perubahan penduduk dan di isi laporan perbaikan warga disandikan seperti kolom aslinya, dan CHECK di basis data menolak nilai polos.
- Tabel `kunci_idempotensi` menyimpan hanya sidik isi dan rujukan mutasi, bukan salinan jawaban, jadi NIK pendatang tidak tersalin ke sana.
- Isi berkas impor yang menunggu konfirmasi (`impor_penduduk`) disimpan sebagai satu sandi, berlaku 24 jam, dikosongkan sesudah selesai; NIK dan telepon dari berkas tidak pernah polos di tabel.
- Rahasia hanya di `.env.local` (tidak dilacak git). Server menolak mulai di staging atau produksi bila rahasia tampak seperti nilai contoh.
- Passphrase tanda tangan disimpan sebagai hash argon2id dan hanya mencegah tanda tangan lewat sesi yang dibiarkan terbuka; percobaan salah memakai pengunci bertingkat yang sama dengan masuk, dan tebakan serentak dari satu pengguna diserialkan dengan kunci penasihat (tanpa itu seratus tebakan paralel lolos sebelum hitungan naik).
- Surat terbit beku: nomor, kode, lembar, tata letak, kop, hash dokumen, dan tanda tangan tidak bisa diubah siapa pun lewat SQL (pemicu), dan hanya `status`, `pembatalan`, `diambil`, dan `catatan_internal` yang masih boleh berubah.
- Verifikasi publik tidak membocorkan NIK, NIP, id, isian, alamat, atau alasan pembatalan; nama disamarkan. Risiko yang diterima: penyerang dari banyak alamat bisa mengunci verifikasi satu desa selama 10 menit (tidak ada data bocor; kunci berhenti sendiri).
- Foto syarat dan pindaian tersimpan sebagai sandi, bukan polos; tipe berkas dari byte, bukan dari kiriman klien; metadata gambar (lokasi GPS) dibuang sebelum disimpan; berkas hanya bisa dibuka lewat sesi petugas yang berhak (bukan sesi bantuan), dengan tipe tetap, `nosniff`, dan CSP penutup. Nama berkas buatan server dari nama syarat atau dibersihkan (`namaScanAman`), dan 16 angka berurutan ditolak di teks bebas surat masuk (kontrak dan CHECK).
- Log JSON dengan penyamaran kunci sensitif; jawaban galat tidak memuat tumpukan atau isi basis data.

Pengerasan tambahan sebelum peluncuran dicatat di `SPEC-V0.3.md` §15.2.
