import type { DbDemo } from '@sinfodes/demo/tipe-db'
import type { BarisSisip, PembuatJson } from './peta-desa'

/**
 * Register surat masuk dunia demo. `tahun` mengikuti tanggal terima (dasar penomoran agenda). Pindaian hanya membawa nama dan
 * ukuran: surat demo tidak punya isi berkas, jadi tidak ada baris `berkas_surat` (membukanya menjawab 404, 8F3 Ruling 10).
 */
export const petaSuratMasuk = (sql: PembuatJson, db: DbDemo): BarisSisip[] =>
  db.suratMasuk.map((s) => ({
    id: s.id,
    desa_id: s.desaId,
    tahun: Number(s.diterima.slice(0, 4)),
    no_agenda: s.noAgenda,
    diterima: s.diterima,
    nomor: s.nomor,
    tanggal_surat: s.tanggalSurat,
    pengirim: s.pengirim,
    perihal: s.perihal,
    disposisi_kepada: s.disposisi?.kepada ?? null,
    disposisi_instruksi: s.disposisi?.instruksi ?? '',
    scan_nama: s.scan?.berkas ?? null,
    scan_ukuran_kb: s.scan?.ukuranKb ?? null,
    dicatat_oleh: sql.json(s.dicatat.oleh as never),
    dicatat_pada: new Date(s.dicatat.pada),
  }))
