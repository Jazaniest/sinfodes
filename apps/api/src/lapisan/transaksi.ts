import type { MiddlewareHandler } from 'hono'
import type { KonteksDb, Klien, PeranDb } from '../basisdata/klien'
import { GalatDisimpan } from '../galat'
import type { LingkunganApp } from './konteks'

/** Jalur publik yang berjalan di transaksi peran `publik`. */
const JALUR_PUBLIK = /^\/api\/v1\/publik(\/|$)/

/** Penanda internal: membatalkan transaksi tanpa melempar galat ke pemanggil (jawabannya sudah dibentuk). */
class BatalkanTransaksi extends Error {}

/**
 * Satu transaksi per permintaan (SPEC-V0.3 §6.2, §7.4) dengan peran basis data menurut jenis alamat: desa memakai peran `desa`
 * dengan `sinfodes.desa_id` disetel lokal ke desa pemilik alamat (RLS, termasuk pencarian sesi); jalur `/api/v1/publik/` di alamat desa memakai
 * peran `publik` tanpa konteks desa; alamat Konsol memakai peran
 * `konsol`; alamat kabupaten mitra memakai peran `kabupaten`; alamat lain (induk, desa atau kabupaten tak dikenal) tidak membuka
 * transaksi. Bila permintaan berakhir dengan galat yang dilempar atau status 5xx, transaksi dibatalkan; jawaban 4xx yang
 * dikembalikan biasa (mis. masuk gagal beserta jejak auditnya) atau dilempar sebagai `GalatDisimpan` justru disimpan.
 *
 * Hono menangkap galat rute lewat `onError` sebelum kembali ke sini, jadi galat dikenali dari `c.error`, bukan `try/catch`.
 */
export function lapisanTransaksi(deps: { klien: Klien }): MiddlewareHandler<LingkunganApp> {
  return async (c, next) => {
    const alamat = c.get('alamat')
    let peran: PeranDb | null = null
    let konteks: KonteksDb = {}
    if (alamat.desa && JALUR_PUBLIK.test(c.req.path)) {
      // Jalur publik tanpa sesi (verifikasi surat, 8F2b): peran `publik` tanpa konteks desa. Peran itu tidak membaca tabel desa
      // mana pun; ia hanya boleh memanggil fungsi SECURITY DEFINER yang sempit (migrasi 0013).
      peran = 'publik'
    } else if (alamat.desa) {
      peran = 'desa'
      konteks = { desaId: alamat.desa.desa.id }
    } else if (alamat.konteks.jenis === 'konsol') {
      peran = 'konsol'
    } else if (alamat.konteks.jenis === 'kabupaten' && alamat.kabupaten?.mitra) {
      peran = 'kabupaten'
    }
    if (peran === null) {
      c.set('dbTransaksi', null)
      await next()
      return
    }
    try {
      await deps.klien.dalamTransaksi(peran, konteks, async (db) => {
        c.set('dbTransaksi', db)
        await next()
        if ((c.error && !(c.error instanceof GalatDisimpan)) || c.res.status >= 500) throw new BatalkanTransaksi()
      })
    } catch (galat) {
      if (!(galat instanceof BatalkanTransaksi)) throw galat
    } finally {
      c.set('dbTransaksi', null)
    }
  }
}
