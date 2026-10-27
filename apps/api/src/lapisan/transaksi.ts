import type { MiddlewareHandler } from 'hono'
import type { KonteksDb, Klien, PeranDb } from '../basisdata/klien'
import type { LingkunganApp } from './konteks'

/** Penanda internal: membatalkan transaksi tanpa melempar galat ke pemanggil (jawabannya sudah dibentuk). */
class BatalkanTransaksi extends Error {}

/**
 * Satu transaksi per permintaan (SPEC-V0.3 §6.2, §7.4) dengan peran basis data menurut jenis alamat: desa memakai peran `desa`
 * dengan `sinfodes.desa_id` disetel lokal ke desa pemilik alamat (RLS, termasuk pencarian sesi); alamat Konsol memakai peran
 * `konsol`; alamat kabupaten mitra memakai peran `kabupaten`; alamat lain (induk, desa atau kabupaten tak dikenal) tidak membuka
 * transaksi. Bila permintaan berakhir dengan galat yang dilempar atau status 5xx, transaksi dibatalkan; jawaban 4xx yang
 * dikembalikan biasa (mis. masuk gagal beserta jejak auditnya) justru disimpan.
 *
 * Hono menangkap galat rute lewat `onError` sebelum kembali ke sini, jadi galat dikenali dari `c.error`, bukan `try/catch`.
 */
export function lapisanTransaksi(deps: { klien: Klien }): MiddlewareHandler<LingkunganApp> {
  return async (c, next) => {
    const alamat = c.get('alamat')
    let peran: PeranDb | null = null
    let konteks: KonteksDb = {}
    if (alamat.desa) {
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
        if (c.error || c.res.status >= 500) throw new BatalkanTransaksi()
      })
    } catch (galat) {
      if (!(galat instanceof BatalkanTransaksi)) throw galat
    } finally {
      c.set('dbTransaksi', null)
    }
  }
}
