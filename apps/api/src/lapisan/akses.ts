import { PESAN_MODUL_KESEHATAN_MATI } from '@sinfodes/kontrak/pengaturan/modul'
import { boleh, bolehDi, type Kemampuan } from '@sinfodes/kontrak/pengguna/hak-akses'
import type { Context } from 'hono'
import type { DesaRekam } from '../basisdata/desa'
import type { Db } from '../basisdata/klien'
import { GalatApp } from '../galat'
import type { LingkunganApp, Pelaku } from './konteks'

type Konteks = Context<LingkunganApp>

export const PESAN_SESI_BERAKHIR = 'Sesi Anda sudah berakhir. Silakan masuk lagi.'
export const PESAN_DESA_TIDAK_ADA = 'Desa tidak ditemukan.'
export const PESAN_TIDAK_BERHAK = 'Peran Anda tidak berhak melakukan ini.'
/** Sama dengan pesan API tiruan (SPEC-V0.2 §10.5). */
export const PESAN_PANEL_DITANGGUHKAN = 'Langganan desa ditangguhkan. Panel hanya bisa dilihat.'

const hanyaMembaca = (c: Konteks): boolean => c.req.method === 'GET' || c.req.method === 'HEAD'

/** Desa pemilik alamat permintaan; 404 bila alamat bukan desa yang dikenal. */
export function butuhDesa(c: Konteks): DesaRekam {
  const desa = c.get('alamat').desa
  if (!desa) throw new GalatApp('NOT_FOUND', PESAN_DESA_TIDAK_ADA, 404)
  return desa
}

/** Pelaku dari sesi yang sah, atau 401. */
export function butuhPelaku(c: Konteks): Pelaku {
  const pelaku = c.get('pelaku')
  if (!pelaku) throw new GalatApp('UNAUTHENTICATED', PESAN_SESI_BERAKHIR, 401)
  return pelaku
}

/** Pelaku yang sudah masuk beserta `db` dan desanya, tanpa syarat kemampuan (mis. membaca sesi sendiri). */
export function butuhSesi(c: Konteks): { db: Db; pelaku: Pelaku; desa: DesaRekam } {
  const pelaku = butuhPelaku(c)
  const desa = butuhDesa(c)
  const db = c.get('dbTransaksi')
  if (!db) throw new GalatApp('UNAUTHENTICATED', PESAN_SESI_BERAKHIR, 401)
  return { db, pelaku, desa }
}

/**
 * Pintu masuk data desa untuk rute panel: pelaku wajib ada, perannya wajib punya `kemampuan`, modul Kesehatan wajib menyala
 * untuk kemampuan Kesehatan, dan selama desa Ditangguhkan metode yang mengubah data ditolak (membaca tetap boleh).
 * Mengembalikan `db` yang sudah ber-konteks desa. Rute tidak punya jalan lain ke data desa selain ini dan `dbTanpaPelaku`.
 */
export function butuhAkses(c: Konteks, kemampuan: Kemampuan, pesanTolak: string = PESAN_TIDAK_BERHAK): { db: Db; pelaku: Pelaku; desa: DesaRekam } {
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
