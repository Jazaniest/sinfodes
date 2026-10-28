import type { Db } from '../../basisdata/klien'

/**
 * Titik sambung efek mutasi ke modul lain yang belum ada di server. Meninggal dan pindah keluar menandai penerima bansos atas
 * nama orang itu "perlu ditinjau" dan menahan tahap yang belum tersalur (SPEC-V0.2 §6.6, §8); tabel bansos baru ada di 8G,
 * jadi bawaannya tidak melakukan apa pun dan 8G mengganti isinya. Dipanggil di dalam transaksi permintaan: galat dari efek
 * membatalkan seluruh mutasi (rencana 8E2 Ruling 9).
 */
export type EfekSilang = {
  tandaiPenerimaDitinjau(db: Db, pendudukIds: readonly string[], alasan: string, sejak: string): Promise<void>
}

export const efekSilangBawaan: EfekSilang = {
  async tandaiPenerimaDitinjau() {
    // Menunggu tabel bansos (8G).
  },
}
