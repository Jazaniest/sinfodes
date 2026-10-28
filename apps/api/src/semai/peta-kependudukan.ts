import type { DbDemo } from '@sinfodes/demo/tipe-db'
import type { Penyandi } from '../kripto/penyandi'
import { sandikanNilaiRiwayat } from '../riwayat/sandi'
import type { BarisSisip } from './peta-desa'

/**
 * Riwayat perubahan data penduduk; pelaku dipecah menjadi `oleh_id` dan `oleh_nama` (potret, rencana 8E1 Ruling 5). Nilai NIK dan
 * telepon disandikan seperti penulisan sungguhan.
 */
export const petaRiwayat = (db: DbDemo, penyandi: Penyandi): BarisSisip[] =>
  db.riwayat.map((r) => ({
    id: r.id,
    desa_id: r.desaId,
    penduduk_id: r.pendudukId,
    field: r.field,
    nilai_lama: sandikanNilaiRiwayat(penyandi, r.desaId, r.field, r.nilaiLama),
    nilai_baru: sandikanNilaiRiwayat(penyandi, r.desaId, r.field, r.nilaiBaru),
    oleh_id: r.oleh.id,
    oleh_nama: r.oleh.nama,
    waktu: new Date(r.waktu),
  }))

/** Buku hari ini. Pelaku dan rujukan boleh kosong bersama. */
export const petaAktivitas = (db: DbDemo): BarisSisip[] =>
  db.aktivitas.map((a) => ({
    id: a.id,
    desa_id: a.desaId,
    dusun_id: a.dusunId,
    waktu: new Date(a.waktu),
    jenis: a.jenis,
    ringkasan: a.ringkasan,
    oleh_id: a.oleh?.id ?? null,
    oleh_nama: a.oleh?.nama ?? null,
    rujukan_jenis: a.rujukan?.jenis ?? null,
    rujukan_id: a.rujukan?.id ?? null,
  }))
