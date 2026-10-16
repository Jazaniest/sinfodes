import type { PeranKonsol } from '@/domain/konsol/schema'
import type { Peran } from '@/domain/pengguna/schema'

/** Akun yang dipakai satu tombol skenario; `publik` membuka website desa tanpa masuk. */
export type MasukSkenario =
  | { bagian: 'admin'; peran: Peran }
  | { bagian: 'warga'; pendudukId: string }
  | { bagian: 'konsol'; peran: PeranKonsol }
  | { bagian: 'publik' }
export type TombolSkenario = { label: string; masuk: MasukSkenario; ke: string }
export type LangkahSkenario = { teks: string; tombol: readonly TombolSkenario[] }
export type Skenario = { id: string; judul: string; ringkas: string; langkah: readonly LangkahSkenario[] }

const SITI: MasukSkenario = { bagian: 'warga', pendudukId: 'pdk_siti_rahmah' }
const OPERATOR: MasukSkenario = { bagian: 'admin', peran: 'operator' }
const PUBLIK: MasukSkenario = { bagian: 'publik' }

/** Tiga skenario terpandu = tiga alur demo kriteria selesai tahap 1 (SPEC §3.6, §13.5). */
export const SKENARIO_DEMO: readonly Skenario[] = [
  {
    id: 'sktm',
    judul: 'SKTM dari HP sampai verifikasi QR',
    ringkas: 'Siti Rahmah mengajukan Surat Keterangan Tidak Mampu dari HP. Surat diproses, diparaf, ditandatangani, lalu dicek keasliannya.',
    langkah: [
      { teks: 'Siti Rahmah mengajukan SKTM dari layanan warga.', tombol: [{ label: 'Masuk sebagai Siti', masuk: SITI, ke: '/warga/ajukan' }] },
      {
        teks: 'Operator memprosesnya, lalu Sekretaris Desa memaraf.',
        tombol: [
          { label: 'Operator: antrean surat', masuk: OPERATOR, ke: '/admin/surat' },
          // Paraf dilakukan di ruang kerja surat, lewat daftar Perlu TTD; tumpukan tanda tangan hanya untuk penanda tangan.
          { label: 'Sekdes: paraf', masuk: { bagian: 'admin', peran: 'sekdes' }, ke: '/admin/surat?status=perlu-ttd' },
        ],
      },
      {
        teks: 'Kepala Desa menandatangani dari tampilan HP (perkecil jendela atau buka di HP). Passphrase: sialang2026.',
        tombol: [{ label: 'Kades: tanda tangan', masuk: { bagian: 'admin', peran: 'kades' }, ke: '/admin/surat/tanda-tangan' }],
      },
      { teks: 'Siti melihat status Selesai dan membuka suratnya.', tombol: [{ label: 'Riwayat Siti', masuk: SITI, ke: '/warga/riwayat' }] },
      {
        teks: 'Kode atau QR surat lolos di halaman verifikasi website desa.',
        tombol: [{ label: 'Cek keaslian surat', masuk: PUBLIK, ke: '/desa/sungaisialang/verifikasi' }],
      },
    ],
  },
  {
    id: 'kelahiran',
    judul: 'Mencatat kelahiran',
    ringkas: 'Operator mencatat kelahiran anak Siti Rahmah. Angka penduduk di panel dan di website desa ikut berubah.',
    langkah: [
      { teks: 'Operator mencatat kelahiran anak Siti Rahmah.', tombol: [{ label: 'Catat kelahiran', masuk: OPERATOR, ke: '/admin/kependudukan/mutasi/lahir' }] },
      {
        teks: 'Jumlah penduduk dan anggota KK bertambah, dan bayi berstatus BELUM ADA NIK.',
        tombol: [{ label: 'KK Syahrial', masuk: OPERATOR, ke: '/admin/kependudukan/keluarga/kk_syahrial' }],
      },
      {
        teks: 'Statistik, Buku Mutasi, Buku hari ini, dan halaman statistik website ikut berubah.',
        tombol: [
          { label: 'Statistik', masuk: OPERATOR, ke: '/admin/kependudukan/statistik' },
          { label: 'Buku Mutasi', masuk: OPERATOR, ke: '/admin/buku/mutasi-penduduk' },
          { label: 'Buku hari ini', masuk: OPERATOR, ke: '/admin' },
          { label: 'Statistik website', masuk: PUBLIK, ke: '/desa/sungaisialang/statistik' },
        ],
      },
    ],
  },
  {
    id: 'pemantauan',
    judul: 'Pemantauan kabupaten',
    ringkas: 'Dinas PMD Kabupaten Pelalawan melihat Sungai Sialang di Pemantauan wilayah, dengan angka yang sama dengan panel desanya.',
    langkah: [
      {
        teks: 'Pemantau Kabupaten Pelalawan membuka Pemantauan wilayah, lalu membuka Kecamatan Teluk Meranti.',
        tombol: [{ label: 'Masuk sebagai pemantau', masuk: { bagian: 'konsol', peran: 'pemantau' }, ke: '/konsol/pemantauan' }],
      },
      {
        teks: 'Bandingkan dengan panel Sungai Sialang: data belum lengkap dan realisasi APBDes.',
        tombol: [
          { label: 'Data belum lengkap', masuk: OPERATOR, ke: '/admin/kependudukan/penduduk?preset=data-belum-lengkap' },
          { label: 'Keuangan', masuk: OPERATOR, ke: '/admin/keuangan' },
        ],
      },
    ],
  },
]
