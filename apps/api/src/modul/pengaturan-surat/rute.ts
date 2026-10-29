import { Hono } from 'hono'
import { butuhAkses } from '../../lapisan/akses'
import type { LingkunganApp } from '../../lapisan/konteks'
import { ambilPenomoran, simpanPenomoran } from './penomoran'
import { ambilTataLetak, simpanTataLetak } from './tata-letak'

const TIDAK_BERHAK = 'Peran Anda tidak berhak membuka Pengaturan desa.'

/** `/api/v1/surat/tata-letak`: tata letak surat desa (SPEC-V0.2 §12.2). Semuanya `pengaturan.kelola`. */
export function ruteTataLetakSurat(): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()

  rute.get('/', async (c) => {
    const { db, desa } = butuhAkses(c, 'pengaturan.kelola', TIDAK_BERHAK)
    return c.json(await ambilTataLetak({ db, desaId: desa.desa.id }))
  })

  rute.put('/', async (c) => {
    const { db, desa } = butuhAkses(c, 'pengaturan.kelola', TIDAK_BERHAK)
    return c.json(await simpanTataLetak({ db, desaId: desa.desa.id }, await c.req.json().catch(() => null)))
  })

  return rute
}

/** `/api/v1/pengaturan/penomoran`: format nomor surat, urutan, dan kode desa (SPEC-V0.2 §8). Semuanya `pengaturan.kelola`. */
export function rutePenomoran(): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()

  rute.get('/', async (c) => {
    const { db, desa } = butuhAkses(c, 'pengaturan.kelola', TIDAK_BERHAK)
    return c.json(await ambilPenomoran({ db, desaId: desa.desa.id, sekarang: c.get('waktu')() }))
  })

  rute.put('/', async (c) => {
    const { db, desa } = butuhAkses(c, 'pengaturan.kelola', TIDAK_BERHAK)
    return c.json(await simpanPenomoran({ db, desaId: desa.desa.id, sekarang: c.get('waktu')() }, await c.req.json().catch(() => null)))
  })

  return rute
}
