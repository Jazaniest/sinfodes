import { tataLetakSuratSchema, type TataLetakSurat } from '@sinfodes/kontrak/surat/tata-letak'
import { samaDenganSiap } from '@sinfodes/kontrak/surat/tata-letak-siap'
import type { Db } from '../../basisdata/klien'
import { galatIsian } from '../../galat-isian'
import { bacaPengaturanSurat, upsertPengaturanSurat } from './repositori'

type Konteks = { db: Db; desaId: string }

/** Tata letak surat desa; desa yang belum punya baris mendapat tata letak bawaan tanpa menulis apa pun. */
export async function ambilTataLetak(k: Konteks): Promise<TataLetakSurat> {
  return (await bacaPengaturanSurat(k.db, k.desaId)).tataLetak
}

/**
 * Menyimpan tata letak desa. Penanda `siap` selalu dihitung ulang dari isinya (SPEC-V0.3 §7.8): nilai kiriman klien tidak
 * dipercaya, jadi tata letak tidak bisa berbohong tentang tata letak siap pakai. Hanya kolom tata letak yang ditulis.
 * Surat yang sudah terbit menyimpan salinannya sendiri (dikerjakan 8F2).
 */
export async function simpanTataLetak(k: Konteks, mentah: unknown): Promise<TataLetakSurat> {
  const isian = tataLetakSuratSchema.safeParse(mentah)
  if (!isian.success) throw galatIsian(isian.error)
  const tataLetak = { ...isian.data, siap: samaDenganSiap(isian.data) }
  await upsertPengaturanSurat(k.db, k.desaId, { tataLetak })
  return tataLetak
}
