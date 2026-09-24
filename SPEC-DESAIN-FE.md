# Spesifikasi Desain Frontend Sinfodes — Tahap 1

> **Status:** disetujui per bagian dalam sesi brainstorming, 23–24 September 2026.
> **Dipakai untuk:** acuan rencana implementasi tahap 1 (frontend dengan data dummy).
> **Bahasa antarmuka:** Bahasa Indonesia.

---

## 0. Ringkasan

Sinfodes adalah Sistem Informasi Desa berbentuk **SaaS untuk banyak desa**. Tahap 1 membangun **frontend sungguhan dengan data dummy** untuk empat bagian: panel admin desa, website publik desa, layanan mandiri warga, dan Konsol Sinfodes. Data disajikan lewat **API tiruan (MSW)**, sehingga backend asli nanti bisa dipasang tanpa menulis ulang layar.

- **Desa demo:** Desa Sungai Sialang (nama fiktif), Kecamatan Teluk Meranti, Kabupaten Pelalawan, Riau.
- **Arah visual:** "Register", yaitu arsip dinas yang rapi.

---

## 1. Keputusan yang sudah diambil

| # | Topik | Keputusan |
|---|---|---|
| K1 | Model produk | SaaS multi-desa. Aplikasinya ber-merek Sinfodes, sedangkan identitas tiap desa (nama, lambang, kop surat, tampilan website) disimpan sebagai data per desa. |
| K2 | Cakupan tahap 1 | Empat bagian: panel admin desa, website publik desa, layanan mandiri warga, dan Konsol Sinfodes. |
| K3 | Modul yang digarap paling detail | **Kependudukan** dan **Layanan Surat**: daftar, detail, formulir, dan semua kondisi tampilan. Modul lain cukup halaman utama (§8). |
| K4 | Desa demo | Desa Sungai Sialang (fiktif), Kec. Teluk Meranti (kode 14.05.09), Kab. Pelalawan (14.05), Prov. Riau (14), kode pos 28353. |
| K5 | Arah visual | **A — Register.** Kehangatan arah C (warna aksen dan motif daerah) hanya dipakai di website publik. |
| K6 | Backend (tahap berikutnya) | TypeScript (Node.js) + PostgreSQL. Multi-tenant dengan penanda desa di setiap data, ditambah Row-Level Security. Server berada di Indonesia (UU PDP No. 27/2022). |
| K7 | Pendekatan tahap 1 | Frontend produksi + API tiruan (MSW) + data dummy dari seed tetap. Bisa dipasang online sebagai demo. |
| K8 | Foto | Sekitar 15 foto berlisensi bebas (Unsplash, Pexels, atau Wikimedia Commons). Daftarnya disetujui pengguna sebelum diunduh, dan kredit fotografer dicantumkan. **Tidak memakai foto buatan AI.** |
| K9 | Instalasi library | Pengguna menjalankan sendiri perintah `pnpm add`. Implementasi hanya menyediakan perintahnya lalu menunggu konfirmasi. |
| K10 | Logo | File `src/assets/brand/sinfodes.svg` adalah hasil tracing otomatis (116 KB, 289 path, tepi bergerigi). Tahap 1 memakai versi yang latar putihnya sudah dibuang (lihat §16). |

---

## 2. Lingkup

### 2.1 Termasuk tahap 1

- Empat bagian aplikasi (§3.1) beserta halaman demo di `/`.
- Design system Register (§4).
- Modul Kependudukan (§6) dan Layanan Surat (§7) lengkap.
- Halaman utama semua modul lain (§8).
- Website publik (§9), layanan mandiri warga (§10), dan Konsol (§11).
- API tiruan untuk semua endpoint di §3.4, dengan data dummy yang konsisten (§12).
- Mode demo: ganti peran, simulasi koneksi, dan reset data (§3.6).
- Uji otomatis untuk aturan domain, data dummy, dan kontrak API (§13).

### 2.2 Tidak termasuk tahap 1

- Backend, database, dan autentikasi sungguhan.
- **Integrasi layanan luar.** Semua bagian ini di tahap 1 hanya disimulasikan atau ditampilkan:
  - **Dukcapil:** tidak diintegrasikan.
  - **Siskeudes:** hanya ditampilkan sebagai "disinkronkan".
  - **TTE BSrE:** disimulasikan dengan passphrase.
  - **WhatsApp Business API:** pesan hanya ditampilkan sebagai pratinjau.
  - **Pembayaran langganan:** tidak ada pembayaran sungguhan.
- Render sisi server untuk website publik, dan PWA (aplikasi yang bisa dipasang di HP).
- Editor artikel lengkap, pustaka template surat untuk semua desa, dan akses dukungan ke data desa.
- Mode gelap dan multi-bahasa.
- Formulir tambah/ubah untuk modul non-inti, kecuali yang disebut di §8.
- Versi vektor bersih logo Sinfodes (§16).

---

## 3. Arsitektur

### 3.1 Bagian aplikasi dan URL

| Bagian | URL demo | Nanti di produksi | Pengguna | Perangkat utama |
|---|---|---|---|---|
| Halaman demo | `/` | tidak ada | penyaji demo, tim | desktop |
| Panel admin desa | `/admin/…` | `app.sinfodes.id` | perangkat desa | laptop 1366×768 |
| Website publik desa | `/desa/:slug/…` (demo: `/desa/sungai-sialang`) | domain desa, mis. `sungaisialang.desa.id` | warga, perantau, publik | HP |
| Layanan mandiri warga | `/warga/…` | `layanan.sinfodes.id` | warga terdaftar | HP 360px |
| Konsol Sinfodes | `/konsol/…` | `konsol.sinfodes.id` | tim Sinfodes, pemantau wilayah | desktop |

Setiap bagian dimuat terpisah lewat *code splitting* per rute. Bagian publik dan warga tidak ikut mengunduh kode panel admin.

**Daftar rute**

- **Admin:**
  - `/admin` (Beranda) dan `/admin/masuk`.
  - Layanan Surat:
    - `/admin/surat` (Permohonan; tab lewat `?status=`)
    - `/admin/surat/baru` (`?langkah=1..4`)
    - `/admin/surat/:id`
    - `/admin/surat/tanda-tangan`
    - `/admin/surat/arsip` (`?jenis=keluar|masuk`)
    - `/admin/surat/jenis` dan `/admin/surat/jenis/:id`
  - Pengaduan: `/admin/pengaduan` dan `/admin/pengaduan/:id`.
  - Kependudukan:
    - `/admin/kependudukan/penduduk`, `…/penduduk/baru`, `…/penduduk/:id`, `…/penduduk/:id/ubah`
    - `/admin/kependudukan/keluarga` dan `…/keluarga/:id`
    - `/admin/kependudukan/mutasi` dan `…/mutasi/baru?jenis=lahir|meninggal|pindah|datang`
    - `/admin/kependudukan/statistik` dan `/admin/kependudukan/impor`
  - Modul lain:
    - `/admin/bansos` dan `/admin/bansos/:id`
    - `/admin/kesehatan`, `/admin/peta`, `/admin/keuangan`
    - `/admin/pembangunan` dan `/admin/pembangunan/:id`
    - `/admin/aset`, `/admin/lembaga`
    - `/admin/buku` dan `/admin/buku/:kode`
    - `/admin/website` (tab: artikel, pengumuman, agenda, galeri, tampilan)
    - `/admin/pengaturan` (tab: identitas, wilayah, pengguna, penomoran)
    - `/admin/notifikasi`
- **Publik:**
  - `/desa/:slug` (beranda)
  - `…/profil`, `…/kabar`, `…/kabar/:artikel`
  - `…/transparansi`, `…/statistik`, `…/layanan`
  - `…/verifikasi` (`?kode=` dari QR), `…/potensi`
- **Warga:**
  - `/warga/masuk` dan `/warga` (beranda)
  - `/warga/ajukan`, `/warga/riwayat`, `/warga/riwayat/:id`
  - `/warga/keluarga`
  - `/warga/pengaduan`, `/warga/pengaduan/baru`, `/warga/pengaduan/:id`
  - `/warga/akun`
- **Konsol:**
  - `/konsol` (ringkasan)
  - `/konsol/desa`, `/konsol/desa/baru`, `/konsol/desa/:id`
  - `/konsol/pemantauan`

**Aturan privasi URL.** **NIK tidak pernah muncul di URL**, baik URL halaman maupun URL API. Halaman detail memakai ID internal yang tidak berurutan (mis. `pdk_7f3k2q`). Filter terstruktur (dusun, jenis kelamin, umur, dan seterusnya) disimpan di URL. **Kata kunci pencarian bebas tidak disimpan di URL**, karena bisa berisi NIK.

### 3.2 Struktur folder

```
src/
├─ app/           penyedia global (QueryClient, router, sesi), awal MSW, kerangka per bagian
├─ routes/        definisi rute TanStack Router (file tipis; isi layar ada di features/)
├─ features/      layar dan komponen per modul
│  ├─ beranda/  penduduk/  keluarga/  mutasi/  statistik/  impor/
│  ├─ surat/  pengaduan/  bansos/  kesehatan/  peta/  keuangan/
│  ├─ pembangunan/  aset/  lembaga/  buku/  website/  pengaturan/
│  ├─ publik/  warga/  konsol/  demo/
├─ ui/            design system Register (token, komponen dasar, pola domain)
├─ domain/        skema Zod, tipe, dan aturan murni — TANPA React
├─ api/           pemanggil HTTP bertipe + hook TanStack Query per sumber data
├─ mocks/         handler MSW, basis data tiruan, pembangkit data, penyimpanan IndexedDB
└─ assets/brand/  logo Sinfodes
```

**Aturan ketergantungan antar-folder**

- `domain/` tidak boleh mengimpor React atau folder lain. Tujuannya supaya nanti bisa dipindah menjadi paket bersama dengan backend.
- `ui/` tidak boleh mengimpor `features/`.
- `features/` boleh memakai `ui/`, `domain/`, dan `api/`.
- `mocks/` memakai `domain/` untuk skema dan aturan.

### 3.3 Alur data

```
Sekarang:  Layar → TanStack Query → Pemanggil API (fetch /api/v1/…) → MSW → Basis data tiruan ⇄ IndexedDB
Nanti:     Layar → TanStack Query → Pemanggil API (fetch /api/v1/…) → Backend TypeScript → PostgreSQL
```

Tiga langkah pertama tidak berubah saat backend masuk. MSW cukup dimatikan lewat `VITE_DEMO=false`, lalu arahkan `VITE_API_BASE` ke backend.

### 3.4 Kontrak API

**Konvensi**

- Semua endpoint memakai awalan `/api/v1`, dengan format JSON dan nama field camelCase.
- **Penamaan:** nama domain memakai Bahasa Indonesia (`penduduk`, `keluarga`, `jenisSurat`, `permohonan`). Istilah teknis memakai Bahasa Inggris (`page`, `pageSize`, `total`, `code`).
- **Tanggal:** ISO 8601 dengan zona WIB, mis. `2026-09-24` atau `2026-09-24T09:12:00+07:00`.
- **Uang:** bilangan bulat rupiah, mis. `1250000`.
- **NIK dan nomor KK:** string 16 digit. NIK boleh `null` untuk bayi yang belum mendapat NIK dari Dukcapil.
- **Bentuk respons daftar:** `{ "data": [...], "meta": { "page": 1, "pageSize": 25, "total": 2812 } }`.
- **Bentuk respons galat:** `{ "error": { "code": "...", "message": "pesan untuk pengguna", "fields": { "nik": "NIK sudah terdaftar" } } }`.

**Kode galat**

| Kode galat | HTTP | Arti |
|---|---|---|
| `VALIDATION` | 422 | Isian tidak valid; rinciannya ada di `fields` |
| `CONFLICT` | 409 | Data bentrok, mis. NIK ganda |
| `NOT_FOUND` | 404 | Data tidak ditemukan |
| `FORBIDDEN` | 403 | Peran tidak berhak |
| `UNAUTHENTICATED` | 401 | Sesi tidak ada atau habis |
| `RATE_LIMITED` | 429 | Terlalu banyak percobaan (login warga, verifikasi) |
| `SERVER` | 500/503 | Galat server (dipakai simulasi "koneksi gagal") |

**Lingkup data (tenant).** Endpoint admin otomatis dibatasi ke desa milik sesi. Endpoint publik memakai `:slug`. Endpoint warga memakai sesi warga. Endpoint konsol memakai peran konsol; pemantau otomatis dibatasi ke wilayahnya.

**Pencarian yang bisa berisi NIK selalu memakai `POST` dengan isi di body**, mis. `POST /penduduk/cari`.

**Daftar endpoint**

| Area | Endpoint |
|---|---|
| Sesi admin | `POST /sesi/masuk`, `POST /sesi/keluar`, `GET /sesi` |
| Beranda | `GET /beranda` (isi sesuai peran), `GET /buku-hari-ini` |
| Pencarian cepat | `POST /cari` → hasil campuran (penduduk, keluarga, surat, halaman/aksi) |
| Penduduk | `GET /penduduk` (filter terstruktur), `POST /penduduk/cari`, `POST /penduduk`, `GET /penduduk/:id`, `PATCH /penduduk/:id`, `GET /penduduk/:id/riwayat`, `POST /penduduk/cek-nik`, `POST /penduduk/ekspor` |
| Keluarga | `GET /keluarga`, `POST /keluarga/cari`, `GET /keluarga/:id`, `POST /keluarga/:id/anggota`, `POST /keluarga/:id/pecah`, `POST /keluarga/:id/ganti-kepala` |
| Mutasi | `GET /mutasi`, `POST /mutasi/lahir`, `POST /mutasi/meninggal`, `POST /mutasi/pindah`, `POST /mutasi/datang` |
| Statistik | `GET /statistik/penduduk?dusun=` |
| Impor | `POST /impor/penduduk` (multipart) → laporan, `POST /impor/penduduk/:id/konfirmasi` |
| Laporan data warga | `GET /laporan-data`, `POST /laporan-data/:id/terapkan`, `POST /laporan-data/:id/tolak` |
| Jenis surat | `GET /jenis-surat`, `GET /jenis-surat/:id`, `PATCH /jenis-surat/:id` |
| Permohonan surat | `GET /permohonan?status=&periode=`, `POST /permohonan/cari`, `POST /permohonan` (loket), `GET /permohonan/:id`, `PATCH /permohonan/:id` (isian), `POST /permohonan/:id/{proses,tolak,ajukan-ttd,paraf,kembalikan,tandatangani,batalkan,tandai-diambil,kirim-wa}`, `GET /permohonan/antrian-ttd` |
| Arsip surat | `GET /surat-keluar`, `GET /surat-masuk`, `POST /surat-masuk` |
| Pengaduan | `GET /pengaduan`, `GET /pengaduan/:id`, `POST /pengaduan/:id/balasan`, `POST /pengaduan/:id/status` |
| Modul lain (baca) | `GET /bansos/program`, `GET /bansos/program/:id/penerima`, `GET /kesehatan/posyandu`, `GET /kesehatan/balita`, `GET /peta/lapisan`, `GET /keuangan/apbdes?tahun=`, `POST /keuangan/sinkron-siskeudes` (tiruan), `GET /pembangunan/kegiatan`, `GET /pembangunan/kegiatan/:id`, `GET /aset`, `GET /lembaga`, `GET /buku-administrasi`, `GET /buku-administrasi/:kode` |
| Website desa | `GET /website/artikel`, `GET /website/pengumuman`, `GET /website/agenda`, `GET /website/galeri`, `GET /website/tampilan`, `PUT /website/tampilan` |
| Pengaturan | `GET/PUT /pengaturan/desa`, `GET/PUT /pengaturan/wilayah`, `GET /pengaturan/pengguna`, `POST /pengaturan/pengguna`, `PATCH /pengaturan/pengguna/:id`, `GET/PUT /pengaturan/penomoran` |
| Notifikasi | `GET /notifikasi`, `POST /notifikasi/tandai-dibaca` |
| Publik | `GET /publik/:slug/{beranda,profil,kabar,kabar/:artikel,transparansi,statistik,layanan,potensi}`, `POST /publik/:slug/verifikasi` |
| Warga | `POST /warga/masuk`, `POST /warga/lupa-pin`, `GET /warga/beranda`, `GET /warga/jenis-surat`, `POST /warga/permohonan`, `GET /warga/permohonan`, `GET /warga/permohonan/:id`, `GET /warga/keluarga`, `POST /warga/laporan-data`, `GET /warga/bantuan`, `GET/POST /warga/pengaduan`, `GET /warga/pengaduan/:id`, `POST /warga/pengaduan/:id/balasan`, `PATCH /warga/akun` |
| Konsol | `GET /konsol/ringkasan`, `GET /konsol/desa`, `POST /konsol/desa`, `GET /konsol/desa/:id`, `GET /konsol/pemantauan?wilayah=14.05` |

Setiap respons API tiruan harus lolos validasi skema Zod di `domain/`. Hal ini diuji otomatis (§13.1).

### 3.5 Sesi dan peran di demo

- Halaman demo `/` membuat sesi sesuai tombol yang dipilih (daftar akun ada di §12.9). Sesi disimpan di `localStorage`.
- Setiap bagian punya penjaga rute:
  - Belum masuk → diarahkan ke halaman masuk bagian tersebut.
  - Peran tidak berhak → tampil halaman "Tidak punya akses", lengkap dengan tautan kembali.

### 3.6 Mode demo

- **Aktif saat `VITE_DEMO=true`.** Flag ini menyalakan MSW (juga di build produksi untuk demo online), toolbar demo, dan halaman demo `/`.
- **Isi toolbar demo** (melayang di kiri bawah, bisa disembunyikan; pilihannya diingat di `localStorage`):
  - **Peran:** Operator, Sekretaris Desa, Kepala Desa, Kaur Keuangan, Kepala Dusun. Hanya muncul di `/admin`.
  - **Koneksi:**
    - *Normal:* jeda 150–400 ms.
    - *Lambat (3G):* jeda 1,5–3 detik.
    - *Gagal:* semua permintaan membalas `SERVER` 503.
  - **Reset data:** membangkitkan ulang data dari seed dengan tanggal acuan hari ini (§12.7).
- **Halaman demo `/`** menampilkan:
  - Tombol masuk untuk tiap peran di tiap bagian, beserta NIK dan PIN warga demo serta passphrase TTE demo.
  - Tiga skenario terpandu yang sama dengan kriteria selesai di §13.5.

### 3.7 Tools dan library

Semua library dipasang oleh pengguna. Perintah `pnpm add`-nya disiapkan dalam rencana implementasi.

| Kebutuhan | Paket |
|---|---|
| Styling | `tailwindcss`, `@tailwindcss/vite` |
| Routing | `@tanstack/react-router`, `@tanstack/router-plugin` (dev) |
| Pengambilan data | `@tanstack/react-query` |
| Tabel | `@tanstack/react-table`, `@tanstack/react-virtual` |
| Formulir dan skema | `react-hook-form`, `@hookform/resolvers`, `zod` |
| Komponen dasar | `react-aria-components`, `@internationalized/date` |
| API tiruan | `msw` (dependensi biasa, karena ikut di build demo) |
| Penyimpanan demo | `idb-keyval` |
| Grafik | `recharts` |
| Peta | `maplibre-gl` (dibungkus komponen sendiri; tile OpenFreeMap tanpa API key) |
| Ikon | `@phosphor-icons/react` |
| QR | `qrcode`, `@types/qrcode` (dev) |
| Font antarmuka | `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-serif`, `@fontsource/ibm-plex-mono` |
| Font surat | `@fontsource/tinos` (setara Times New Roman), `@fontsource/arimo` (setara Arial) |
| Pengujian | `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom` (semua dev) |

Setelah `msw` terpasang, pengguna menjalankan `pnpm dlx msw init public/ --save`.

### 3.8 Konvensi kode

- **TypeScript** mode ketat: `"strict": true` ditulis eksplisit di `tsconfig.app.json`.
- **Penamaan:**
  - Istilah domain memakai Bahasa Indonesia, istilah teknis memakai Bahasa Inggris, mis. `pendudukSchema`, `usePendudukList`, `formatRupiah`.
  - File komponen memakai `PascalCase.tsx`; file lain memakai `kebab-case.ts`.
- **Tailwind hanya boleh memakai token Register.** Palet bawaan Tailwind dimatikan (`--color-*: initial`), sehingga tidak ada warna sembarangan.
- **Teks untuk pengguna:** semua dalam Bahasa Indonesia, tanpa lorem ipsum.
- **Kondisi halaman:** setiap halaman yang memuat data wajib menangani kondisi memuat, kosong, galat, dan (bila relevan) hasil filter kosong.
- **Tidak ada tombol mati.** Aksi yang belum dibangun tidak ditampilkan.
- **Format tampilan:** semua format tanggal, uang, NIK, dan nama memakai fungsi di `domain/format/`. Komponen tidak menulis format sendiri.

---

## 4. Design system "Register"

### 4.1 Warna

Semua kombinasi teks sudah dihitung dan lolos WCAG 2.2 AA.

| Token | Hex | Dipakai untuk | Kontras |
|---|---|---|---|
| `kertas` | #F6F4EE | latar halaman admin | — |
| `kertas-2` | #ECE8DD | sidebar, area sekunder | — |
| `lembar` | #FFFEFA | tabel, kartu, kolom isian, dokumen | — |
| `garis` | #DDD7CA | garis pemisah (dekoratif) | 1,42:1, bukan untuk batas kontrol |
| `garis-input` | #8F877A | tepi kolom isian, kotak centang | 3,52:1 terhadap lembar |
| `tinta` | #1B2631 | teks utama | 13,96:1 terhadap kertas |
| `tinta-2` | #5A636C | teks sekunder, label | 5,56:1 terhadap kertas, 6,06:1 terhadap lembar |
| `tinta-3` | #6E767E | placeholder saja | 4,57:1 terhadap lembar |
| `biru` | #1F4E79 | aksi utama, tautan, cincin fokus, status Diproses | 8,58:1; teks putih di atasnya 8,66:1 |
| `biru-tua` | #183F62 | hover tombol utama | teks putih 10,90:1 |
| `biru-muda` | #E6EEF5 | latar info/pilihan | — |
| `oker` / `oker-muda` | #8A6212 / #F5ECD7 | Menunggu, peringatan | 5,42:1; 4,66:1 di atas oker-muda |
| `stempel` / `stempel-muda` | #5B3F8C / #EEE8F5 | Perlu TTD (warna tinta stempel) | 8,21:1; 6,90:1 di atas stempel-muda |
| `hijau` / `hijau-muda` | #28704F / #E3F1E8 | Selesai, berhasil | 5,91:1; 5,12:1 di atas hijau-muda |
| `merah` / `merah-muda` | #A03A2C / #F6E4E0 | Ditolak, galat, aksi hapus | 6,63:1; 5,45:1 di atas merah-muda |

**Palet grafik** (isi batang minimal 3:1 terhadap lembar):

| Seri | Hex | Kontras |
|---|---|---|
| seri-1 | #1F4E79 | 8,58 |
| seri-2 | #9C7A45 | 3,94 |
| seri-3 | #6B8BA8 | 3,54 |
| seri-4 | #6E767E | 4,57 |
| seri-5 | #3D7A6E | 4,95 |

Piramida penduduk memakai seri-1 untuk laki-laki dan seri-2 untuk perempuan. Warna status tidak dipakai untuk data grafik.

**Aturan lain**

- **Gradasi logo** hanya muncul di logo, tidak di tombol, latar, atau grafik.
- **Sidebar Konsol:** latar `tinta`, teks #F3F1EA (13,58:1).
- **Mode gelap:** tidak ada di tahap 1, tetapi token disusun supaya bisa ditambah nanti.

### 4.2 Huruf

Ukuran memakai rem (dasar 16px), sehingga tampilan tetap rapi saat browser di-zoom 125%.

| Token | Ukuran / tinggi baris | Huruf | Dipakai untuk |
|---|---|---|---|
| `judul-halaman` | 1,5rem / 1,2 | IBM Plex Serif 500 | judul halaman admin |
| `judul-bagian` | 1,125rem / 1,3 | IBM Plex Serif 500 | judul bagian, lembar |
| `teks` | 0,875rem / 1,45 | IBM Plex Sans 400/500 | isi tabel, teks umum admin |
| `teks-isian` | 0,9375rem | IBM Plex Sans 400 | nilai di dalam kolom isian |
| `teks-kecil` | 0,8125rem | IBM Plex Sans 400 | keterangan, meta |
| `label` | 0,6875rem, KAPITAL, spasi huruf 0,08em | IBM Plex Sans 500 | kepala kolom, breadcrumb, label grup (dipakai hemat) |
| `angka-id` | 0,8125–0,875rem | IBM Plex Mono 400/500 | NIK, nomor KK, nomor surat, kode wilayah |

**Aturan penggunaan**

- **Angka uang** memakai Plex Sans dengan `font-variant-numeric: tabular-nums`, bukan Mono.
- **Ukuran huruf per bagian aplikasi:**
  - Website publik dan layanan warga: teks dasar 1–1,0625rem.
  - Judul warta: 2,25–2,75rem Plex Serif.
- **Font dimuat terbatas:** hanya subset latin dan bobot yang dipakai. Font surat (Tinos/Arimo) hanya dimuat di halaman yang menampilkan lembar surat.

### 4.3 Bentuk, spasi, dan gerak

- **Sudut:** `radius-1` 2px untuk kolom isian, tombol, dan cap; `radius-2` 4px untuk lembar, panel, dan dialog.
- **Kedalaman** dibuat dengan garis, bukan bayangan.
  - Satu-satunya bayangan adalah `melayang`: `0 8px 24px rgba(27,38,49,.14)` + tepi 1px `garis`, khusus untuk menu, popover, dialog, dan toast.
  - Kepala tabel memakai garis bawah 1,5px `tinta`, seperti buku register.
- **Skala spasi (px):** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- **Tinggi elemen:**
  - Baris tabel: 40px untuk satu baris, 52px untuk dua baris (nama + NIK).
  - Kontrol: 32px di toolbar, 36px untuk tombol biasa, 40px untuk kolom isian formulir.
  - Di HP: 48px.
- **Gerak:**
  - 120ms untuk hover dan fokus; 180ms untuk laci, menu, dan dialog.
  - Hanya efek pudar dan geser, tanpa efek memantul.
  - Mengikuti `prefers-reduced-motion`.
- **Cincin fokus:** garis luar 2px `biru` dengan jarak 2px. Di sidebar gelap memakai #F3F1EA.

### 4.4 Komponen

| Kelompok | Komponen |
|---|---|
| Dasar | Tombol (utama, sekunder, teks, bahaya; ukuran kecil dan biasa; kondisi memuat). TombolIkon hanya untuk aksi kecil yang jelas (salin, tutup, menu baris) dan selalu punya label aksesibel + tooltip. |
| Isian | Field (label selalu tampil, bantuan, pesan galat), TextField, TextArea, Select, ComboBox, SearchField, DatePicker (ketik DD/MM/YYYY atau pilih kalender), RadioGroup, Checkbox, Switch, FileDrop, **NikField**, RupiahField, PinField (6 kotak) |
| Data | DataTable (urutkan, atur kolom, pilih baris, klik baris, paginasi "1–25 dari 2.812", baris kerangka, kondisi kosong/galat), Pagination, Tabs (garis bawah), ChipFilter, FilterBar, DescriptionList (label: nilai), Timeline (riwayat), StatLine (angka dalam kalimat), MiniBar (batang realisasi), BarChart, PyramidChart, LineChart |
| Status dan umpan balik | **Cap** (status berbentuk stempel), Hitungan (angka mono), Toast (boleh berisi satu aksi), Banner (info/peringatan/galat/berhasil), EmptyState, ErrorState, Skeleton, Stepper, ConfirmDialog |
| Lapisan | Dialog, Drawer (laci samping), Menu, Popover, Tooltip, CommandPalette (Ctrl+K) |
| Tata letak | AdminShell, PageHeader (breadcrumb + judul + meta + aksi), Sheet (lembar), SplitView, PublicShell (nameplate + footer), WargaShell (navigasi bawah), KonsolShell, DemoToolbar |
| Dokumen | KopSurat, LembarSurat (A4/F4, siap cetak), BlokTandaTangan, QrVerifikasi, NomorSurat |
| Tampilan data domain | Nik, NomorKk, Nama, Alamat, Tanggal, Rupiah, Umur |

**Varian Cap:**

- **Status surat:** DRAF (tinta-2), MENUNGGU (oker), DIPROSES (biru), PERLU TTD (stempel), SELESAI (hijau), DITOLAK (merah), DIBATALKAN (tinta-2, dicoret).
- **Penanda data:** HIDUP, MENINGGAL, PINDAH, PENDATANG, BELUM KTP-EL, BELUM ADA NIK, DATA BELUM LENGKAP.

Semua Cap berupa teks kapital bergaris tepi. **Status tidak pernah hanya warna.**

**Keadaan kosong** berupa teks dengan satu aksi yang jelas, tanpa ilustrasi lucu. **Keadaan galat** menjelaskan apa yang terjadi, lalu menyediakan tombol *Coba lagi*.

### 4.5 Pola khas desa

**NIK**

- Tampil dalam tiga kelompok makna dengan huruf mono dan spasi tipis: `140509 520391 8002`, artinya kode wilayah · tanggal lahir · nomor urut.
- Tombol salin menyalin 16 digit tanpa spasi.
- Tooltip menjelaskan isinya: "Kode wilayah 14.05.09 Teluk Meranti · Lahir 12-03-1991 · Perempuan · No. urut 8002".
- NIK kosong tampil sebagai Cap BELUM ADA NIK.

**NikField**

- Hanya menerima angka, maksimal 16 digit, dan otomatis dikelompokkan saat diketik. Tempelan dengan spasi, titik, atau strip dibersihkan.
- Baris di bawah kolom langsung membaca isinya, mis. "Perempuan · lahir 12 Mar 1991 · terdaftar di Teluk Meranti, Pelalawan".
- Aturan: tanggal dengan DD > 40 berarti perempuan; kode provinsi dicek terhadap tabel kode wilayah.
- Pesan galat: "NIK harus 16 angka — baru 15" dan "Tanggal di NIK tidak valid".
- Kode wilayah yang tidak dikenal hanya memunculkan peringatan, tidak menggagalkan isian.

**Tabel kode wilayah minimal**

- 38 provinsi.
- Kabupaten/kota di Riau.
- 12 kecamatan di Pelalawan (Lampiran A).
- Kabupaten asal pendatang yang dipakai data dummy (§12.5).

**Nomor KK.** Formatnya sama dengan NIK: `140509 180319 8004`, artinya wilayah · tanggal terbit · nomor urut.

**Nama**

- Di layar ditampilkan sesuai data ("Siti Rahmah").
- Di kolom data surat dicetak KAPITAL tebal ("SITI RAHMAH"), sesuai kebiasaan naskah dinas.

**Alamat**

- Format lengkap mengikuti KTP: `RT 004/RW 002, Dusun I Kampung Tengah`.
- Di daftar dipendekkan menjadi `Dusun I · RT 004/RW 002`.
- Istilah wilayah (dusun/banjar/jorong/…, RW, RT) diatur per desa dan dipakai di semua label.

**Tanggal dan waktu**

| Konteks | Format |
|---|---|
| Surat | "24 September 2026" |
| Tabel | "24 Sep 2026" |
| Kepala halaman | "Rabu, 24 September 2026" |
| Hari ini | "09.12" |
| Kemarin | "Kemarin" |
| Lebih lama | "21 Sep" |
| Dokumen dan log | "pukul 09.12 WIB" |

**Uang**

- Ditulis `Rp1.250.000`: tanpa spasi, tanpa desimal, rata kanan di tabel.
- Angka negatif ditulis `−Rp…`.
- Bentuk ringkas "Rp1,24 M", "Rp620 jt", "Rp48 rb", dengan nilai penuh di tooltip.
- **Terbilang** otomatis di surat, mis. "satu juta dua ratus lima puluh ribu rupiah".

**Angka.** Pemisah ribuan titik (2.812); desimal koma (65,4%).

**Umur.** "34 tahun"; untuk bayi di bawah 1 tahun, "8 bulan".

**Nomor surat.** Selalu memakai huruf mono.

### 4.6 Aksesibilitas (WCAG 2.2 AA)

- Kontras teks minimal 4,5:1; batas kontrol minimal 3:1.
- Cincin fokus selalu terlihat, dan semua fungsi bisa dijalankan dengan keyboard (dijamin React Aria).
- Label kolom isian selalu tampil; placeholder bukan pengganti label.
- Target sentuh minimal 44px di HP (standar kita 48px).
- Grafik selalu punya pilihan "Lihat sebagai tabel".
- Pesan galat terhubung ke kolomnya (`aria-describedby`).

### 4.7 Penerapan per bagian

| Bagian | Penerapan |
|---|---|
| Panel admin | Register apa adanya: padat, untuk laptop. |
| Layanan warga | Token sama dengan skala lebih besar (teks 16px, kontrol 48px), garis lebih sedikit, dan navigasi bawah. |
| Website publik | Versi "warta desa" dengan warna aksen dan motif khas tiap desa (§9). |
| Konsol | Sidebar `tinta` gelap dan logo Sinfodes di depan, supaya jelas beda dari panel desa. |

---

## 5. Panel admin: kerangka

### 5.1 Peran dan hak akses

| Kemampuan | Operator | Sekdes | Kades | Kaur Keuangan | Kadus |
|---|---|---|---|---|---|
| Beranda, Peta, Lembaga, Pembangunan, Notifikasi | ✓ | ✓ | ✓ | ✓ | ✓ |
| Layanan Surat: memproses | ✓ | ✓ | lihat | — | lihat (dusunnya) |
| Layanan Surat: paraf | — | ✓ | — | — | — |
| Layanan Surat: tanda tangan | — | a.n. (jika jenis surat mengizinkan) | ✓ | — | — |
| Pengaduan: menanggapi | ✓ | ✓ | lihat | — | ✓ (dusunnya) |
| Kependudukan: ubah dan catat mutasi | ✓ | ✓ | lihat | — | lihat (dusunnya) |
| Bansos, Kesehatan: lihat | ✓ | ✓ | ✓ | — | ✓ (dusunnya) |
| Keuangan: lihat / sinkron Siskeudes | lihat | lihat | lihat | ✓ | — |
| Aset, Buku Administrasi: lihat dan unduh | ✓ | ✓ | ✓ | ✓ (buku keuangan) | — |
| Website Desa: kelola | ✓ | ✓ | — | — | — |
| Pengaturan: identitas, wilayah, penomoran | ✓ | ✓ | — | — | — |
| Pengaturan: pengguna | — | ✓ | — | — | — |

- Menu yang tidak berhak diakses **disembunyikan**, bukan dinonaktifkan.
- "Dusunnya" berarti data otomatis dibatasi ke dusun milik Kepala Dusun tersebut.

### 5.2 Navigasi

```
[lambang desa] Desa Sungai Sialang
               Teluk Meranti · Pelalawan
[ Cari NIK, nama, nomor surat…      Ctrl K ]

Beranda
PELAYANAN     Layanan Surat 7 · Pengaduan 2
DATA DESA     Kependudukan · Bantuan Sosial · Kesehatan · Peta Desa
TATA KELOLA   Keuangan · Pembangunan · Aset Desa · Lembaga Desa · Buku Administrasi
PUBLIKASI     Website Desa
─────────
Pengaturan · Notifikasi 3
Rosmiati · Operator                                     sinfodes
```

- **Sidebar hanya satu tingkat.** Sub-halaman tampil sebagai tab di kepala halaman modul. Contoh: Kependudukan berisi tab Penduduk · Keluarga · Mutasi · Statistik; Layanan Surat berisi tab Permohonan · Arsip · Jenis Surat.
- **Angka di samping menu** adalah jumlah yang perlu ditindaklanjuti oleh peran aktif.
- **Tidak ada bar atas global.** Judul dan aksi ada di PageHeader tiap halaman: breadcrumb berupa label kapital kecil, judul serif, baris meta, lalu tombol aksi di kanan.

### 5.3 Beranda

Beranda tidak memakai deretan kartu angka. Isinya disesuaikan dengan peran.

**Operator**

1. **Perlu ditindaklanjuti.** Contoh isinya:
   - "7 permohonan surat menunggu (tertua 2 hari)"
   - "2 pengaduan belum dibalas"
   - "1 kelahiran dilaporkan warga, belum dicatat"
   - "1 laporan perbaikan data dari warga"
   - "1 surat dikembalikan Kades untuk diperbaiki (SKU · Zulkifli)"
   - "12 penduduk datanya belum lengkap"
2. **Buku hari ini.** Kejadian hari ini diurutkan menurut jam, mis. "09.12 Permohonan SKTM · Siti Rahmah (online)". Isinya termasuk mutasi, surat terbit, pengaduan, dan unduhan data pribadi, mis. "Data penduduk diunduh (812 baris) · Rosmiati".
3. **Keadaan desa** dalam bentuk kalimat, mis. "2.812 jiwa dalam 806 KK · bulan ini 3 lahir, 1 meninggal, 2 datang, 4 pindah · 64 surat terbit, rata-rata selesai 1 hari". Ditambah satu MiniBar realisasi APBDes dan agenda terdekat.

**Sekretaris Desa.** Sama dengan operator, ditambah **"Perlu paraf Anda (n)"** di bagian paling atas.

**Kepala Desa**

- **"Menunggu tanda tangan Anda (3)"** dengan tombol *Mulai tanda tangani*.
- Keadaan desa.
- Realisasi APBDes per bidang (MiniBar).
- Pengaduan terbaru.
- Pembangunan yang sedang berjalan.

**Kaur Keuangan.** Realisasi pendapatan dan belanja per bidang, progres keuangan kegiatan pembangunan, dan agenda.

**Kepala Dusun.** Pengaduan dan laporan dari dusunnya, keadaan dusunnya dalam kalimat, dan jadwal posyandu dusunnya.

**Desa baru (status Persiapan)** — Beranda berganti menjadi **daftar persiapan** dengan progres:

1. Isi identitas dan kop surat.
2. Atur wilayah (dusun/RW/RT).
3. Impor data penduduk dari Excel.
4. Tambah pengguna.
5. Pilih jenis surat yang dilayani.

Setiap langkah punya tombol menuju halamannya.

### 5.4 Pencarian cepat (Ctrl+K)

- Dibuka dengan Ctrl/Cmd+K atau lewat kotak cari di sidebar.
- **Sumber hasil:**
  - penduduk (nama/NIK)
  - keluarga (nomor KK)
  - surat (nomor)
  - permohonan (nama pemohon)
  - halaman dan aksi ("Buat surat", "Tambah penduduk", "Catat kelahiran")
- **Navigasi:** panah untuk memilih, Enter untuk membuka, Esc untuk menutup.
- Kata kunci dikirim lewat `POST /cari`.

### 5.5 Notifikasi

- Daftar notifikasi dengan status sudah/belum dibaca.
- **Jenis:** permohonan baru, surat ditandatangani, surat dikembalikan, pengaduan baru, laporan data warga, dan pengumuman dari Sinfodes.

### 5.6 Halaman masuk

- Pengguna mengisi email atau nama pengguna, lalu kata sandi.
- Setelah akunnya dikenali, lambang dan nama desa tampil.
- Ada tautan "Lupa kata sandi" yang membuka tampilan instruksi.
- Di demo, halaman masuk dilewati lewat halaman demo.

### 5.7 Responsif

| Lebar layar | Perilaku |
|---|---|
| ≥ 1280px | Sidebar 240px |
| 1024–1279px | Sidebar 216px |
| < 1024px | Bar atas berisi lambang desa, tombol "Menu" (membuka laci navigasi), dan tombol cari |
| Tablet | Tabel bisa digeser menyamping, dengan kolom pertama menempel |
| < 640px | Daftar utama berubah menjadi baris bertumpuk (nama, NIK, status) |

Layar tanda tangan Kades dioptimalkan untuk HP (§7.4).

---

## 6. Kependudukan

### 6.1 Data

**Penduduk**

| Kelompok | Field |
|---|---|
| Identitas | `id` (internal), `nik` (boleh null), `nama`, `jenisKelamin` (L/P), `golonganDarah`, `agama`, `kewarganegaraan` (WNI/WNA) |
| Kelahiran | `tempatLahir`, `tanggalLahir`, `nomorAktaLahir` (opsional) |
| Keluarga | `keluargaId`, `hubunganKeluarga`, `namaAyah`, `namaIbu` |
| Alamat | ikut KK: `dusunId`, `rw`, `rt` |
| Pendidikan dan pekerjaan | `pendidikan`, `pekerjaan` |
| Perkawinan | `statusPerkawinan` |
| Status | `statusDasar` (Hidup/Meninggal/Pindah/Hilang), `statusPenduduk` (Tetap/Sementara), `ktpEl` (Sudah rekam/Belum rekam/Belum wajib) |
| Kontak | `telepon` (untuk WhatsApp), `catatan` |
| Jejak | `dibuatPada`, `diubahPada` |

Semua pilihan (enumerasi) ada di Lampiran C.

**Keluarga:** `id`, `nomorKk`, `kepalaKeluargaId`, alamat (dusun, RW, RT), `tanggalTerbit`, `anggotaIds`.

**Mutasi:** `id`, `jenis` (lahir/meninggal/pindah/datang), `tanggal`, `pendudukIds`, rincian per jenis, `dicatatOleh`, `dicatatPada`.

**Riwayat:** perubahan per field ("Pekerjaan: Pelajar/Mahasiswa → Karyawan Swasta · Rosmiati · 12 Jan 2026").

### 6.2 Daftar penduduk

**Kepala halaman**

- "Penduduk" dengan meta "2.812 jiwa · diperbarui hari ini 08.15".
- Tombol: *Tambah penduduk* (utama), *Impor Excel*, dan menu *Unduh*.
- Menu *Unduh* berisi:
  - **CSV:** pemisah titik koma dengan BOM UTF-8, supaya langsung terbuka rapi di Excel berbahasa Indonesia.
  - **Cetak Buku Induk Penduduk:** tata letak cetak, lalu simpan sebagai PDF dari browser.
  - Setiap unduhan dicatat di Buku hari ini.

**Kolom tabel**

- Kolom bawaan:
  - NIK
  - Nama (dengan jenis kelamin · umur di bawahnya)
  - Hubungan dan nomor KK
  - Alamat (dusun · RT/RW)
  - Pekerjaan
  - Penanda (Cap)
- Kolom tambahan lewat "Atur kolom": agama, pendidikan, status perkawinan, tempat/tanggal lahir, golongan darah, telepon.

**Urutan dan halaman.** Bisa diurutkan menurut nama (bawaan), umur, dusun, atau terakhir diubah. Ukuran halaman 25 (bawaan), 50, atau 100.

**Filter terstruktur di URL:** `dusun`, `rt`, `jk`, `umurMin`, `umurMax`, `agama`, `pendidikan`, `pekerjaan`, `kawin`, `status` (bawaan: hidup), `preset`. Kotak cari teks (nama/NIK/nomor KK) **tidak** masuk ke URL.

**Filter siap pakai (preset)**

| Preset | Kriteria |
|---|---|
| Wajib KTP belum rekam | (umur ≥ 17 atau pernah kawin) dan `ktpEl` = Belum rekam |
| Balita | 0–4 tahun |
| Lansia | ≥ 60 tahun |
| Pendatang tahun ini | punya mutasi *datang* di tahun berjalan |
| Data belum lengkap | salah satu field wajib kosong: pendidikan, pekerjaan, status perkawinan, atau NIK (kecuali bayi < 3 bulan) |

**Laci samping (klik baris)**

- Isinya: identitas ringkas, anggota keluarga, dan tiga surat terakhir.
- Aksinya: *Buka profil* dan *Buat surat untuk orang ini* (membuka §7.4 langkah 1 dengan pemohon sudah terisi).

**Kondisi tampilan**

| Kondisi | Tampilan |
|---|---|
| Memuat | Baris kerangka |
| Data kosong | "Belum ada data penduduk" + *Impor dari Excel* / *Tambah satu per satu* |
| Filter tanpa hasil | "Tidak ada penduduk yang cocok dengan filter ini" + *Hapus filter* |
| Galat | Pesan + *Coba lagi* |

### 6.3 Profil penduduk

**Kepala halaman**

- Nama dengan huruf serif, NIK beserta tombol salin, dan Cap yang relevan.
- Aksi: *Buat surat*, *Ubah*, dan menu *Catat mutasi* (Meninggal, Pindah).
- Cap yang mungkin tampil: HIDUP/MENINGGAL/PINDAH, PENDATANG, BELUM KTP-EL, BELUM ADA NIK, DATA BELUM LENGKAP.

**Lembar utama** berupa DescriptionList dengan bagian: Identitas, Kelahiran, Keluarga (anggota bisa diklik; tautan ke KK), Alamat, Pendidikan dan pekerjaan, Perkawinan, Orang tua, Dokumen, dan Kontak.

**Kolom samping** berisi tiga tab:

- **Riwayat:** perubahan data dan mutasi.
- **Surat:** semua surat yang pernah dibuat untuk orang ini.
- **Bantuan:** program bansos dan status penyalurannya.

**Laporan perbaikan dari warga** tampil sebagai banner di atas lembar. Contoh: "Warga melaporkan: pekerjaan seharusnya Wiraswasta", dengan tombol *Terapkan* atau *Tolak*.

### 6.4 Formulir tambah dan ubah

**Urutan bagian** mengikuti formulir biodata Dukcapil (F-1.01):

1. **Identitas:** NIK, nama lengkap, jenis kelamin, golongan darah, agama, kewarganegaraan.
2. **Kelahiran:** tempat lahir, tanggal lahir, nomor akta lahir.
3. **Keluarga:** pilih KK (cari lewat nomor KK atau nama kepala keluarga) atau *Buat KK baru*; hubungan dalam keluarga; nama ayah; nama ibu.
4. **Alamat:** otomatis mengikuti KK, hanya bisa dibaca.
5. **Pendidikan dan pekerjaan.**
6. **Perkawinan.**
7. **Dokumen dan kontak:** status KTP-el, nomor telepon/WhatsApp, catatan.

**Perilaku formulir**

- **Tata letak:** indeks bagian menempel di kiri, bilah aksi menempel di bawah (*Simpan*, *Simpan & tambah lagi*, *Batal*).
- **Pembacaan NIK:** jenis kelamin dan tanggal lahir terisi otomatis dari NIK dan masih bisa diubah.
  - Kalau bertentangan dengan NIK, muncul **peringatan**, bukan galat: "Tanggal lahir berbeda dengan NIK (12 Mar 1991)".
  - Data tetap bisa disimpan setelah konfirmasi, karena data lapangan kadang memang begitu.
- **NIK ganda** dicek saat kolom NIK ditinggalkan (`POST /penduduk/cek-nik`). Galatnya disertai tautan ke profil yang sudah ada.
- **Draf otomatis:** isian disimpan di `localStorage` per formulir. Saat dibuka lagi muncul banner "Draf dari 09.41 dipulihkan · Buang draf".
- **Penjaga keluar halaman** saat ada perubahan yang belum disimpan.
- **Setelah simpan:** muncul toast lalu diarahkan ke profil. Pada mode ubah, setiap field yang berubah dicatat ke Riwayat.

### 6.5 Keluarga (KK)

**Daftar KK.** Kolom: nomor KK, kepala keluarga, alamat, jumlah anggota, terakhir diperbarui. Ada kotak cari (lewat POST) dan filter dusun.

**Detail KK** ditata mirip kartu KK fisik:

- **Kepala:** nomor KK besar dengan huruf mono, nama kepala keluarga, alamat, RT/RW, desa, kecamatan, kabupaten, provinsi, kode pos.
- **Tabel anggota:** no, nama, NIK, jenis kelamin, tempat lahir, tanggal lahir, agama, pendidikan, pekerjaan, status perkawinan, hubungan, kewarganegaraan.

**Aksi**

- *Tambah anggota*: membuka formulir dengan KK sudah terisi.
- *Pecah KK*: dialog untuk memilih anggota yang keluar, lalu kepala keluarga baru dan alamatnya, lalu pratinjau sebelum simpan.
- *Ganti kepala keluarga*: lewat dialog.
- *Cetak*: tata letak cetak KK.

### 6.6 Mutasi

**Halaman daftar**

- Berupa buku mutasi yang bisa difilter menurut jenis dan bulan.
- Di bagian atas ada ringkasan bulan berjalan, mis. "September 2026: 3 lahir · 1 meninggal · 2 datang · 4 pindah".
- Menu *Catat mutasi* membuka salah satu dari empat alur berikut.

**Lahir**

1. Cari ibu (perempuan, hidup); KK ibu terisi otomatis.
2. Isi data bayi:
   - nama, jenis kelamin
   - tempat dilahirkan (RS/RB, Puskesmas, Polindes, Rumah, Lainnya)
   - tempat lahir (kota), tanggal dan jam lahir
   - jenis kelahiran, anak ke-, penolong kelahiran
   - berat (gram) dan panjang (cm)
3. Pilih ayah dan isi pelapor.

Hasilnya: penduduk baru **tanpa NIK** (Cap BELUM ADA NIK, karena NIK baru terbit dari Dukcapil) yang ditambahkan ke KK. Di akhir ada tawaran *Buat Surat Keterangan Kelahiran*.

**Meninggal**

1. Cari penduduk.
2. Isi tanggal dan jam, tempat, sebab kematian, yang menerangkan, dan pelapor.

Hasilnya:

- `statusDasar` = Meninggal; data tidak dihapus.
- Kalau yang meninggal kepala keluarga, dialog meminta pengganti.
- Penerima bansos atas nama orang itu ditandai "perlu ditinjau".
- Di akhir ada tawaran *Buat Surat Keterangan Kematian*.

**Pindah keluar**

1. Pilih penduduk atau seluruh anggota KK.
2. Isi alamat tujuan (provinsi, kabupaten, kecamatan, desa, alamat), alasan, dan tanggal.

Hasilnya: status Pindah, lalu tawaran *Buat Surat Pengantar Pindah*.

**Datang**

1. Isi nomor SKPWNI dan daerah asal.
2. Isi biodata tiap anggota, dengan NIK asal tetap dipakai.
3. Masukkan ke KK yang sudah ada atau KK baru, lalu pilih status Tetap atau Sementara.

**Setiap mutasi** tercatat di Buku Mutasi, Buku hari ini, dan Riwayat penduduk.

### 6.7 Statistik

**Grafik yang ditampilkan**

- Piramida penduduk (kelompok umur 5 tahunan 0–4 … 75+, laki-laki vs perempuan).
- Jumlah per dusun.
- Agama, pendidikan, pekerjaan (10 teratas + lainnya), dan status perkawinan.
- Kepemilikan KTP-el.

**Perilaku**

- Filter dusun: semua atau per dusun.
- **Setiap batang bisa diklik** untuk membuka daftar penduduk yang sudah terfilter. Contoh: "Lansia · Dusun II" membuka daftar dengan `preset=lansia&dusun=2`.
- Tersedia "Lihat sebagai tabel" dan *Unduh CSV*.
- Angka yang sama dipakai halaman Statistik publik, **hanya dalam bentuk agregat**.

### 6.8 Impor Excel

1. **Unggah file** (.xlsx/.csv), atau *Unduh template*.
2. **Cocokkan kolom.** Kolom dicocokkan otomatis lewat nama kepala kolom dan sinonimnya; kolom yang tidak dikenali ditandai.
3. **Periksa hasilnya**, mis. "2.790 siap · 22 bermasalah (9 NIK ganda, 13 tanggal tidak valid)". Masalah yang diperiksa:
   - NIK 16 digit
   - NIK ganda, di dalam file maupun dengan data yang sudah ada
   - tanggal valid
   - kesesuaian NIK dengan tanggal lahir (hanya peringatan)
   - hubungan keluarga valid
   - format nomor KK

   Baris yang bermasalah bisa diperbaiki langsung atau dilewati.
4. **Impor.** Progres ditampilkan, diikuti ringkasan: "2.790 penduduk dan 798 KK ditambahkan; 22 baris dilewati · Unduh laporan".

File dikirim ke `POST /impor/penduduk`. API tiruan tidak membaca isi file; ia mengembalikan laporan pemeriksaan tetap yang realistis untuk file apa pun. Ada juga tombol *Coba dengan file contoh*. Dengan cara ini tidak perlu library Excel di frontend.

---

## 7. Layanan Surat

### 7.1 Status dan perpindahannya

| Dari | Aksi | Ke | Oleh |
|---|---|---|---|
| — (online) | Warga mengajukan | Menunggu | Warga |
| — (loket) | Operator membuat | Diproses | Operator, Sekdes |
| Menunggu | Proses | Diproses | Operator, Sekdes |
| Menunggu / Diproses | Tolak (alasan wajib) | Ditolak | Operator, Sekdes |
| Diproses | Ajukan tanda tangan | Perlu TTD (tahap *paraf* bila jenis surat mewajibkan, lalu *tanda tangan*) | Operator, Sekdes |
| Perlu TTD (tahap paraf) | Paraf | Perlu TTD (tahap tanda tangan) | Sekdes |
| Perlu TTD | Kembalikan (catatan wajib) | Diproses, ditandai "dikembalikan" | Sekdes, Kades |
| Perlu TTD (tahap tanda tangan) | Tanda tangani (passphrase) | Selesai (**nomor diberikan saat ini**) | Kades, atau Sekdes a.n. Kepala Desa bila diizinkan |
| Selesai | Batalkan (alasan wajib) | Dibatalkan (nomor tetap tercatat) | Sekdes, Kades |
| Ditolak (online) | Ajukan ulang | Menunggu (permohonan baru, tertaut ke yang lama) | Warga |

**Keterangan tambahan**

- **Tanda setelah Selesai:** permohonan yang sudah selesai bisa diberi tanda *sudah diambil* (loket) atau *sudah diunduh* (online).
- **Kanal:** Online atau Loket.
- **Lama menunggu** dihitung dalam hari kerja (Senin–Jumat). Warnanya oker kalau lewat 1 hari kerja, dan merah kalau lewat 3 hari kerja.
- **Surat yang sudah terbit tidak bisa dihapus.**
- **Setiap perpindahan status** dicatat di riwayat permohonan (siapa, kapan, catatan) dan memicu notifikasi ke pihak terkait, termasuk warga.

### 7.2 Penomoran

- **Format bawaan:** `{klasifikasi}/{urut}/{kodeDesa}/{bulanRomawi}/{tahun}`, mis. `400/087/SS/IX/2026`.
  - `{urut}` terdiri dari 3 digit dengan nol di depan.
  - `kodeDesa` bawaannya `SS`.
- **Urutan nomor:** bawaannya satu urutan per tahun kalender untuk semua surat keluar, seperti Buku Agenda. Bisa diganti menjadi urutan per jenis surat.
- **Pemberian nomor:** nomor diberikan tepat saat surat ditandatangani, supaya tidak ada nomor yang terlewat saat draf batal.
- **Pengaturan penomoran:** format disusun dari potongan-potongan, dengan pratinjau nomor berikutnya.

### 7.3 Jenis surat bawaan

| Kode | Nama | Klasifikasi | Isian tambahan | Penandatangan | Paraf Sekdes | Berlaku | Online | Syarat |
|---|---|---|---|---|---|---|---|---|
| SKD | Surat Keterangan Domisili | 470 | keperluan | Kades; boleh a.n. Sekdes | tidak | 3 bulan | ya | KTP, KK, pengantar RT |
| SKTM | Surat Keterangan Tidak Mampu | 400 | keperluan (pendidikan/kesehatan/lainnya), instansi tujuan, nama anggota keluarga yang dibantu (opsional) | Kades | **ya** | 3 bulan | ya | KTP, KK, pengantar RT |
| SKU | Surat Keterangan Usaha | 500 | nama usaha, jenis usaha, alamat usaha, mulai usaha (tahun) | Kades | tidak | 6 bulan | ya | KTP, KK, foto tempat usaha (opsional) |
| SPCK | Surat Pengantar SKCK | 300 | keperluan | Kades; boleh a.n. Sekdes | tidak | 1 bulan | ya | KTP, KK, pas foto 4×6, pengantar RT |
| SKL | Surat Keterangan Kelahiran | 474.1 | data bayi (dari mutasi), pelapor | Kades | tidak | tanpa batas | ya | KK dan KTP orang tua, keterangan lahir dari bidan/RS |
| SKM | Surat Keterangan Kematian | 474.3 | tanggal, tempat, sebab, pelapor (dari mutasi) | Kades | tidak | tanpa batas | tidak | KK, KTP almarhum, KTP pelapor |
| SPP | Surat Pengantar Pindah | 475 | alamat tujuan, alasan, anggota yang pindah (dari mutasi) | Kades | tidak | 1 bulan | tidak | KK, KTP semua yang pindah |
| SKP | Surat Keterangan Penghasilan | 400 | penghasilan per bulan (angka + terbilang), keperluan | Kades | **ya** | 3 bulan | ya | KTP, KK |
| SPN | Surat Pengantar Nikah | 474.2 | nama, NIK, dan alamat calon pasangan; rencana tanggal | Kades | **ya** | 3 bulan | tidak | KTP, KK, akta lahir, pas foto |
| SKBN | Surat Keterangan Beda Nama | 470 | nama di dokumen lain, jenis dan nomor dokumen | Kades | tidak | tanpa batas | ya | KTP, KK, dokumen yang namanya berbeda |
| SKBM | Surat Keterangan Belum Menikah | 474.2 | keperluan | Kades | tidak | 3 bulan | ya | KTP, KK, pengantar RT |
| SKH | Surat Keterangan Kehilangan | 300 | barang/dokumen yang hilang, perkiraan waktu dan tempat | Kades; boleh a.n. Sekdes | tidak | 1 bulan | ya | KTP, KK |

- Kode klasifikasi di atas adalah **nilai bawaan yang bisa diubah desa**.
- **Teks isi surat** tiap jenis memakai sisipan otomatis: `[nama]`, `[nik]`, `[tempatTanggalLahir]`, `[alamat]`, `[keperluan]`, dan sisipan lain dari isian tambahan.

### 7.4 Layar

**1. Permohonan** (`/admin/surat`)

- Tab per status beserta jumlahnya. Periode bawaannya 14 hari terakhir, dan bisa diganti.
- Kotak cari (lewat POST) dan filter jenis surat.
- Kolom tabel: No. urut, Pemohon (nama + NIK), Jenis surat, Masuk (jam/tanggal + kanal), Lama menunggu, Status (Cap).
- Klik baris membuka ruang kerja surat.

**2. Buat surat, untuk loket** (`/admin/surat/baru`). Terdiri dari empat langkah dengan Stepper:

1. **Jenis surat.** Daftar jenis dengan kotak cari. Yang paling sering dipakai tampil di atas, beserta syarat dan masa berlakunya.
2. **Pemohon.** Dicari lewat ComboBox NIK/nama.
   - Setelah dipilih, muncul ringkasan pemohon dan peringatan data, mis. "Pekerjaan belum diisi" (boleh lanjut).
   - Status Meninggal/Pindah **memblokir** pembuatan surat.
   - Untuk surat tentang orang lain (kelahiran, kematian), ada isian terpisah untuk pelapor dan subjek.
3. **Isian.** Isian khusus jenis surat, dengan data penduduk terisi otomatis.
4. **Pratinjau.** Lembar surat penuh, lalu *Ajukan tanda tangan* atau *Simpan draf*.

Di layar ≥ 1280px, **pratinjau surat tampil di samping sejak langkah 2 dan ikut terisi saat operator mengetik**.

**3. Ruang kerja surat** (`/admin/surat/:id`)

```
┌───────────────────────────────┬──────────────────────────┐
│                               │ Cap status · kanal       │
│      LEMBAR SURAT             │ Riwayat (Timeline)       │
│      (pratinjau langsung)     │ Pemohon → profil         │
│                               │ Isian (bisa diubah saat  │
│                               │   status Diproses)       │
│                               │ Lampiran dari warga      │
│                               │ Catatan internal         │
│                               │ [aksi sesuai peran]      │
└───────────────────────────────┴──────────────────────────┘
```

**Aksi per status dan peran**

| Status | Peran | Aksi |
|---|---|---|
| Menunggu | Operator | Proses, Tolak |
| Diproses | Operator | Ajukan tanda tangan, Tolak, Simpan |
| Perlu TTD | Sekdes | Paraf, Kembalikan |
| Perlu TTD | Kades | Tanda tangani, Kembalikan |
| Selesai | Operator, Sekdes, Kades | Cetak, Unduh PDF, Kirim ke WhatsApp, Tandai sudah diambil |
| Selesai | Sekdes, Kades | Batalkan |

- **Unduh PDF** di tahap 1 membuka tampilan cetak; pengguna memilih "Simpan sebagai PDF" di browser.
- **Kirim ke WhatsApp** menampilkan pratinjau pesan berisi tautan unduh, lalu toast "Pesan terkirim ke 0812-••••-2231" (tiruan).

**4. Tanda tangan untuk Kades** (`/admin/surat/tanda-tangan`)

- Surat ditinjau satu per satu seperti membalik tumpukan berkas, dengan penunjuk "2 dari 3".
- **Tampilan:**
  - Lembar surat besar di tengah.
  - Ringkasan di sampingnya: pemohon, jenis, isian penting, catatan operator, dan thumbnail lampiran.
- **Aksi:**
  - *Tanda tangani*: dialog passphrase, dengan pilihan "Tanda tangani & lanjut".
  - *Kembalikan*: catatan wajib diisi.
  - *Lewati*.
- **Tampilan HP:** lembar surat selebar layar dengan bilah aksi menempel di bawah.
- **TTE disimulasikan.** Passphrase demo ada di halaman demo, dan tanda "Simulasi TTE" tampil di surat saat mode demo.

**5. Arsip** (`/admin/surat/arsip`)

- **Surat keluar:**
  - Kolom tabel: nomor, tanggal, jenis, untuk, penandatangan, kanal, status (Selesai/Dibatalkan).
  - Bisa difilter menurut jenis, bulan, dan penandatangan.
  - Bisa diunduh atau dicetak sebagai *Buku Agenda Surat Keluar*.
- **Surat masuk:**
  - Register sederhana: tanggal terima, nomor dan tanggal surat, pengirim, perihal, scan (unggah), disposisi (kepada, instruksi).
  - Formulir tambah memakai dialog.

**6. Jenis surat** (`/admin/surat/jenis`)

- Daftar 12 jenis surat, masing-masing dengan saklar aktif, izin online, dan jumlah pemakaian.
- **Halaman ubah** berisi:
  - nama dan kode klasifikasi
  - penandatangan dan kewajiban paraf
  - masa berlaku
  - syarat (daftar centang)
  - isian tambahan: label, jenis (teks/angka/tanggal/pilihan), dan wajib atau tidak
  - teks isi surat dengan sisipan sebagai *chip*, plus pratinjau langsung

  Belum ada perancang tata letak seret-tempel.

### 7.5 Lembar surat

- **Kertas dan huruf:**
  - Ukuran kertas A4 (bawaan) atau F4 (21,5 × 33 cm), diatur per desa.
  - Margin atas 2 cm, kiri 3 cm, kanan 2 cm, bawah 2 cm.
  - Huruf bawaan Tinos 12pt (setara Times New Roman), dengan pilihan Arimo (setara Arial).
- **Kop:**
  - Lambang di kiri. Di demo dipakai **lambang tiruan netral**, bukan lambang asli Kabupaten Pelalawan; desa mengunggah lambang aslinya di Pengaturan.
  - Teks rata tengah, tebal:
    - "PEMERINTAH KABUPATEN PELALAWAN" (14pt)
    - "KECAMATAN TELUK MERANTI" (14pt)
    - "DESA SUNGAI SIALANG" (16pt)
  - Baris alamat 10pt: "Jalan Lintas Teluk Meranti Km 4, Sungai Sialang, Kode Pos 28353 · pemdes@sungaisialang.desa.id".
  - Di bawahnya garis ganda (3pt + 1pt).
- **Judul** berupa nama surat, KAPITAL, tebal, bergaris bawah, rata tengah. Di bawahnya tertulis "Nomor: …".
- **Isi:**
  - Kalimat pembuka: "Yang bertanda tangan di bawah ini, Kepala Desa Sungai Sialang, Kecamatan Teluk Meranti, Kabupaten Pelalawan, menerangkan bahwa:".
  - Tabel label : nilai dengan kolom label 5 cm; nama ditulis KAPITAL tebal.
  - Paragraf isi sesuai template, lalu kalimat penutup.
- **Blok tanda tangan** (kanan, lebar 7 cm):
  - "Sungai Sialang, 24 September 2026".
  - Jabatan: "Kepala Desa Sungai Sialang", atau "a.n. Kepala Desa Sungai Sialang / Sekretaris Desa".
  - **Mode TTE:** QR 2,5 cm (sekaligus tautan verifikasi) + "Ditandatangani secara elektronik" + nama tebal bergaris bawah.
  - **Mode basah:** ruang kosong 3 cm + nama; QR verifikasi dipindah ke kaki surat.
- **Kaki surat** (8pt): "Keaslian surat dapat diperiksa di sungaisialang.desa.id/verifikasi dengan kode SS-7K3M-Q9TD", ditambah "Simulasi TTE — demo Sinfodes" saat mode demo.
- **Kode verifikasi** terdiri dari kode desa + 8 karakter acak dalam dua kelompok, mis. `SS-7K3M-Q9TD`. Hurufnya tanpa O/0/I/1 supaya tidak tertukar saat diketik, dan tidak mengandung data pribadi.

### 7.6 Verifikasi

Halaman publik `/desa/:slug/verifikasi` bisa dibuka dari QR (`?kode=`) atau dengan mengetik kode.

**Hasil pemeriksaan**

| Hasil | Tampilan |
|---|---|
| Asli | Cap ASLI (hijau), lalu: jenis surat, nomor, tanggal terbit, **nama disamarkan** ("S*** R*****": huruf pertama tiap kata), penandatangan (jabatan dan nama), dan status berlaku ("Berlaku sampai 24 Des 2026", "Kedaluwarsa", atau "Dibatalkan pada …" dalam warna merah) |
| Tidak ditemukan | "Kode tidak ditemukan. Periksa kembali, atau hubungi kantor desa." |
| Terlalu banyak percobaan | Kondisi `RATE_LIMITED` |

---

## 8. Modul lain (halaman utama)

Setiap modul punya halaman utama dengan data realistis dan semua kondisi tampilan (memuat, kosong, galat).

| Modul | Isi halaman utama | Yang bisa dilakukan di tahap 1 |
|---|---|---|
| **Pengaduan** | Kotak masuk tiket: nomor, judul, kategori (Infrastruktur, Pelayanan, Lingkungan, Keamanan, Bantuan sosial, Lainnya), dusun, masuk, status (Baru, Ditanggapi, Selesai), waktu tanggapan pertama | Detail berupa percakapan dengan warga (foto dan lokasi bila ada), **membalas**, dan **mengubah status**. Tersambung dua arah dengan layanan warga. |
| **Bantuan Sosial** | Program BLT Dana Desa 2026, PKH (data Kemensos), dan Bantuan Pangan, masing-masing dengan jumlah penerima dan jadwal penyaluran | Detail program: daftar penerima (KK, kepala keluarga, dusun, desil DTSEN, status per tahap), plus penanda "perlu ditinjau". Hanya lihat. |
| **Kesehatan** | 4 posyandu (satu per dusun), jadwal bulan ini, dan pemantauan balita: umur (bulan), ibu, posyandu, pengukuran terakhir (tanggal, berat, tinggi), status (Normal, Perlu pemantauan, Pendek/stunting) | Hanya lihat. Status sudah dihitung oleh pembangkit data. Hanya untuk peran yang berhak. |
| **Peta Desa** | Peta MapLibre bergaya kertas **tanpa label nama tempat**, supaya desa fiktif tidak menimpa nama desa sungguhan. Lapisan: batas 4 dusun, fasilitas umum (kantor desa, sekolah, masjid, posyandu, pustu), dan lokasi kegiatan pembangunan | Saklar lapisan, dan klik objek untuk membuka panel info. Dimuat hanya di halaman ini. |
| **Keuangan** | APBDes 2026: pendapatan per sumber, belanja per 5 bidang, dan pembiayaan, masing-masing dengan anggaran, realisasi, dan persentase; realisasi per bulan (LineChart); penanda "Disinkronkan dari Siskeudes · 20 Sep 2026" | Tombol *Sinkron Siskeudes* (tiruan, hanya Kaur Keuangan) |
| **Pembangunan** | Daftar kegiatan: nama, lokasi, anggaran, sumber dana, pelaksana (TPK), progres fisik dan keuangan (MiniBar), status (Perencanaan, Berjalan, Selesai) | Detail kegiatan dengan foto progres 0%, 50%, dan 100%, serta tautan ke peta |
| **Aset Desa** | Inventaris: kode aset, nama, kategori (Tanah, Bangunan, Kendaraan, Peralatan), tahun perolehan, asal, nilai perolehan, kondisi (Baik, Rusak ringan, Rusak berat), dan baris total nilai | Hanya lihat |
| **Lembaga Desa** | Perangkat desa (struktur), BPD, LPM, PKK, Karang Taruna, ketua RT/RW, kader posyandu, Linmas, dan pengurus BUMDes: nama, jabatan, masa bakti | Hanya lihat. Data yang sama dipakai halaman Profil di website. |
| **Buku Administrasi** | Semua buku wajib Permendagri 47/2016 (Lampiran B), dikelompokkan menjadi umum, penduduk, keuangan, dan pembangunan. Tiap buku menunjukkan sumbernya ("terisi otomatis dari Kependudukan" atau "diisi manual") dan waktu pembaruan terakhir | *Lihat* dan *Unduh* untuk buku yang sumbernya sudah ada. Contoh lengkapnya adalah **Buku Induk Penduduk** dengan kolom format resmi dan tata letak cetak. |
| **Website Desa** | Tab Artikel (judul, kategori, status Draf/Terbit, penulis, tanggal, dibaca), Pengumuman, Agenda, dan Galeri | Tab **Tampilan**: memilih aksen, motif, foto sampul, dan logo, dengan pratinjau langsung, lalu *Simpan* (`PUT /website/tampilan`). Editor artikel belum ada. |
| **Pengaturan** | Tab Identitas (nama desa, kode desa, alamat kantor, kode pos, surel, telepon/WA kantor, jam layanan, kepala desa aktif, unggah lambang) dengan pratinjau kop; tab Wilayah (istilah wilayah; pohon dusun → RW → RT beserta nama ketuanya); tab Pengguna; tab Penomoran (§7.2) | Formulir sederhana yang bisa disimpan. Di tab Pengguna: undang lewat dialog, ganti peran, dan nonaktifkan. |
| **Notifikasi** | Daftar notifikasi dengan status baca | Tandai sudah dibaca |

**Keterhubungan antar-modul yang wajib bekerja**

- Mutasi meninggal → penerima bansos ditandai "perlu ditinjau", dan kejadiannya masuk Buku Mutasi.
- Anggaran kegiatan pembangunan diambil dari APBDes.
- Buku Administrasi dibangun dari data modul sumbernya.
- Data Lembaga Desa dan Tampilan website dipakai di website publik.
- Balasan pengaduan tampil di layanan warga.

---

## 9. Website publik desa

**Gaya "warta desa."** Unsur Register (serif, garis, label kapital kecil) dipakai seperti koran desa, lalu dihangatkan dengan **warna aksen dan motif khas tiap desa**. Kepala halamannya berupa *nameplate*:

```
▲▼▲▼▲▼▲▼▲▼▲▼▲▼▲▼▲▼▲▼▲▼▲▼▲▼▲▼▲▼   ← pita motif, warna aksen desa
[lambang]  Sungai Sialang                      (Plex Serif, besar)
           DESA · KECAMATAN TELUK MERANTI · KABUPATEN PELALAWAN
           Rabu, 24 September 2026        Beranda Profil Kabar Transparansi …
════════════════════════════════════════════   ← garis ganda seperti kop
```

**Halaman-halaman**

1. **Beranda:**
   - berita utama dengan foto besar dan keterangan foto (bukan banner "Selamat datang")
   - **empat layanan cepat:** Ajukan surat online, Cek keaslian surat, Sampaikan pengaduan, Jadwal posyandu
   - kabar terbaru
   - pengumuman dan agenda
   - angka desa dalam kalimat
   - cuplikan APBDes (MiniBar pendapatan dan belanja)
   - potensi desa
2. **Profil:**
   - sejarah
   - visi dan misi
   - geografi: batas wilayah, luas, jarak ke ibu kota kecamatan dan kabupaten
   - peta
   - struktur pemerintahan dan lembaga (dari modul Lembaga Desa)
3. **Kabar:**
   - daftar berita dengan filter kategori
   - halaman artikel berteks nyaman dibaca di HP: teks 17px, maksimal sekitar 68 karakter per baris
4. **Transparansi:**
   - APBDes: pendapatan per sumber, belanja per bidang, realisasi
   - kegiatan pembangunan dengan progres dan foto
   - *Unduh dokumen APBDes*: tampilan cetak
5. **Statistik:** grafik penduduk, hanya agregat.
6. **Layanan:**
   - daftar jenis surat yang bisa diajukan online, lengkap dengan syarat dan perkiraan waktu
   - jam layanan kantor
   - tombol ke layanan mandiri
7. **Verifikasi surat** (§7.6).
8. **Potensi desa:**
   - madu sialang, kebun sawit dan karet, ikan selais/salai, wisata ombak Bono di Teluk Meranti
   - daftar UMKM, masing-masing dengan tombol WhatsApp penjual

**Kaki halaman.** Berisi identitas dan alamat kantor, jam layanan, kontak WhatsApp kantor, "Dikelola Pemerintah Desa Sungai Sialang · Didukung Sinfodes", dan tautan *Kredit foto*.

**Tampilan per desa** (disimpan di `/website/tampilan`)

- **Aksen** (semua lolos kontras dengan teks putih di atasnya, dan juga sebagai teks di atas lembar):

| Aksen | Hex | Teks putih di atasnya |
|---|---|---|
| Biru tinta (bawaan) | #1F4E79 | 8,66 |
| Hijau sawit | #2F5D3A | 7,64 |
| Teal sungai | #1E5F5A | 7,40 |
| Merah bata | #9A3B2A | 6,92 |
| Coklat tanah | #6B4A2E | 7,94 |
| Ungu songket | #5A3D6E | 9,02 |

- **Motif** tahap 1: *Pucuk rebung* (bawaan Sungai Sialang), *Siku keluang*, atau *Garis* (netral, untuk daerah mana pun). Pustaka motif bisa ditambah per daerah nanti.
- **Foto sampul dan logo.**
- **Template halaman** hanya satu untuk semua desa, supaya kualitas terjaga di ribuan desa.

**Foto** (K8). Sekitar 15 foto:

| Kebutuhan | Jumlah |
|---|---|
| Sampul (lanskap Sungai Kampar) | 1 |
| Kantor desa | 1 |
| Musyawarah di balai desa | 1 |
| Posyandu | 1 |
| Gotong royong | 1 |
| Penyaluran bantuan | 1 |
| Semenisasi jalan (progres 0/50/100%) | 3 |
| Lebah/madu sialang | 1 |
| Kebun sawit | 1 |
| Sadap karet | 1 |
| Ikan salai | 1 |
| Ombak Bono | 1 |
| Perahu di sungai | 1 |

- Disimpan di `public/demo/foto/` dengan ukuran versi web (lebar maksimal 1600px, dikompres).
- Kredit fotografer dan lisensinya dicatat di `public/demo/foto/KREDIT.md` dan ditampilkan di halaman Kredit foto.

**Teknis**

- Kode dipecah per rute; gambar memakai `srcset` dan dimuat bertahap (`loading="lazy"`).
- **Target JavaScript awal ≤ 200 KB gzip.**

**Catatan produksi.** Website publik perlu dirender di server (SSR/prerender) supaya pratinjau tautan WhatsApp (Open Graph) dan hasil Google tampil rapi. Desain dan komponennya tetap sama.

---

## 10. Layanan mandiri warga

**Pengguna dan perangkat.** Warga dewasa yang terdaftar di desa, hampir selalu memakai HP Android dengan sinyal pas-pasan. Dirancang untuk lebar 360px:

- teks dasar 16px, kontrol setinggi 48px
- kata-kata sederhana: nama jenis surat selalu ditulis lengkap, mis. "Surat Keterangan Tidak Mampu (SKTM)"
- **navigasi bawah berlabel teks:** Beranda · Ajukan · Riwayat · Akun
- kepala halaman berisi lambang dan nama desa

**Masuk**

- NIK (NikField) + PIN 6 angka (PinField).
- PIN didapat dari kantor desa, atau dikirim ke WhatsApp terdaftar lewat *Lupa PIN* (tiruan: tampil pesan konfirmasi).
- **Pengaman percobaan:** setelah 5 kali salah, muncul "Terlalu banyak percobaan — coba lagi 15 menit" (`RATE_LIMITED`).

**Layar**

1. **Beranda:**
   - permohonan yang sedang berjalan beserta posisinya, mis. "SKTM · menunggu tanda tangan Kepala Desa"
   - tombol *Ajukan surat* dan *Sampaikan pengaduan*
   - pengumuman desa
   - jadwal posyandu (hanya bila keluarganya punya balita)
   - bantuan yang diterima
2. **Ajukan surat:**
   1. Pilih jenis surat (hanya yang boleh online), beserta syarat dan perkiraan waktu.
   2. Pilih untuk siapa: diri sendiri atau anggota KK.
   3. Isi isian.
   4. Lampiran lewat kamera atau galeri. **Foto dikecilkan di HP sebelum dikirim:** kanvas, sisi terpanjang 1600px, JPEG kualitas 0,7.
   5. Periksa lalu kirim → nomor tiket + "Kami kabari lewat WhatsApp".
3. **Riwayat:** daftar dan detail permohonan, dengan Timeline yang sama seperti di admin.
   - **Selesai (TTE):** *Unduh PDF*, berupa tampilan cetak.
   - **Selesai (tanda tangan basah):** "Ambil di kantor desa, bawa KTP asli", lengkap dengan jam layanan.
   - **Ditolak:** alasannya + *Ajukan ulang*.
4. **Keluarga saya:**
   - Isi KK dengan **NIK disamarkan** (`•••• •••• •••• 8002`); ketuk untuk menampilkan.
   - *"Ada data yang salah? Laporkan"*: pilih field, tulis nilai yang benar, dan lampirkan foto dokumen (opsional). Laporan ini masuk ke Beranda operator dan menjadi banner di profil penduduk (§6.3).
5. **Pengaduan:**
   - Buat pengaduan: kategori, cerita, foto, lokasi (opsional).
   - Daftar pengaduan beserta balasan desa dalam bentuk percakapan; warga bisa membalas.
6. **Akun:** ganti PIN, ganti nomor WhatsApp, keluar.

**Tahan sinyal lemah**

- Isian formulir disimpan sebagai draf di `localStorage`.
- Pengiriman yang gagal tidak menghapus isian, dan tersedia tombol *Kirim ulang*.

**Catatan produksi.** Nanti dijadikan PWA agar bisa dipasang di layar utama HP.

---

## 11. Konsol Sinfodes

**Pengguna**

- **Tim Sinfodes:** melihat dan mengelola semua desa.
- **Pemantau wilayah:** mis. Dinas PMD Kabupaten Pelalawan atau camat. Otomatis dibatasi ke wilayahnya, dan **hanya melihat angka agregat per desa, tidak pernah data pribadi warga.**

**Tampilan.** KonsolShell dengan sidebar `tinta` dan logo Sinfodes di depan. Menunya: Ringkasan · Desa · Pemantauan (menu Desa tidak tampil untuk pemantau).

**Layar**

1. **Ringkasan.**
   - Bagian **Perlu perhatian** di atas, mis.:
     - "3 desa tidak aktif 14 hari"
     - "2 desa berhenti di langkah impor penduduk"
     - "1 tagihan lewat jatuh tempo"
   - Di bawahnya angka platform dalam kalimat: desa aktif, desa dalam persiapan, surat terbit minggu ini.
2. **Daftar desa.**
   - Kolom tabel:
     - desa
     - kecamatan dan kabupaten
     - status (Uji coba, Persiapan, Aktif, Ditangguhkan)
     - paket (Dasar, Lengkap)
     - pengguna aktif
     - aktivitas terakhir
     - kelengkapan data penduduk (%)
   - Bisa difilter menurut provinsi, kabupaten, status, dan paket.
3. **Detail desa.** Terdiri dari empat tab:
   - **Ringkasan:** identitas dan kontak (Kades, operator).
   - **Persiapan:** daftar yang sama dengan §5.3.
   - **Penggunaan:** surat per bulan (BarChart) dan login per minggu.
   - **Langganan:** paket, masa aktif, dan daftar tagihan (dummy; tanpa pembayaran).
4. **Tambah desa.**
   - Isian: nama desa, kode wilayah Kemendagri (pilih provinsi → kabupaten → kecamatan, lalu kode desa), paket, dan email admin pertama.
   - Setelah disimpan: tampil konfirmasi "Undangan terkirim" (tiruan), dan desa masuk berstatus Persiapan.
5. **Pemantauan wilayah.**
   - Tabel per kecamatan yang bisa dibuka menjadi per desa.
   - Isinya: status adopsi, surat terbit bulan ini, median waktu layanan surat, kelengkapan data penduduk, median waktu tanggapan pertama pengaduan, dan realisasi APBDes (%).
   - Tersedia *Unduh CSV*.

**Definisi angka**

| Angka | Definisi |
|---|---|
| Kelengkapan data | Persentase penduduk hidup yang field wajibnya terisi (lihat preset *Data belum lengkap*) |
| Waktu layanan | Median jam dari permohonan masuk sampai Selesai |
| Waktu tanggapan | Median jam sampai balasan pertama |

---

## 12. Data dummy

Semua data dibangkitkan secara **deterministik** dari seed tetap (PRNG sederhana di `mocks/`). Setiap kali seed atau struktur berubah, `versiData` dinaikkan, dan data lama di IndexedDB otomatis diganti.

### 12.1 Identitas desa demo

| Isian | Nilai |
|---|---|
| Nama / slug | Desa Sungai Sialang / `sungai-sialang` |
| Kode desa | 14.05.09.2009 (fiktif) |
| Kecamatan / Kabupaten / Provinsi | Teluk Meranti (14.05.09) / Pelalawan (14.05) / Riau (14) |
| Kode pos | 28353 |
| Alamat kantor | Jalan Lintas Teluk Meranti Km 4, Sungai Sialang |
| Surel | pemdes@sungaisialang.desa.id |
| Jam layanan | Senin–Kamis 08.00–15.00; Jumat 08.00–11.30 |
| Luas | 48,6 km² |
| Batas wilayah | Utara: Sungai Kampar; Selatan: kawasan hutan tanaman; Timur: Desa Kuala Rengas (fiktif); Barat: Desa Teluk Pauh (fiktif) |

**Perangkat desa (fiktif)**

| Jabatan | Nama |
|---|---|
| Kepala Desa | H. Muhammad Nasir |
| Sekretaris Desa | Hendri Saputra |
| Kaur Keuangan | Nurhayati |
| Kaur Tata Usaha & Umum | Syafrizal |
| Kaur Perencanaan | Wahyu Hidayat |
| Kasi Pemerintahan | Zulkarnain |
| Kasi Kesejahteraan | Wan Aisyah |
| Kasi Pelayanan | Dedi Kurniawan |
| Kepala Dusun I–IV | Amran; Sukardi; Ramli; Tigor Siregar |
| Operator desa | Rosmiati |

### 12.2 Wilayah

| Dusun | RW | RT | Posyandu |
|---|---|---|---|
| Dusun I Kampung Tengah | 001–002 | 001–005 | Melati |
| Dusun II Sialang Jaya | 003–004 | 006–010 | Mawar |
| Dusun III Teluk Rengas | 005–006 | 011–015 | Kenanga |
| Dusun IV Sungai Lamo | 007–008 | 016–020 | Anggrek |

### 12.3 Penduduk

**Jumlah tepat:** 2.812 jiwa (1.431 laki-laki, 1.381 perempuan) dalam 806 KK. Rata-rata ukuran keluarga sekitar 3,5.

**Umur (persen per kelompok 5 tahun)**

| Umur | % | Umur | % |
|---|---|---|---|
| 0–4 | 7,5 | 40–44 | 7,5 |
| 5–9 | 9,5 | 45–49 | 7 |
| 10–14 | 9,5 | 50–54 | 6 |
| 15–19 | 9 | 55–59 | 5 |
| 20–24 | 7 | 60–64 | 4 |
| 25–29 | 7 | 65–69 | 2,5 |
| 30–34 | 7,5 | 70–74 | 1,5 |
| 35–39 | 8 | 75+ | 1,5 |

Lekukan di usia 20–29 menggambarkan penduduk usia muda yang merantau.

**Komposisi**

- **Suku** (menentukan pola nama dan agama): Melayu Riau sekitar 65%, Jawa 20%, Minang 8%, Batak 5%, lainnya 2%.
  - Nama disusun per suku dan per generasi. Contoh orang tua: "Siti Aminah", "Muhammad Yusuf", "Wan Salmah", "Sutrisno", "Suparmi". Contoh anak muda: "Rizky Pratama", "Aulia Putri", "Muhammad Fadil".
  - Marga Batak: Simanjuntak, Siregar, Nainggolan, Sitorus, Hutapea.
- **Agama:** Islam sekitar 93%, Kristen 5%, Katolik 1,5%, lainnya 0,5%.
- **Pekerjaan (umur ≥ 15):**

| Pekerjaan | % |
|---|---|
| Petani/Pekebun | 28 |
| Mengurus Rumah Tangga | 17 |
| Pelajar/Mahasiswa | 14 |
| Wiraswasta | 8 |
| Karyawan Swasta | 8 |
| Nelayan/Perikanan | 6 |
| Buruh Harian Lepas | 6 |
| Belum/Tidak Bekerja | 6 |
| Pedagang | 3 |
| Guru/PNS | 2 |
| Lainnya | 2 |

- **Pendidikan dan status perkawinan** mengikuti umur; generasi tua cenderung berpendidikan lebih rendah.
- **KTP-el belum rekam:** sekitar 6% dari yang wajib.
- **Akta lahir:** sekitar 92% anak memilikinya.
- **Data belum lengkap:** sekitar 12 penduduk (§5.3).

### 12.4 Aturan konsistensi (diuji otomatis)

- Setiap penduduk berada di tepat satu KK.
- Setiap KK punya tepat satu kepala keluarga.
- Anak minimal 15 tahun lebih muda dari orang tuanya.
- Pasangan suami-istri sama-sama berstatus kawin.
- Tanggal lahir di NIK sesuai dengan `tanggalLahir`; untuk perempuan, tanggalnya +40.
- NIK dan nomor KK unik.
- Alamat anggota sama dengan alamat KK.
- Total jiwa, jumlah laki-laki/perempuan, dan jumlah KK tepat sesuai §12.3.
- Seed yang sama menghasilkan data yang identik.

### 12.5 NIK dan nomor KK dummy

- **Penduduk asli:** kode wilayah `140509`.
- **Pendatang dewasa:** kode kabupaten asal yang nyata dengan nomor kecamatan 01–20. Kabupaten asal dipilih dari daftar berikut:
  - Klaten `33.10` dan Boyolali `33.09` (Jawa Tengah)
  - Agam `13.06` (Sumatera Barat)
  - Tapanuli Utara `12.02` dan Toba `12.12` (Sumatera Utara)
  - Kampar `14.01` (Riau)

  Kode-kode ini dicek ulang terhadap Permendagri kode wilayah saat implementasi, lalu dimasukkan ke tabel kode wilayah minimal (§4.5).
- **Nomor urut 8001–9999**, unik per kombinasi (wilayah, tanggal lahir). Nomor setinggi ini praktis tidak pernah dipakai NIK asli, jadi tidak mungkin sama dengan NIK orang sungguhan.
- **Nomor KK:** `140509` + tanggal terbit (DDMMYY) + nomor urut 8001–9999.
- **Bayi yang lahir kurang dari 3 bulan lalu:** NIK `null`.

### 12.6 Data modul lain

**Surat**

- **Volume:** 12 bulan terakhir, sekitar 65 per bulan.
- **Sebaran jenis:**

| Jenis | % |
|---|---|
| Domisili | 22 |
| SKTM | 18 |
| SKU | 15 |
| Pengantar SKCK | 12 |
| Penghasilan | 8 |
| Kelahiran | 6 |
| Belum menikah | 5 |
| Kematian | 3 |
| Pengantar pindah | 3 |
| Kehilangan | 3 |
| Pengantar nikah | 3 |
| Beda nama | 2 |

- **Antrean saat ini:** Menunggu 7, Diproses 5, Perlu TTD 3.
  - Dari yang Perlu TTD, 1 masih di tahap paraf Sekdes.
  - Dari yang Diproses, 1 berstatus dikembalikan Kades (SKU · Zulkifli).
  - Siti Rahmah punya satu permohonan Surat Keterangan Domisili berstatus Diproses, dan **tidak punya SKTM aktif**, supaya alur demo 1 (§13.5) dimulai bersih.
- **Surat terbit bulan berjalan:** sekitar 64, dengan median waktu selesai sekitar 1 hari.

**Mutasi.** Riwayat 24 bulan dengan sekitar 45 kelahiran per tahun. Bulan berjalan: 3 lahir, 1 meninggal, 2 datang, 4 pindah. Salah satu kelahiran bulan ini baru dilaporkan warga dan belum dicatat (§5.3).

**Pengaduan.** 30 pengaduan dalam 6 bulan: Baru 2, Ditanggapi 3, Selesai 25. Topiknya realistis, mis. jalan berlubang di Dusun III, lampu jalan mati, air pasang masuk parit, sampah, pelayanan lambat, BLT belum cair.

**APBDes 2026**

| Pos | Anggaran |
|---|---|
| **Pendapatan** | **Rp1.826.650.000** |
| Dana Desa | Rp1.018.450.000 |
| Alokasi Dana Desa | Rp624.300.000 |
| Bagi hasil pajak dan retribusi | Rp48.700.000 |
| Bantuan keuangan Provinsi Riau | Rp100.000.000 |
| PADes (BUMDes, sewa tanah kas desa) | Rp35.200.000 |
| **Belanja** | **Rp1.866.650.000** |
| Penyelenggaraan Pemerintahan Desa | Rp612.400.000 |
| Pelaksanaan Pembangunan Desa | Rp748.900.000 |
| Pembinaan Kemasyarakatan | Rp132.500.000 |
| Pemberdayaan Masyarakat | Rp214.350.000 |
| Penanggulangan Bencana, Darurat dan Mendesak (termasuk BLT-DD) | Rp158.500.000 |
| **Pembiayaan netto** | **Rp40.000.000** |
| Penerimaan: SiLPA 2025 | Rp65.000.000 |
| Pengeluaran: penyertaan modal BUMDes | Rp25.000.000 |

- Pemeriksaan keseimbangan: pendapatan + pembiayaan netto = belanja.
- Realisasi sampai hari demo: pendapatan sekitar 72%, belanja sekitar 63%, dengan deret realisasi per bulan.

**Pembangunan 2026** (total Rp721.900.000, di dalam anggaran bidang Pelaksanaan Pembangunan)

| Kegiatan | Anggaran | Sumber | Fisik | Status |
|---|---|---|---|---|
| Semenisasi jalan lingkungan Dusun III (450 m) | Rp245.000.000 | DD | 70% | Berjalan |
| Drainase RT 006–007 (320 m) | Rp98.000.000 | DD | 100% | Selesai |
| Rehabilitasi Posyandu Kenanga | Rp58.500.000 | ADD | 100% | Selesai |
| Sumur bor air bersih Dusun IV (2 unit) | Rp64.000.000 | DD | 40% | Berjalan |
| Titian kayu penghubung Dusun II–IV | Rp96.400.000 | Bantuan Provinsi | 15% | Berjalan |
| Lampu jalan tenaga surya (24 titik) | Rp72.000.000 | DD | 100% | Selesai |
| Pelantar perahu nelayan | Rp88.000.000 | DD | 0% | Perencanaan |

**Bantuan sosial**

- **BLT Dana Desa 2026:** 38 KPM × Rp300.000 per bulan, disalurkan dalam 4 tahap (per 3 bulan). Tahap III dijadwalkan 30 September.
- **PKH:** 64 KPM.
- **Bantuan Pangan (beras 10 kg):** 112 KPM.
- Desil DTSEN penerima: 1–4.

**Kesehatan.** 4 posyandu dengan sekitar 211 balita. Pengukuran bulanan selama 12 bulan terakhir. Status: sekitar 85% Normal; sisanya Perlu pemantauan atau Pendek (stunting).

**Aset.** Sekitar 40 butir, antara lain:

- **Tanah:** tanah kas desa 2 bidang (kebun sawit 2,5 ha dan lahan kantor 1.200 m²).
- **Bangunan:** kantor desa, balai desa, 4 bangunan posyandu.
- **Kendaraan:** ambulans desa, 2 motor dinas, perahu dinas.
- **Peralatan:** genset, 4 laptop, 3 printer, proyektor, tenda, 200 kursi.

**Lembaga**

- Perangkat desa: 13 orang + operator.
- BPD: 7 orang.
- LPM: 5; PKK: 8; Karang Taruna: 6.
- Ketua RT: 20; ketua RW: 8.
- Kader posyandu: 16 (4 per posyandu).
- Linmas: 10.
- Pengurus BUMDes "Sialang Makmur": 4.

**Website**

- **12 artikel** (150–300 kata), dengan tanggal relatif tersebar dalam 3 bulan terakhir:
  1. Musyawarah Desa Penetapan Penerima BLT Dana Desa 2026
  2. Semenisasi Jalan Dusun III Capai 70 Persen
  3. Tradisi Menumbai: Panen Madu Sialang Kembali Digelar
  4. Posyandu Kenanga Selesai Direhab, Layanan Balita Kembali Normal
  5. Gotong Royong Bersihkan Parit Jelang Musim Pasang
  6. Penyaluran BLT Tahap III Dijadwalkan 30 September
  7. Kelas Ibu Balita: Cegah Stunting dari Dapur Sendiri
  8. BUMDes Sialang Makmur Mulai Pasarkan Ikan Salai Selais
  9. 24 Lampu Jalan Tenaga Surya Kini Terangi Dusun I dan II
  10. Layanan Surat Kini Bisa Diajukan dari HP
  11. Festival Bono Teluk Meranti, Warga Siapkan Homestay
  12. Hasil Musrenbangdes: 5 Usulan Prioritas untuk 2027
- Ditambah 4 pengumuman, 5 agenda, 6 potensi, dan 5 UMKM.

### 12.7 Tanggal relatif, penyimpanan, dan reset

**Tanggal relatif**

- Semua waktu dibangkitkan sebagai selisih dari **tanggal acuan**, yaitu saat demo pertama kali dibuka. Tanggal acuan ikut disimpan.
- Kejadian "hari ini" hanya ditempatkan di rentang 07.30 sampai 5 menit sebelum jam sekarang. Kalau demo dibuka sebelum 08.00, Buku hari ini wajar masih sedikit.

**Penyimpanan**

- Basis data tiruan disimpan utuh ke IndexedDB (`idb-keyval`) setelah setiap perubahan (ditunda sekitar 300 ms).

**Reset data**

- Membangkitkan ulang data dari seed dengan tanggal acuan = sekarang.

### 12.8 Desa lain

- **Konsol:** 40 desa fiktif.
  - 32 desa tersebar di 12 kecamatan Pelalawan. Nama-namanya dicek otomatis agar **tidak sama dengan 104 desa asli Pelalawan** (Lampiran A).
  - 8 desa di kabupaten lain di Riau: Kampar (14.01), Siak (14.08), Indragiri Hilir (14.04), Kuantan Singingi (14.09).
  - Status: Aktif 26, Persiapan 7, Uji coba 5, Ditangguhkan 2.
  - Sungai Sialang termasuk di dalamnya, dan angkanya dihitung dari data panel desanya.
- **Desa kedua untuk demo persiapan:** Desa Tanjung Lamo (fiktif), Kec. Kuala Kampar. Baru mendaftar, datanya kosong. Dipakai untuk menunjukkan daftar persiapan dan kondisi kosong.

### 12.9 Akun demo (ditampilkan di halaman demo)

| Bagian | Akun |
|---|---|
| Admin Sungai Sialang | Rosmiati (Operator), Hendri Saputra (Sekretaris Desa), H. Muhammad Nasir (Kepala Desa), Nurhayati (Kaur Keuangan), Sukardi (Kepala Dusun II) |
| Admin Tanjung Lamo | Operator (desa baru) |
| Warga | Siti Rahmah, NIK 1405095203918002, PIN 246810 (punya balita, penerima BLT, satu permohonan Domisili berstatus Diproses); Zulkifli, NIK 1405091706848005, PIN 135790 (pemilik usaha; SKU-nya sedang dikembalikan Kades) |
| Konsol | Dina (Tim Sinfodes); Dinas PMD Kabupaten Pelalawan (pemantau) |
| TTE demo | passphrase `sialang2026` |

---

## 13. Kualitas dan verifikasi

### 13.1 Uji otomatis (Vitest)

**Aturan domain**

- **NIK:** panjang, tanggal, jenis kelamin, dan kode wilayah dikenal/tidak dikenal.
- **Nomor KK.**
- **Penomoran surat:**
  - tidak ada nomor yang terlewat
  - nomor diberikan saat tanda tangan
  - urutan mulai ulang tiap tahun
  - pembatalan tidak memakai ulang nomor
- **Format dan perhitungan:** terbilang, format tanggal/uang/angka, dan umur.

**Lainnya**

- **Data dummy:** semua aturan di §12.4.
- **Kontrak API:** setiap handler MSW mengembalikan data yang lolos skema Zod; paginasi dan filter dasar berjalan.
- **Perpindahan status surat per peran:** semua baris tabel §7.1 dan penolakan aksi oleh peran yang tidak berhak.
- **Komponen penting:** NikField, DataTable (urut dan paginasi), dan Stepper buat surat.

### 13.2 Pemeriksaan tampilan

Setiap layar diperiksa di panel browser:

| Bagian | Ukuran layar |
|---|---|
| Admin | 1366×768 (juga 1024 dan 390 untuk pengecekan responsif) |
| Warga dan website | 360–390px (website juga di 1280) |

Pada setiap ukuran diperiksa kondisi memuat, kosong, galat (lewat toolbar demo), dan hasil filter kosong.

### 13.3 Aksesibilitas

- Alur utama dicoba memakai keyboard saja.
- Semua kolom isian punya label.
- Cincin fokus terlihat di semua latar.
- Grafik punya tampilan tabel.

### 13.4 Anggaran performa dan dukungan browser

- **JavaScript awal (gzip):** publik dan warga ≤ 200 KB; admin ≤ 350 KB. Modul berat (peta, grafik, surat) dimuat saat dibutuhkan.
- **Browser:** Chrome dan Edge (2 versi terakhir), Chrome Android (2 versi terakhir), Safari iOS 16+.

### 13.5 Kriteria selesai tahap 1

**Setiap tahap pengerjaan** dianggap selesai bila `pnpm build`, pengecekan tipe, `pnpm lint`, dan `pnpm test` lolos tanpa galat.

**Tahap 1 secara keseluruhan** selesai bila **tiga alur demo ini berjalan utuh**:

1. **SKTM dari HP sampai verifikasi QR.**
   1. Siti Rahmah mengajukan SKTM dari layanan warga.
   2. Operator memprosesnya, lalu Sekdes memaraf.
   3. Kades menandatangani dari tampilan HP.
   4. Siti melihat status Selesai dan membuka suratnya.
   5. Kode/QR surat lolos di halaman verifikasi website desa.
2. **Mencatat kelahiran.**
   1. Operator mencatat kelahiran anak Siti Rahmah.
   2. Jumlah penduduk dan anggota KK bertambah, dengan bayi berstatus BELUM ADA NIK.
   3. Statistik, Buku Mutasi, Buku hari ini, dan halaman statistik website ikut berubah.
3. **Pemantauan kabupaten.** Pemantau Kabupaten Pelalawan membuka Pemantauan wilayah dan melihat Sungai Sialang dengan angka yang sesuai dengan data panel desanya.

---

## 14. Urutan pengerjaan dan titik periksa

1. **Fondasi**
   - Tooling: Tailwind, router, query, MSW, dan Vitest.
   - Token dan komponen dasar Register.
   - Aturan domain dan ujinya.
   - Pembangkit data dummy dan API tiruan.
   - Halaman demo dan toolbar demo.
2. **Panel admin inti**
   - AdminShell, Beranda, dan pencarian cepat.
   - Kependudukan (§6).
   - Layanan Surat (§7).
   - **Titik periksa: pengguna mereview di layar sungguhan sebelum lanjut.**
3. **Modul admin lainnya** (§8).
4. **Layanan mandiri warga** (§10).
5. **Website publik** (§9). Termasuk kurasi foto: daftar foto disetujui pengguna sebelum diunduh.
6. **Konsol Sinfodes** (§11), lalu uji tiga alur demo (§13.5).

Setiap tahap yang butuh library baru diawali daftar perintah `pnpm add` untuk dijalankan pengguna.

---

## 15. Catatan untuk tahap produksi (di luar tahap 1)

- **Backend:** TypeScript + PostgreSQL (K6). Folder `src/domain/` dipindah menjadi paket bersama dalam monorepo pnpm.
- **Keamanan data dan UU PDP:**
  - server di Indonesia
  - log audit akses dan perubahan data pribadi
  - pembatasan percobaan login
  - enkripsi data sensitif
  - penilaian dampak pelindungan data
- **Website publik:** dirender di server (SSR/prerender) dengan Open Graph; mendukung domain `.desa.id` per desa.
- **Layanan warga:** PWA; OTP/PIN lewat WhatsApp Business API.
- **Integrasi:**
  - TTE BSrE
  - verifikasi NIK Dukcapil (butuh perjanjian kerja sama)
  - sinkron Siskeudes
  - DTSEN untuk bansos
- **Konsol:** akses dukungan ke data desa dengan persetujuan desa dan log audit; pembayaran langganan; pustaka template surat untuk semua desa.
- **Editor artikel lengkap** dan pustaka motif daerah yang lebih luas.

---

## 16. Hal yang belum diputuskan (tidak menghalangi tahap 1)

| Hal | Perilaku bawaan di tahap 1 |
|---|---|
| Versi vektor bersih logo Sinfodes, dari desainer atau digambar ulang | Memakai logo hasil tracing yang latar putihnya sudah dibuang. Varian logo (horizontal dengan tulisan "sinfodes", monokrom) dibuat setelah versi vektor tersedia. |
| Nama dan harga paket langganan | Memakai "Dasar" dan "Lengkap" tanpa harga di tampilan publik; harga hanya muncul di tagihan dummy Konsol. |

---

## Lampiran A — Kecamatan di Kabupaten Pelalawan

Sumber: Permendagri 137/2017 jo. 72/2019, melalui Wikipedia. Total 12 kecamatan, 14 kelurahan, dan 104 desa.

| Kode | Kecamatan | Desa (jumlah) |
|---|---|---|
| 14.05.01 | Ukui | 11 |
| 14.05.02 | Pangkalan Kerinci (ibu kota kabupaten) | 4 |
| 14.05.03 | Pangkalan Kuras | 16 |
| 14.05.04 | Pangkalan Lesung | 9 |
| 14.05.05 | Langgam | 7 |
| 14.05.06 | Pelalawan | 8 |
| 14.05.07 | Kerumutan | 9 |
| 14.05.08 | Bunut | 9 |
| 14.05.09 | Teluk Meranti (kode pos 28353) | 8 |
| 14.05.10 | Kuala Kampar | 9 |
| 14.05.11 | Bandar Sei Kijang | 4 |
| 14.05.12 | Bandar Petalangan | 10 |

Daftar nama 104 desa asli disimpan di `src/mocks/data/desa-asli-pelalawan.ts`. Daftar ini hanya dipakai untuk memastikan nama desa fiktif tidak bentrok.

## Lampiran B — Buku administrasi desa (Permendagri 47/2016)

| Kelompok | Buku | Sumber di Sinfodes tahap 1 |
|---|---|---|
| Umum | Peraturan di Desa | diisi manual |
| Umum | Keputusan Kepala Desa | diisi manual |
| Umum | Inventaris dan Kekayaan Desa | Aset Desa |
| Umum | Aparat Pemerintah Desa | Lembaga Desa |
| Umum | Tanah Kas Desa | Aset Desa (kategori tanah) |
| Umum | Tanah di Desa | diisi manual |
| Umum | Agenda | Layanan Surat (surat keluar dan masuk) |
| Umum | Ekspedisi | diisi manual |
| Umum | Lembaran Desa dan Berita Desa | diisi manual |
| Penduduk | Induk Penduduk | Kependudukan (**contoh lengkap**) |
| Penduduk | Mutasi Penduduk Desa | Mutasi |
| Penduduk | Rekapitulasi Jumlah Penduduk | Statistik |
| Penduduk | Penduduk Sementara | Kependudukan (status Sementara) |
| Penduduk | KTP dan Kartu Keluarga | Kependudukan dan Keluarga |
| Keuangan | APB Desa | Keuangan |
| Keuangan | Rencana Anggaran Biaya | Pembangunan |
| Keuangan | Kas Pembantu Kegiatan | diisi manual |
| Keuangan | Kas Umum | diisi manual |
| Keuangan | Kas Pembantu | diisi manual |
| Keuangan | Bank Desa | diisi manual |
| Pembangunan | Rencana Kerja Pembangunan | Pembangunan |
| Pembangunan | Kegiatan Pembangunan | Pembangunan |
| Pembangunan | Inventaris Hasil-hasil Pembangunan | Pembangunan (status Selesai) |
| Pembangunan | Kader Pemberdayaan Masyarakat | Lembaga Desa |

- Buku berstatus "diisi manual" tampil di daftar dengan keterangan tersebut, tanpa tombol *Lihat*.
- Kolom tiap buku mengikuti format lampiran Permendagri 47/2016 dan diperiksa ulang saat implementasi.

## Lampiran C — Enumerasi data kependudukan

| Enumerasi | Nilai |
|---|---|
| Jenis kelamin | Laki-laki, Perempuan |
| Agama | Islam, Kristen, Katolik, Hindu, Buddha, Khonghucu, Kepercayaan terhadap Tuhan YME |
| Pendidikan (dalam KK) | Tidak/Belum Sekolah; Belum Tamat SD/Sederajat; Tamat SD/Sederajat; SLTP/Sederajat; SLTA/Sederajat; Diploma I/II; Akademi/Diploma III/Sarjana Muda; Diploma IV/Strata I; Strata II; Strata III |
| Pekerjaan (subset daftar Dukcapil) | Belum/Tidak Bekerja; Mengurus Rumah Tangga; Pelajar/Mahasiswa; Pensiunan; Pegawai Negeri Sipil; Tentara Nasional Indonesia; Kepolisian RI; Perdagangan; Petani/Pekebun; Peternak; Nelayan/Perikanan; Industri; Konstruksi; Transportasi; Karyawan Swasta; Karyawan BUMN; Karyawan Honorer; Buruh Harian Lepas; Buruh Tani/Perkebunan; Tukang Kayu; Tukang Jahit; Guru; Bidan; Perawat; Perangkat Desa; Kepala Desa; Pedagang; Sopir; Wiraswasta; Lainnya |
| Status perkawinan | Belum Kawin, Kawin Tercatat, Kawin Belum Tercatat, Cerai Hidup, Cerai Mati |
| Hubungan dalam keluarga | Kepala Keluarga, Suami, Istri, Anak, Menantu, Cucu, Orang Tua, Mertua, Famili Lain, Pembantu, Lainnya |
| Golongan darah | A, B, AB, O, A+, A−, B+, B−, AB+, AB−, O+, O−, Tidak Tahu |
| Kewarganegaraan | WNI, WNA |
| Status dasar | Hidup, Meninggal, Pindah, Hilang |
| Status penduduk | Tetap, Sementara |
| KTP-el | Sudah rekam, Belum rekam, Belum wajib |
| Tempat dilahirkan | RS/RB, Puskesmas, Polindes, Rumah, Lainnya |
| Jenis kelahiran | Tunggal, Kembar 2, Kembar 3, Kembar 4, Lainnya |
| Penolong kelahiran | Dokter, Bidan/Perawat, Dukun, Lainnya |
| Sebab kematian | Sakit biasa/tua, Wabah penyakit, Kecelakaan, Kriminalitas, Bunuh diri, Lainnya |
| Yang menerangkan kematian | Dokter, Tenaga kesehatan, Kepolisian, Lainnya |
| Alasan pindah | Pekerjaan, Pendidikan, Keamanan, Kesehatan, Perumahan, Keluarga, Lainnya |
