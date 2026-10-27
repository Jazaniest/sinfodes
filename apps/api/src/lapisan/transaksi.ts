import type { MiddlewareHandler } from 'hono'
import type { Klien } from '../basisdata/klien'
import type { LingkunganApp } from './konteks'

/** Penanda internal: membatalkan transaksi tanpa melempar galat ke pemanggil (jawabannya sudah dibentuk). */
class BatalkanTransaksi extends Error {}

/**
 * Satu transaksi per permintaan untuk alamat desa (SPEC-V0.3 §6.2, §7.4): peran `desa` dengan `sinfodes.desa_id` disetel
 * lokal ke desa pemilik alamat, sehingga semua kueri permintaan ini, termasuk pencarian sesi, hanya melihat baris desa itu.
 * Bila permintaan berakhir dengan galat yang dilempar atau status 5xx, transaksi dibatalkan; jawaban 4xx yang dikembalikan
 * biasa (mis. masuk gagal beserta jejak auditnya) justru disimpan. Alamat selain desa tidak membuka transaksi.
 *
 * Hono menangkap galat rute lewat `onError` sebelum kembali ke sini, jadi galat dikenali dari `c.error`, bukan `try/catch`.
 */
export function lapisanTransaksi(deps: { klien: Klien }): MiddlewareHandler<LingkunganApp> {
  return async (c, next) => {
    const desa = c.get('alamat').desa
    if (!desa) {
      c.set('dbTransaksi', null)
      await next()
      return
    }
    try {
      await deps.klien.dalamTransaksi('desa', { desaId: desa.desa.id }, async (db) => {
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
