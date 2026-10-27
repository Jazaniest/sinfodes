import { waktuIsoWib } from '@/domain/format/tanggal'
import { hariKerjaBerlalu } from '@/domain/surat/waktu'
import type { DbDemo } from '@sinfodes/demo/tipe-db'

const HARI_MS = 86_400_000

/**
 * Rata-rata hari kerja sampai selesai untuk satu jenis surat dalam 90 hari terakhir; null bila belum ada contoh.
 * Dipakai layanan warga (Ajukan surat) dan website desa (Layanan).
 */
export function perkiraanHariKerja(db: DbDemo, jenisId: string, sekarang: Date): number | null {
  const batas = waktuIsoWib(new Date(sekarang.getTime() - 90 * HARI_MS))
  const lama = db.permohonan.flatMap((p) =>
    p.jenisId === jenisId && p.status === 'selesai' && p.terbit && p.terbit.pada >= batas ? [hariKerjaBerlalu(p.masukPada, p.terbit.pada)] : [],
  )
  return lama.length === 0 ? null : Math.round(lama.reduce((a, b) => a + b, 0) / lama.length)
}
