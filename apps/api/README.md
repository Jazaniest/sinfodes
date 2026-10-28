# Sinfodes API

Server API Sinfodes: Hono, PostgreSQL, dan Drizzle. Sampai tahap 8E1 server memuat identitas empat pelaku, akses bantuan Tim Sinfodes, serta kependudukan (penduduk, keluarga, wilayah) yang menjawab kontrak yang sama dengan API tiruan di `apps/web`:

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
| `GET/PUT /api/v1/pengaturan/wilayah` | Istilah wilayah dan susunan dusun, RW, RT (terbuka selama desa belum punya penduduk) |
| `POST /api/v1/warga/masuk`, `/warga/lupa-pin`, `GET /warga/sesi`, `PATCH /warga/akun`, `POST /warga/sesi/keluar` | Layanan warga: NIK dan PIN di alamat desa, cookie `__Host-warga` |
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
- Nilai NIK dan telepon di Riwayat perubahan penduduk disandikan seperti kolom aslinya, dan CHECK di basis data menolak nilai polos.
- Rahasia hanya di `.env.local` (tidak dilacak git). Server menolak mulai di staging atau produksi bila rahasia tampak seperti nilai contoh.
- Log JSON dengan penyamaran kunci sensitif; jawaban galat tidak memuat tumpukan atau isi basis data.

Pengerasan tambahan sebelum peluncuran dicatat di `SPEC-V0.3.md` §15.2.
