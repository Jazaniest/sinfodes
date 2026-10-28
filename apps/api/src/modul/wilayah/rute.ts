import { Hono } from 'hono'
import { butuhAkses } from '../../lapisan/akses'
import type { LingkunganApp } from '../../lapisan/konteks'
import { aturWilayah, wilayahDesa } from './layanan'

const TIDAK_BERHAK = 'Peran Anda tidak berhak membuka Pengaturan desa.'

/** `/api/v1/pengaturan/wilayah`: istilah wilayah dan pohon dusun, RW, RT desa (SPEC-V0.2 §8). */
export function ruteWilayah(): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()

  rute.get('/', async (c) => {
    const { db, desa } = butuhAkses(c, 'pengaturan.kelola', TIDAK_BERHAK)
    return c.json(await wilayahDesa(db, desa.desa.id))
  })

  rute.put('/', async (c) => {
    const { db, desa } = butuhAkses(c, 'pengaturan.kelola', TIDAK_BERHAK)
    return c.json(await aturWilayah({ db, desa: desa.desa }, await c.req.json().catch(() => null)))
  })

  return rute
}
