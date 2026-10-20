import { keAlamat } from '@/app/alamat'
import type { TujuanAlamat } from '@/domain/alamat/alamat'
import type { PeranKonsol } from '@/domain/konsol/schema'
import type { Peran } from '@/domain/pengguna/schema'
import { tautanMasukCepat } from './masuk-cepat'

/** Akun yang dipakai satu tombol skenario; `publik` membuka website desa tanpa masuk. */
export type MasukSkenario =
  | { bagian: 'admin'; peran: Peran }
  | { bagian: 'warga'; pendudukId: string }
  | { bagian: 'konsol'; peran: PeranKonsol }
  | { bagian: 'kabupaten'; id: string }
  | { bagian: 'publik' }
/** `tujuan` + `jalur`: alamat dan path luar yang dibuka tombol (SPEC-V0.2 §4.6). */
export type TombolSkenario = { label: string; masuk: MasukSkenario; tujuan: TujuanAlamat; jalur: string }
export type LangkahSkenario = { teks: string; tombol: readonly TombolSkenario[] }
export type Skenario = { id: string; judul: string; ringkas: string; langkah: readonly LangkahSkenario[] }

const SITI: MasukSkenario = { bagian: 'warga', pendudukId: 'pdk_siti_rahmah' }
const OPERATOR: MasukSkenario = { bagian: 'admin', peran: 'operator' }
const PUBLIK: MasukSkenario = { bagian: 'publik' }
const SS: TujuanAlamat = { jenis: 'desa', label: 'sungaisialang' }
const KAB_PELALAWAN: TujuanAlamat = { jenis: 'kabupaten', label: 'kab-pelalawan' }
const ADMIN_PELALAWAN: MasukSkenario = { bagian: 'kabupaten', id: 'kab_fajar' }
const KAUR_KEUANGAN: MasukSkenario = { bagian: 'admin', peran: 'kaur-keuangan' }
const TIM_SINFODES: MasukSkenario = { bagian: 'konsol', peran: 'tim' }

/**
 * Skenario terpandu: tiga alur demo kriteria selesai tahap 1 (SPEC §3.6, §13.5), ditambah Siaran kabupaten dan Tagihan
 * langganan (SPEC-V0.2 §13).
 */
export const SKENARIO_DEMO: readonly Skenario[] = [
  {
    id: 'sktm',
    judul: 'SKTM dari HP sampai verifikasi QR',
    ringkas: 'Siti Rahmah mengajukan Surat Keterangan Tidak Mampu dari HP. Surat diproses, diparaf, ditandatangani, lalu dicek keasliannya.',
    langkah: [
      { teks: 'Siti Rahmah mengajukan SKTM dari layanan warga.', tombol: [{ label: 'Masuk sebagai Siti', masuk: SITI, tujuan: SS, jalur: '/warga/ajukan' }] },
      {
        teks: 'Operator memprosesnya, lalu Sekretaris Desa memaraf.',
        tombol: [
          { label: 'Operator: antrean surat', masuk: OPERATOR, tujuan: SS, jalur: '/admin/surat' },
          // Paraf dilakukan di ruang kerja surat, lewat daftar Perlu TTD; tumpukan tanda tangan hanya untuk penanda tangan.
          { label: 'Sekdes: paraf', masuk: { bagian: 'admin', peran: 'sekdes' }, tujuan: SS, jalur: '/admin/surat?status=perlu-ttd' },
        ],
      },
      {
        teks: 'Kepala Desa menandatangani dari tampilan HP (perkecil jendela atau buka di HP). Passphrase: sialang2026.',
        tombol: [{ label: 'Kades: tanda tangan', masuk: { bagian: 'admin', peran: 'kades' }, tujuan: SS, jalur: '/admin/surat/tanda-tangan' }],
      },
      { teks: 'Siti melihat status Selesai dan membuka suratnya.', tombol: [{ label: 'Riwayat Siti', masuk: SITI, tujuan: SS, jalur: '/warga/riwayat' }] },
      {
        teks: 'Kode atau QR surat lolos di halaman verifikasi website desa.',
        tombol: [{ label: 'Cek keaslian surat', masuk: PUBLIK, tujuan: SS, jalur: '/verifikasi' }],
      },
    ],
  },
  {
    id: 'kelahiran',
    judul: 'Mencatat kelahiran',
    ringkas: 'Operator mencatat kelahiran anak Siti Rahmah. Angka penduduk di panel dan di website desa ikut berubah.',
    langkah: [
      { teks: 'Operator mencatat kelahiran anak Siti Rahmah.', tombol: [{ label: 'Catat kelahiran', masuk: OPERATOR, tujuan: SS, jalur: '/admin/kependudukan/mutasi/lahir' }] },
      {
        teks: 'Jumlah penduduk dan anggota KK bertambah, dan bayi berstatus BELUM ADA NIK.',
        tombol: [{ label: 'KK Syahrial', masuk: OPERATOR, tujuan: SS, jalur: '/admin/kependudukan/keluarga/kk_syahrial' }],
      },
      {
        teks: 'Statistik, Buku Mutasi, Buku hari ini, dan halaman statistik website ikut berubah.',
        tombol: [
          { label: 'Statistik', masuk: OPERATOR, tujuan: SS, jalur: '/admin/kependudukan/statistik' },
          { label: 'Buku Mutasi', masuk: OPERATOR, tujuan: SS, jalur: '/admin/buku/mutasi-penduduk' },
          { label: 'Buku hari ini', masuk: OPERATOR, tujuan: SS, jalur: '/admin' },
          { label: 'Statistik website', masuk: PUBLIK, tujuan: SS, jalur: '/statistik' },
        ],
      },
    ],
  },
  {
    id: 'pemantauan',
    judul: 'Pemantauan kabupaten',
    ringkas: 'Kepala Dinas PMD Kabupaten Pelalawan melihat Sungai Sialang di dasbor kabupaten, dengan angka yang sama dengan panel desanya.',
    langkah: [
      {
        teks: 'Peninjau Kabupaten Pelalawan membuka Pemantauan di dasbor kabupaten, lalu membuka Kecamatan Teluk Meranti.',
        tombol: [
          { label: 'Masuk sebagai Peninjau', masuk: { bagian: 'kabupaten', id: 'kab_rosnani' }, tujuan: KAB_PELALAWAN, jalur: '/admin/pemantauan' },
        ],
      },
      {
        teks: 'Bandingkan dengan panel Sungai Sialang: data belum lengkap dan realisasi APBDes.',
        tombol: [
          { label: 'Data belum lengkap', masuk: OPERATOR, tujuan: SS, jalur: '/admin/kependudukan/penduduk?preset=data-belum-lengkap' },
          { label: 'Keuangan', masuk: OPERATOR, tujuan: SS, jalur: '/admin/keuangan' },
        ],
      },
    ],
  },
  {
    id: 'siaran',
    judul: 'Siaran kabupaten',
    ringkas: 'Kabupaten Pelalawan mengirim siaran ke desa. Desa membacanya dan menandai tindak lanjut, lalu kabupaten melihat status per desa.',
    langkah: [
      {
        teks: 'Admin Kabupaten Pelalawan menulis siaran ke Kecamatan Teluk Meranti dengan tindak lanjut.',
        tombol: [{ label: 'Admin Kabupaten: tulis siaran', masuk: ADMIN_PELALAWAN, tujuan: KAB_PELALAWAN, jalur: '/admin/siaran/tulis' }],
      },
      {
        teks: 'Kepala Desa Sungai Sialang membuka siaran dari notifikasi, lalu menandainya sudah ditindaklanjuti dengan catatan.',
        tombol: [{ label: 'Kades: Siaran kabupaten', masuk: { bagian: 'admin', peran: 'kades' }, tujuan: SS, jalur: '/admin/siaran' }],
      },
      {
        teks: 'Dasbor kabupaten melihat Sungai Sialang dibaca dan ditindaklanjuti beserta catatannya. Siaran juga bisa ditarik.',
        tombol: [{ label: 'Admin Kabupaten: status siaran', masuk: ADMIN_PELALAWAN, tujuan: KAB_PELALAWAN, jalur: '/admin/siaran' }],
      },
    ],
  },
  {
    id: 'tagihan',
    judul: 'Tagihan langganan',
    ringkas: 'Desa mengunggah bukti transfer, Tim Sinfodes memverifikasi, lalu kwitansi terbit.',
    langkah: [
      {
        teks: 'Kaur Keuangan Sungai Sialang membuka Langganan, menyalin nominal unik tagihan, lalu mengunggah bukti transfer.',
        tombol: [{ label: 'Kaur Keuangan: Langganan', masuk: KAUR_KEUANGAN, tujuan: SS, jalur: '/admin/pengaturan/langganan' }],
      },
      {
        teks: 'Tim Sinfodes mencari nominalnya di menu Tagihan, memeriksa bukti, lalu menandai lunas.',
        tombol: [{ label: 'Dina: Tagihan', masuk: TIM_SINFODES, tujuan: { jenis: 'konsol' }, jalur: '/konsol/tagihan' }],
      },
      {
        teks: 'Kaur Keuangan kembali ke Langganan: tagihan Lunas dan kwitansinya bisa diunduh.',
        tombol: [{ label: 'Kaur Keuangan: kwitansi', masuk: KAUR_KEUANGAN, tujuan: SS, jalur: '/admin/pengaturan/langganan' }],
      },
    ],
  },
]

/** Tautan satu tombol skenario: alamat tujuannya, dengan masuk cepat memakai akun langkah itu (SPEC-V0.2 §4.6). */
export function tautanSkenario(
  t: TombolSkenario,
  akun: { admin: readonly { id: string; peran: Peran }[]; konsol: readonly { id: string; peran: PeranKonsol }[] },
): string {
  const m = t.masuk
  const kunci =
    m.bagian === 'admin'
      ? akun.admin.find((a) => a.peran === m.peran)?.id
      : m.bagian === 'konsol'
        ? akun.konsol.find((a) => a.peran === m.peran)?.id
        : m.bagian === 'warga'
          ? m.pendudukId
          : m.bagian === 'kabupaten'
            ? m.id
            : undefined
  return kunci ? tautanMasukCepat(t.tujuan, t.jalur, kunci) : keAlamat(t.tujuan, t.jalur)
}
