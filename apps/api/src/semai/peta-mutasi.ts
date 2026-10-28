import type { DbDemo } from '@sinfodes/demo/tipe-db'
import type { Penyandi } from '../kripto/penyandi'
import { sandikanIsiLaporan } from '../modul/laporan/sandi'
import type { BarisSisip, PembuatJson } from './peta-desa'

const json = (sql: PembuatJson, nilai: unknown) => sql.json(nilai as never)

/** Peristiwa kependudukan; pelaku dipecah menjadi `dicatat_oleh_id` dan `dicatat_oleh_nama` (potret). */
export const petaMutasi = (sql: PembuatJson, db: DbDemo): BarisSisip[] =>
  db.mutasi.map((m) => ({
    id: m.id,
    desa_id: m.desaId,
    jenis: m.jenis,
    tanggal: m.tanggal,
    dicatat_oleh_id: m.dicatatOleh.id,
    dicatat_oleh_nama: m.dicatatOleh.nama,
    dicatat_pada: new Date(m.dicatatPada),
    rincian: json(sql, m.rincian),
  }))

/** Penduduk tiap mutasi, urutan = posisi di `pendudukIds` (kepala dulu pada kedatangan). */
export const petaMutasiPenduduk = (db: DbDemo): BarisSisip[] =>
  db.mutasi.flatMap((m) => m.pendudukIds.map((pendudukId, urutan) => ({ mutasi_id: m.id, penduduk_id: pendudukId, desa_id: m.desaId, urutan })))

/** Laporan warga; nilai telepon pada isi disandikan seperti penulisan sungguhan. */
export const petaLaporan = (sql: PembuatJson, db: DbDemo, penyandi: Penyandi): BarisSisip[] =>
  db.laporanData.map((l) => ({
    id: l.id,
    desa_id: l.desaId,
    dusun_id: l.dusunId,
    dibuat_pada: new Date(l.dibuatPada),
    pelapor_penduduk_id: l.pelapor.pendudukId,
    pelapor_nama: l.pelapor.nama,
    status: l.status,
    ditangani_oleh_id: l.ditangani?.oleh.id ?? null,
    ditangani_oleh_nama: l.ditangani?.oleh.nama ?? null,
    ditangani_pada: l.ditangani ? new Date(l.ditangani.pada) : null,
    ditangani_alasan: l.ditangani?.alasan ?? null,
    lampiran_berkas: l.lampiran?.berkas ?? null,
    lampiran_ukuran_kb: l.lampiran?.ukuranKb ?? null,
    isi: json(sql, sandikanIsiLaporan(penyandi, l.desaId, l.isi)),
  }))
