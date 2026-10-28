# Sinfodes

SaaS Sistem Informasi Desa untuk banyak desa. Fase saat ini: antarmuka lengkap dengan API tiruan (MSW) dan data demo. Backend sungguhan dirancang di `SPEC-V0.3.md`.

## Susunan repositori

Monorepo pnpm. Perintah dijalankan dari akar repositori.

| Folder | Isi |
|---|---|
| `apps/web` | Aplikasi web (Vite, React 19, TypeScript, Tailwind v4) beserta API tiruan |
| `apps/api` | Server API (Hono, PostgreSQL, Drizzle). Sampai tahap 8E3 memuat alamat, masuk empat pelaku (panel desa, warga, kabupaten, Konsol dengan TOTP), akses bantuan Tim Sinfodes (tiket, sesi lihat-saja, penyamaran NIK, jejak), serta penduduk, keluarga, susunan wilayah (baca, tambah, ubah, ganti kepala, pecah KK, ekspor), mutasi (lahir, meninggal, pindah, datang), laporan data warga, impor penduduk dari Excel atau CSV, Buku Administrasi (lima buku penduduk), statistik penduduk, dan pencarian global. Cara menyalakan: `apps/api/README.md` |
| `packages/kontrak` | Skema Zod, aturan domain, dan kode galat yang dipakai bersama oleh web dan server. Paket sumber tanpa build; di web diimpor lewat alias `@/domain/...` |
| `packages/demo` | Pembangkit dunia demo yang deterministik beserta tipe basis data tiruan. Di web diimpor lewat `@sinfodes/demo/...` |

## Perintah

Butuh Node.js 22.12 atau lebih baru dan pnpm 10.

| Perintah | Fungsi |
|---|---|
| `pnpm install` | Memasang dependensi semua paket |
| `pnpm dev` | Server pengembangan `apps/web` (mode demo, API tiruan) di `http://sinfodes.localhost:5173` |
| `pnpm dev:api` | Server API di `http://127.0.0.1:3001` (butuh PostgreSQL, lihat `apps/api/README.md`) |
| `pnpm dev:nyata` | `apps/web` mode nyata: `/api` diteruskan ke server API, tanpa MSW. Buka `http://sungaisialang.sinfodes.localhost:5173/admin/masuk` |
| `pnpm build` | Build produksi, hasilnya di `apps/web/dist` |
| `pnpm typecheck` | Pemeriksaan tipe |
| `pnpm lint` | ESLint |
| `pnpm test` | Seluruh uji (Vitest) |

Port lain: `pnpm dev --port 5174 --strictPort`.

## Catatan

- Pengaturan lingkungan frontend ada di `apps/web/.env`. Jangan menaruh rahasia API di sana. Rahasia server ada di `apps/api/.env.local`, yang tidak dilacak git.
- Mode nyata baru melayani alamat, masuk empat pelaku, dan daftar penduduk. Halaman lain (Beranda, surat, dan seterusnya) menjawab `NOT_FOUND` sampai modulnya dibangun di tahap 8E-8K.
- Akun Tim Sinfodes untuk Konsol dibuat pemilik dengan `pnpm --filter @sinfodes/api db:akun-tim --email=... --nama="..."`; kata sandi dan kunci TOTP dicetak sekali di terminal Anda (lihat `apps/api/README.md`).
- Uji server (`apps/api`) butuh PostgreSQL 15 atau lebih baru yang menyala. Tanpa itu, uji basis data gagal dengan pesan yang jelas, bukan terlewat diam-diam.
- Skrip di `apps/web/scripts/` dijalankan dari folder `apps/web`.
- Dokumen lama yang menyebut `src/…` merujuk ke `apps/web/src/…`, kecuali `src/domain/…` yang kini `packages/kontrak/src/…` serta `src/mocks/data`, `src/mocks/generator`, `src/mocks/prng.ts`, dan `src/mocks/tipe-db.ts` yang kini di `packages/demo/src/…`.
- Cara menjalankan dan memakai demo: `PANDUAN-DEMO.md`. Riwayat perubahan: `CHANGELOG.md`.
