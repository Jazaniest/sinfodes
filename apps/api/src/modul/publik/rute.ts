import { Hono, type Context } from 'hono'
import { GalatApp } from '../../galat'
import { dbPublik, PESAN_WEBSITE_TIDAK_ADA } from '../../lapisan/akses'
import { PESAN_TERLALU_SERING, type BatasLaju } from '../../lapisan/batas-laju'
import type { LingkunganApp } from '../../lapisan/konteks'
import { verifikasiKode } from './layanan'

export type DepsRutePublik = {
  /** Permintaan verifikasi per IP di memori (30 per menit); pengunci per desa ada di basis data. */
  batasIp: BatasLaju
  ipKlien: (c: Context) => string
}

/**
 * `/api/v1/publik`: rute tanpa sesi yang berjalan di transaksi peran `publik`. Di alamat desa saja, dan `:slug` harus slug desa
 * alamat itu (SPEC-V0.2 §4.5): website desa lain tidak bisa dijangkau lewat alamat desa ini.
 */
export function rutePublik(deps: DepsRutePublik): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()

  rute.post('/:slug/verifikasi', async (c) => {
    const { db, desa } = dbPublik(c)
    if (c.req.param('slug') !== desa.desa.slug) throw new GalatApp('NOT_FOUND', PESAN_WEBSITE_TIDAK_ADA, 404)
    // Setiap permintaan dihitung, benar atau salah, sebelum pekerjaan apa pun.
    const ip = deps.ipKlien(c)
    if (deps.batasIp.tercapai(ip)) throw new GalatApp('RATE_LIMITED', PESAN_TERLALU_SERING, 429)
    deps.batasIp.catat(ip)
    const hasil = await verifikasiKode({ db, desaId: desa.desa.id, sekarang: c.get('waktu')() }, await c.req.json().catch(() => null))
    return c.json(hasil)
  })

  return rute
}
