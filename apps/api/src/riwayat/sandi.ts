import type { FieldRiwayat } from '@sinfodes/kontrak/penduduk/riwayat'
import type { Penyandi } from '../kripto/penyandi'
import { ruang } from '../kripto/ruang'

/**
 * Field Riwayat yang nilainya data pribadi: NIK dan telepon tidak pernah tersimpan polos, termasuk sebagai nilai lama dan baru
 * di Riwayat (SPEC-V0.3 §7.6). Migrasi 0007 menjaga hal yang sama di basis data dengan CHECK.
 */
export const FIELD_RIWAYAT_SENSITIF: ReadonlySet<FieldRiwayat> = new Set<FieldRiwayat>(['nik', 'telepon'])

/** Nilai untuk disimpan: disandikan di ruang riwayat desa bila field-nya sensitif, kalau tidak apa adanya. */
export function sandikanNilaiRiwayat(penyandi: Penyandi, desaId: string, field: FieldRiwayat, nilai: string | null): string | null {
  return nilai !== null && FIELD_RIWAYAT_SENSITIF.has(field) ? penyandi.sandikan(nilai, ruang.riwayat(desaId)) : nilai
}

/** Kebalikan `sandikanNilaiRiwayat`, untuk nilai yang dibaca dari basis data. */
export function bukaNilaiRiwayat(penyandi: Penyandi, desaId: string, field: FieldRiwayat, nilai: string | null): string | null {
  return nilai !== null && FIELD_RIWAYAT_SENSITIF.has(field) ? penyandi.bukaSandi(nilai, ruang.riwayat(desaId)) : nilai
}
