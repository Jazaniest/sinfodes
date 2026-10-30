import { sql } from 'drizzle-orm'
import type { Db } from '../../basisdata/klien'

export type HasilFungsiVerifikasi =
  | { hasil: 'terkunci' }
  | { hasil: 'tidak-ada' }
  | {
      hasil: 'ditemukan'
      jenisNama: string
      nomor: string
      terbitPada: Date
      nama: string | null
      penandatangan: { nama: string; peran: string }
      status: string
      pembatalanPada: Date | null
      berlakuSampai: string | null
    }

type BarisFungsi = {
  hasil: 'ditemukan' | 'tidak-ada' | 'terkunci'
  jenis_nama: string | null
  nomor: string | null
  terbit_ms: string | number | null
  nama: string | null
  penandatangan: { nama: string; peran: string } | null
  status: string | null
  pembatalan_ms: string | number | null
  berlaku_sampai: string | null
}

/**
 * Memanggil fungsi `verifikasi_surat` (migrasi 0013): satu-satunya jalan peran `publik` ke surat terbit. Fungsi itu juga yang
 * mengelola pencacah percobaan salah, jadi satu panggilan mencari sekaligus mencatat.
 */
export async function verifikasiSurat(db: Db, desaId: string, kode: string, sekarang: Date): Promise<HasilFungsiVerifikasi> {
  const [b] = await db.execute<BarisFungsi>(
    sql`select hasil, jenis_nama, nomor, (extract(epoch from terbit_pada) * 1000)::bigint as terbit_ms, nama, penandatangan, status,
      (extract(epoch from pembatalan_pada) * 1000)::bigint as pembatalan_ms, berlaku_sampai::text as berlaku_sampai
      from verifikasi_surat(${desaId}, ${kode}, ${sekarang.toISOString()}::timestamptz)`,
  )
  if (b.hasil !== 'ditemukan') return { hasil: b.hasil }
  if (b.jenis_nama === null || b.nomor === null || b.terbit_ms === null || b.penandatangan === null || b.status === null) {
    throw new Error('Hasil verifikasi tidak utuh.')
  }
  return {
    hasil: 'ditemukan',
    jenisNama: b.jenis_nama,
    nomor: b.nomor,
    terbitPada: new Date(Number(b.terbit_ms)),
    nama: b.nama,
    penandatangan: b.penandatangan,
    status: b.status,
    pembatalanPada: b.pembatalan_ms === null ? null : new Date(Number(b.pembatalan_ms)),
    berlakuSampai: b.berlaku_sampai,
  }
}
