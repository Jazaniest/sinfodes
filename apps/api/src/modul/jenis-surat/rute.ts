import { Hono } from 'hono'
import { butuhAkses } from '../../lapisan/akses'
import type { LingkunganApp } from '../../lapisan/konteks'
import { aktifkanLagiJenis, arsipkanJenis, bacaStatusJenis, daftarJenis, detailJenis, hapusJenis, tambahJenis, ubahJenis } from './layanan'

const TIDAK_BOLEH_LIHAT = 'Peran Anda tidak berhak membuka Layanan Surat.'
const TIDAK_BOLEH_UBAH = 'Peran Anda tidak berhak mengubah jenis surat.'

/**
 * `/api/v1/jenis-surat`: katalog jenis surat desa (SPEC-V0.2 §12.1). Membaca butuh `surat.lihat`; menambah, menyunting,
 * menghapus, mengarsipkan, dan mengaktifkan lagi butuh `pengaturan.kelola`.
 */
export function ruteJenisSurat(): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()

  rute.get('/', async (c) => {
    const { db, desa } = butuhAkses(c, 'surat.lihat', TIDAK_BOLEH_LIHAT)
    return c.json(await daftarJenis({ db, desaId: desa.desa.id }, bacaStatusJenis(c.req.query('status'))))
  })

  rute.get('/:id', async (c) => {
    const { db, desa } = butuhAkses(c, 'surat.lihat', TIDAK_BOLEH_LIHAT)
    return c.json(await detailJenis({ db, desaId: desa.desa.id, sekarang: c.get('waktu')() }, c.req.param('id')))
  })

  rute.post('/', async (c) => {
    const { db, desa } = butuhAkses(c, 'pengaturan.kelola', TIDAK_BOLEH_UBAH)
    return c.json(await tambahJenis({ db, desaId: desa.desa.id }, await c.req.json().catch(() => null)), 201)
  })

  rute.patch('/:id', async (c) => {
    const { db, desa } = butuhAkses(c, 'pengaturan.kelola', TIDAK_BOLEH_UBAH)
    return c.json(await ubahJenis({ db, desaId: desa.desa.id, sekarang: c.get('waktu')() }, c.req.param('id'), await c.req.json().catch(() => null)))
  })

  rute.delete('/:id', async (c) => {
    const { db, desa } = butuhAkses(c, 'pengaturan.kelola', TIDAK_BOLEH_UBAH)
    return c.json(await hapusJenis({ db, desaId: desa.desa.id }, c.req.param('id')))
  })

  rute.post('/:id/arsipkan', async (c) => {
    const { db, desa } = butuhAkses(c, 'pengaturan.kelola', TIDAK_BOLEH_UBAH)
    return c.json(await arsipkanJenis({ db, desaId: desa.desa.id, sekarang: c.get('waktu')() }, c.req.param('id')))
  })

  rute.post('/:id/aktifkan-lagi', async (c) => {
    const { db } = butuhAkses(c, 'pengaturan.kelola', TIDAK_BOLEH_UBAH)
    return c.json(await aktifkanLagiJenis({ db }, c.req.param('id')))
  })

  return rute
}
