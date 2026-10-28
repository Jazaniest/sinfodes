import type { HasilCari } from '@sinfodes/kontrak/cari/schema'
import type { KonteksLayanan } from '../penduduk/layanan'

/**
 * Titik sambung pencarian surat di Cari global (SPEC-V0.2 §5.4): kata bergaris miring dicari di nomor surat, selain itu di nama
 * pemohon, dan Kepala Dusun hanya mendapat surat dusunnya. Tabel surat baru ada di tahap 8F, jadi sampai itu jawabannya
 * selalu kosong. 8F mengganti isi fungsi ini dan mengubah dua `it.todo` di `rute.test.ts` menjadi uji sungguhan.
 */
export function cariSurat(k: Pick<KonteksLayanan, 'db' | 'pelaku'>, kata: string): Promise<HasilCari['surat']> {
  void k
  void kata
  return Promise.resolve([])
}
