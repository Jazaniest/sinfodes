# Sinfodes

SaaS Sistem Informasi Desa untuk banyak desa. Fase saat ini: antarmuka lengkap dengan API tiruan (MSW) dan data demo. Backend sungguhan dirancang di `SPEC-V0.3.md`.

## Susunan repositori

Monorepo pnpm. Perintah dijalankan dari akar repositori.

| Folder | Isi |
|---|---|
| `apps/web` | Aplikasi web (Vite, React 19, TypeScript, Tailwind v4) beserta API tiruan |
| `apps/api` | Backend. Belum ada, mulai tahap 8C |
| `packages/kontrak` | Skema Zod, aturan domain, dan kode galat yang dipakai bersama oleh web dan server. Paket sumber tanpa build; di web diimpor lewat alias `@/domain/...` |
| `packages/demo` | Pembangkit dunia demo yang deterministik beserta tipe basis data tiruan. Di web diimpor lewat `@sinfodes/demo/...` |

## Perintah

Butuh Node.js 22.12 atau lebih baru dan pnpm 10.

| Perintah | Fungsi |
|---|---|
| `pnpm install` | Memasang dependensi semua paket |
| `pnpm dev` | Server pengembangan `apps/web` di `http://sinfodes.localhost:5173` |
| `pnpm build` | Build produksi, hasilnya di `apps/web/dist` |
| `pnpm typecheck` | Pemeriksaan tipe |
| `pnpm lint` | ESLint |
| `pnpm test` | Seluruh uji (Vitest) |

Port lain: `pnpm dev --port 5174 --strictPort`.

## Catatan

- Pengaturan lingkungan frontend ada di `apps/web/.env`. Jangan menaruh rahasia API di sana.
- Skrip di `apps/web/scripts/` dijalankan dari folder `apps/web`.
- Dokumen lama yang menyebut `src/…` merujuk ke `apps/web/src/…`, kecuali `src/domain/…` yang kini `packages/kontrak/src/…` serta `src/mocks/data`, `src/mocks/generator`, `src/mocks/prng.ts`, dan `src/mocks/tipe-db.ts` yang kini di `packages/demo/src/…`.
- Cara menjalankan dan memakai demo: `PANDUAN-DEMO.md`. Riwayat perubahan: `CHANGELOG.md`.
