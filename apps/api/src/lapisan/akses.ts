import { PESAN_MODUL_KESEHATAN_MATI } from '@sinfodes/kontrak/pengaturan/modul'
import { boleh, bolehDi, type Kemampuan } from '@sinfodes/kontrak/pengguna/hak-akses'
import type { Context } from 'hono'
import type { DesaRekam } from '../basisdata/desa'
import type { Db } from '../basisdata/klien'
import { GalatApp } from '../galat'
import type { LingkunganApp, PelakuKabupaten, PelakuKonsol, PelakuPanel, PelakuWarga } from './konteks'

type Konteks = Context<LingkunganApp>

export const PESAN_SESI_BERAKHIR = 'Sesi Anda sudah berakhir. Silakan masuk lagi.'
export const PESAN_DESA_TIDAK_ADA = 'Desa tidak ditemukan.'
export const PESAN_TIDAK_BERHAK = 'Peran Anda tidak berhak melakukan ini.'
/** Sama dengan pesan API tiruan (SPEC-V0.2 §10.5). */
export const PESAN_PANEL_DITANGGUHKAN = 'Langganan desa ditangguhkan. Panel hanya bisa dilihat.'

const hanyaMembaca = (c: Konteks): boolean => c.req.method === 'GET' || c.req.method === 'HEAD'
const tolakSesi = (): GalatApp => new GalatApp('UNAUTHENTICATED', PESAN_SESI_BERAKHIR, 401)

/** Desa pemilik alamat permintaan; 404 bila alamat bukan desa yang dikenal. */
export function butuhDesa(c: Konteks): DesaRekam {
  const desa = c.get('alamat').desa
  if (!desa) throw new GalatApp('NOT_FOUND', PESAN_DESA_TIDAK_ADA, 404)
  return desa
}

/** Pelaku panel (bila sesi di keluarga panel sah), atau null. */
export function pelakuPanel(c: Konteks): PelakuPanel | null {
  const p = c.get('pelaku')
  return p?.jenis === 'panel' ? p : null
}

/** Pelaku panel dari sesi yang sah, atau 401. */
export function butuhPelakuPanel(c: Konteks): PelakuPanel {
  const p = pelakuPanel(c)
  if (!p) throw tolakSesi()
  return p
}

/** Pelaku warga dari sesi yang sah di keluarga rute warga, atau 401. */
export function butuhWarga(c: Konteks): PelakuWarga {
  const p = c.get('pelaku')
  if (p?.jenis !== 'warga') throw tolakSesi()
  return p
}

/** Pelaku Konsol dari sesi yang sah di keluarga rute Konsol, atau 401. */
export function butuhKonsol(c: Konteks): PelakuKonsol {
  const p = c.get('pelaku')
  if (p?.jenis !== 'konsol') throw tolakSesi()
  return p
}

/** Pelaku kabupaten dari sesi yang sah di keluarga rute kabupaten, atau 401. */
export function butuhKabupaten(c: Konteks): PelakuKabupaten {
  const p = c.get('pelaku')
  if (p?.jenis !== 'kabupaten') throw tolakSesi()
  return p
}

/** Pelaku panel yang sudah masuk beserta `db` dan desanya, tanpa syarat kemampuan (mis. membaca sesi sendiri). */
export function butuhSesi(c: Konteks): { db: Db; pelaku: PelakuPanel; desa: DesaRekam } {
  const pelaku = butuhPelakuPanel(c)
  const desa = butuhDesa(c)
  const db = c.get('dbTransaksi')
  if (!db) throw tolakSesi()
  return { db, pelaku, desa }
}

/** Pelaku warga yang sudah masuk beserta `db` dan desanya (RLS membatasi `db` pada desa alamat). */
export function butuhSesiWarga(c: Konteks): { db: Db; pelaku: PelakuWarga; desa: DesaRekam } {
  const pelaku = butuhWarga(c)
  const desa = butuhDesa(c)
  const db = c.get('dbTransaksi')
  if (!db) throw tolakSesi()
  return { db, pelaku, desa }
}

/** Pelaku Konsol yang sudah masuk beserta `db` (peran `konsol`). */
export function butuhSesiKonsol(c: Konteks): { db: Db; pelaku: PelakuKonsol } {
  const pelaku = butuhKonsol(c)
  const db = c.get('dbTransaksi')
  if (!db) throw tolakSesi()
  return { db, pelaku }
}

/** `db` peran `konsol` untuk rute masuk (sebelum ada sesi). 404 di alamat selain Konsol. */
export function dbKonsolTanpaPelaku(c: Konteks): { db: Db } {
  const db = c.get('dbTransaksi')
  if (c.get('alamat').konteks.jenis !== 'konsol' || !db) throw new GalatApp('NOT_FOUND', 'Konsol tidak ada di alamat ini.', 404)
  return { db }
}

/** Pelaku kabupaten yang sudah masuk beserta `db` (peran `kabupaten`). */
export function butuhSesiKabupaten(c: Konteks): { db: Db; pelaku: PelakuKabupaten } {
  const pelaku = butuhKabupaten(c)
  const db = c.get('dbTransaksi')
  if (!db) throw tolakSesi()
  return { db, pelaku }
}

/** `db` peran `kabupaten` untuk rute masuk (sebelum ada sesi) beserta kabupaten mitra dari alamat. 404 di alamat lain. */
export function dbKabupatenTanpaPelaku(c: Konteks): { db: Db; kabupaten: { kode: string; nama: string; label: string } } {
  const alamat = c.get('alamat')
  if (alamat.konteks.jenis !== 'kabupaten') throw new GalatApp('NOT_FOUND', 'Dasbor kabupaten tidak ada di alamat ini.', 404)
  if (!alamat.kabupaten?.mitra) throw new GalatApp('NOT_FOUND', 'Kabupaten ini belum memakai Sinfodes.', 404)
  const db = c.get('dbTransaksi')
  if (!db) throw new GalatApp('NOT_FOUND', 'Dasbor kabupaten tidak ada di alamat ini.', 404)
  const { kode, nama, label } = alamat.kabupaten
  return { db, kabupaten: { kode, nama, label } }
}

/**
 * Pintu masuk data desa untuk rute panel: pelaku wajib ada, perannya wajib punya `kemampuan`, modul Kesehatan wajib menyala
 * untuk kemampuan Kesehatan, dan selama desa Ditangguhkan metode yang mengubah data ditolak (membaca tetap boleh).
 * Mengembalikan `db` yang sudah ber-konteks desa. Rute panel tidak punya jalan lain ke data desa selain ini, `butuhSesi`, dan
 * `dbTanpaPelaku`.
 */
export function butuhAkses(c: Konteks, kemampuan: Kemampuan, pesanTolak: string = PESAN_TIDAK_BERHAK): { db: Db; pelaku: PelakuPanel; desa: DesaRekam } {
  const { db, pelaku, desa } = butuhSesi(c)
  if (!boleh(pelaku.peran, kemampuan)) throw new GalatApp('FORBIDDEN', pesanTolak, 403)
  if (kemampuan === 'kesehatan.lihat' && !desa.modul.kesehatan) throw new GalatApp('FORBIDDEN', PESAN_MODUL_KESEHATAN_MATI, 403)
  if (!hanyaMembaca(c) && !bolehDi(pelaku.peran, desa.desa.status, kemampuan, desa.modul)) {
    throw new GalatApp('FORBIDDEN', PESAN_PANEL_DITANGGUHKAN, 403)
  }
  return { db, pelaku, desa }
}

/**
 * Akses tanpa pelaku, khusus untuk rute yang memang harus berjalan sebelum ada sesi (masuk). Tetap dibatasi konteks desa
 * dari alamat. Nama panjang ini disengaja agar mudah dicari saat tinjauan.
 */
export function dbTanpaPelaku(c: Konteks): { db: Db; desa: DesaRekam } {
  const desa = butuhDesa(c)
  const db = c.get('dbTransaksi')
  if (!db) throw new GalatApp('NOT_FOUND', PESAN_DESA_TIDAK_ADA, 404)
  return { db, desa }
}
