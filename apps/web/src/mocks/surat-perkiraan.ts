import { waktuIsoWib } from '@/domain/format/tanggal'
import { rataHariKerja } from '@/domain/surat/waktu'
import type { DbDemo } from '@sinfodes/demo/tipe-db'

const HARI_MS = 86_400_000

/**
 * Rata-rata hari kerja sampai selesai untuk satu jenis surat dalam 90 hari terakhir; null bila belum ada contoh.
 * Dipakai layanan warga (Ajukan surat) dan website desa (Layanan). Perhitungannya fungsi kontrak yang sama dengan server.
 */
export function perkiraanHariKerja(db: DbDemo, jenisId: string, sekarang: Date): number | null {
  const batas = waktuIsoWib(new Date(sekarang.getTime() - 90 * HARI_MS))
  return rataHariKerja(
    db.permohonan.flatMap((p) =>
      p.jenisId === jenisId && p.status === 'selesai' && p.terbit && p.terbit.pada >= batas ? [{ masukPada: p.masukPada, terbitPada: p.terbit.pada }] : [],
    ),
  )
}
