# Sinfodes API

Server API Sinfodes: Hono, PostgreSQL, dan Drizzle. Tahap 8C baru memuat satu irisan vertikal yang menjawab kontrak yang sama dengan API tiruan di `apps/web`:

| Rute | Isi |
| --- | --- |
| `GET /api/v1/alamat` | Apa yang ada di alamat ini: desa, alias lama, induk, atau Konsol |
| `POST /api/v1/sesi/masuk` | Masuk panel desa; sesi dibawa cookie `__Host-panel` |
| `GET /api/v1/sesi` | Sesi yang sedang berjalan |
| `POST /api/v1/sesi/keluar` | Keluar; sesi dicabut |
| `GET /api/v1/penduduk`, `POST /api/v1/penduduk/cari`, `GET /api/v1/penduduk/ringkasan` | Daftar, pencarian, dan angka kepala halaman Penduduk |

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

4. Nyalakan server di `http://127.0.0.1:3001`, lalu frontend mode nyata:

   ```bash
   pnpm dev:api
   ```

   ```bash
   pnpm dev:nyata
   ```

   Masuk di `http://sungaisialang.sinfodes.localhost:5173/admin/masuk` dengan akun demo mana pun (kata sandi `demo`), mis. `rosmiati@sungaisialang.desa.id`.

`db:semai` menolak lingkungan `staging` dan `produksi` kecuali diberi `--izinkan-lingkungan-nyata`, karena akun demo berkata sandi bersama.

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
- Masuk menjawab sama persis untuk email tak dikenal, kata sandi salah, akun nonaktif, dan akun desa lain; selalu ada satu verifikasi argon2. Batas laju per IP dan per email.
- Rahasia hanya di `.env.local` (tidak dilacak git). Server menolak mulai di staging atau produksi bila rahasia tampak seperti nilai contoh.
- Log JSON dengan penyamaran kunci sensitif; jawaban galat tidak memuat tumpukan atau isi basis data.

Pengerasan tambahan sebelum peluncuran dicatat di `SPEC-V0.3.md` §15.2.
