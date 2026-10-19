import { boleh, type Kemampuan } from '@/domain/pengguna/hak-akses'
import type { PeranSesi } from '@/domain/pengguna/schema'

/** Kunci angka di samping menu: jumlah yang perlu ditindaklanjuti peran aktif (SPEC §5.2). */
export type KunciHitungan = 'surat' | 'pengaduan' | 'notifikasi'

/** Arti angka di samping menu untuk pembaca layar, mis. "Notifikasi, 3 belum dibaca". */
export const LABEL_HITUNGAN: Readonly<Record<KunciHitungan, string>> = {
  surat: 'perlu ditindaklanjuti',
  pengaduan: 'belum dibalas',
  notifikasi: 'belum dibaca',
}
export type ItemMenu = { label: string; href: string; kemampuan: Kemampuan | null; awalan: string; hitungan: KunciHitungan | null }
export type KelompokMenu = { judul: string | null; item: ItemMenu[] }

/** SPEC §5.2. Hanya modul yang sudah dibangun; modul lain ditambahkan di tahapnya masing-masing. */
export const MENU_ADMIN: readonly KelompokMenu[] = [
  {
    judul: null,
    item: [
      { label: 'Beranda', href: '/admin', kemampuan: null, awalan: '/admin', hitungan: null },
      { label: 'Peringkat', href: '/admin/peringkat', kemampuan: null, awalan: '/admin/peringkat', hitungan: null },
    ],
  },
  {
    judul: 'Pelayanan',
    item: [
      { label: 'Layanan Surat', href: '/admin/surat', kemampuan: 'surat.lihat', awalan: '/admin/surat', hitungan: 'surat' },
      { label: 'Pengaduan', href: '/admin/pengaduan', kemampuan: 'pengaduan.lihat', awalan: '/admin/pengaduan', hitungan: 'pengaduan' },
    ],
  },
  {
    judul: 'Data desa',
    item: [
      { label: 'Kependudukan', href: '/admin/kependudukan/penduduk', kemampuan: 'penduduk.lihat', awalan: '/admin/kependudukan', hitungan: null },
      { label: 'Bantuan Sosial', href: '/admin/bansos', kemampuan: 'bansos.lihat', awalan: '/admin/bansos', hitungan: null },
      { label: 'Kesehatan', href: '/admin/kesehatan', kemampuan: 'kesehatan.lihat', awalan: '/admin/kesehatan', hitungan: null },
      { label: 'Peta Desa', href: '/admin/peta', kemampuan: null, awalan: '/admin/peta', hitungan: null },
    ],
  },
  {
    judul: 'Tata kelola',
    item: [
      { label: 'Keuangan', href: '/admin/keuangan', kemampuan: 'keuangan.lihat', awalan: '/admin/keuangan', hitungan: null },
      { label: 'Pembangunan', href: '/admin/pembangunan', kemampuan: null, awalan: '/admin/pembangunan', hitungan: null },
      { label: 'Aset Desa', href: '/admin/aset', kemampuan: 'aset.lihat', awalan: '/admin/aset', hitungan: null },
      { label: 'Lembaga Desa', href: '/admin/lembaga', kemampuan: null, awalan: '/admin/lembaga', hitungan: null },
      { label: 'Buku Administrasi', href: '/admin/buku', kemampuan: 'buku.lihat', awalan: '/admin/buku', hitungan: null },
    ],
  },
  {
    judul: 'Publikasi',
    item: [{ label: 'Website Desa', href: '/admin/website', kemampuan: 'website.kelola', awalan: '/admin/website', hitungan: null }],
  },
]

/** Angka menu Pengaduan: pengaduan Baru, hanya untuk peran yang bisa menanggapi. Kepala Desa melihat menu tanpa angka. */
export const angkaPengaduan = (peran: PeranSesi, baru: number | undefined): number | undefined =>
  boleh(peran, 'pengaduan.tanggapi') ? baru : undefined

/** Menu di bawah garis (SPEC §5.2). Siaran kabupaten (SPEC-V0.2 §8.4) di antara Pengaturan dan Notifikasi, tanpa angka. */
export const MENU_BAWAH: readonly ItemMenu[] = [
  { label: 'Pengaturan', href: '/admin/pengaturan', kemampuan: 'pengaturan.kelola', awalan: '/admin/pengaturan', hitungan: null },
  { label: 'Siaran kabupaten', href: '/admin/siaran', kemampuan: 'siaran.lihat', awalan: '/admin/siaran', hitungan: null },
  { label: 'Notifikasi', href: '/admin/notifikasi', kemampuan: null, awalan: '/admin/notifikasi', hitungan: 'notifikasi' },
]

/**
 * Menu di bawah garis yang boleh dibuka peran ini; yang tidak berhak disembunyikan (SPEC §5.1). Kepala Desa tidak mengelola
 * pengaturan, tetapi memberi akses bantuan Sinfodes: menu Pengaturannya langsung ke halaman itu (SPEC-V0.2 §5.3).
 */
export function menuBawahUntuk(peran: PeranSesi): ItemMenu[] {
  return MENU_BAWAH.flatMap((i) => {
    if (i.kemampuan === null || boleh(peran, i.kemampuan)) return [i]
    if (i.label === 'Pengaturan' && boleh(peran, 'akses-sinfodes.kelola')) {
      return [{ ...i, href: '/admin/pengaturan/akses-sinfodes', kemampuan: 'akses-sinfodes.kelola' as const }]
    }
    return []
  })
}

/** Menu yang tidak berhak diakses disembunyikan, bukan dinonaktifkan (SPEC §5.1). */
export function menuUntuk(peran: PeranSesi): KelompokMenu[] {
  return MENU_ADMIN.map((k) => ({ ...k, item: k.item.filter((i) => i.kemampuan === null || boleh(peran, i.kemampuan)) })).filter(
    (k) => k.item.length > 0,
  )
}

/** Beranda aktif hanya tepat di /admin; menu lain aktif untuk semua sub-halamannya. */
export function menuAktif(item: ItemMenu, jalur: string): boolean {
  const bersih = jalur.replace(/\/+$/, '')
  if (item.href === '/admin') return bersih === '/admin'
  return bersih === item.awalan || bersih.startsWith(`${item.awalan}/`)
}
