import type { Pelaku } from '@sinfodes/kontrak/mutasi/schema'
import type { JenisSurat } from '@sinfodes/kontrak/surat/jenis'
import type { Db } from '../../basisdata/klien'

/**
 * Titik sambung efek aksi surat ke modul lain yang belum ada di server. Surat yang dikembalikan memberi tahu petugas yang
 * berhak memprosesnya lewat notifikasi (SPEC-V0.2 §5.2); tabel notifikasi baru ada di 8G, jadi bawaannya tidak melakukan apa
 * pun dan 8G mengganti isinya (pola `EfekSilang` 8E2). Dipanggil di dalam transaksi permintaan: galat dari efek membatalkan
 * seluruh aksi.
 */
export type EfekSurat = {
  suratDikembalikan(
    db: Db,
    permohonan: { id: string; desaId: string; dusunId: string },
    jenis: Pick<JenisSurat, 'id' | 'kode'>,
    pemohon: { id: string; nama: string },
    catatan: string,
    oleh: Pelaku,
  ): Promise<void>
}

export const efekSuratBawaan: EfekSurat = {
  async suratDikembalikan() {
    // Menunggu tabel notifikasi (8G).
  },
}
