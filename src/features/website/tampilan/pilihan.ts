import type { IdFoto, IdKepala } from '@/domain/website/tema'

/** Label dan keterangan pilihan bentuk kepala halaman dan perlakuan foto di formulir Tampilan (SPEC-V0.2 §11.3). */
export const KEPALA: Readonly<Record<IdKepala, { label: string; keterangan: string }>> = {
  warta: { label: 'Warta', keterangan: 'Nama besar di tengah, bertanggal, berpita motif.' },
  ringkas: { label: 'Ringkas', keterangan: 'Logo dan nama satu baris, menu di kanan.' },
  pita: { label: 'Pita', keterangan: 'Pita penuh warna utama, nama putih.' },
}

export const FOTO: Readonly<Record<IdFoto, { label: string; keterangan: string }>> = {
  bingkai: { label: 'Bingkai', keterangan: 'Foto berbingkai, keterangan di bawahnya.' },
  penuh: { label: 'Penuh', keterangan: 'Foto melebar, keterangan di atas foto.' },
}
