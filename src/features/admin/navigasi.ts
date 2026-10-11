import { boleh, type Kemampuan } from '@/domain/pengguna/hak-akses'
import type { Peran } from '@/domain/pengguna/schema'

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
  { judul: null, item: [{ label: 'Beranda', href: '/admin', kemampuan: null, awalan: '/admin', hitungan: null }] },
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
    ],
  },
]

/** Angka menu Pengaduan: pengaduan Baru, hanya untuk peran yang bisa menanggapi. Kepala Desa melihat menu tanpa angka. */
export const angkaPengaduan = (peran: Peran, baru: number | undefined): number | undefined =>
  boleh(peran, 'pengaduan.tanggapi') ? baru : undefined

/** Menu di bawah garis (SPEC §5.2). Pengaturan menyusul di Tahap 3. */
export const MENU_BAWAH: readonly ItemMenu[] = [
  { label: 'Notifikasi', href: '/admin/notifikasi', kemampuan: null, awalan: '/admin/notifikasi', hitungan: 'notifikasi' },
]

/** Menu yang tidak berhak diakses disembunyikan, bukan dinonaktifkan (SPEC §5.1). */
export function menuUntuk(peran: Peran): KelompokMenu[] {
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
