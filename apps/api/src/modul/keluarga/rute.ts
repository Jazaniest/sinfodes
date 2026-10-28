import { filterKeluargaSchema } from '@sinfodes/kontrak/keluarga/schema'
import { Hono } from 'hono'
import { z } from 'zod'
import { GalatApp } from '../../galat'
import type { Penyandi } from '../../kripto/penyandi'
import { butuhAkses } from '../../lapisan/akses'
import type { LingkunganApp } from '../../lapisan/konteks'
import { daftarKeluarga, detailKeluarga } from './layanan'
import { gantiKepala, pecahKeluarga } from './layanan-tulis'

const TIDAK_BERHAK = 'Peran Anda tidak berhak melihat data keluarga.'
const TIDAK_BERHAK_UBAH = 'Peran Anda tidak berhak mengubah data kependudukan.'
const cariSchema = z.object({ kata: z.string().trim().min(1).max(100), filter: filterKeluargaSchema })

export function ruteKeluarga(deps: { penyandi: Penyandi }): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()

  rute.get('/', async (c) => {
    const { db, pelaku } = butuhAkses(c, 'penduduk.lihat', TIDAK_BERHAK)
    const filter = filterKeluargaSchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams))
    if (!filter.success) throw new GalatApp('VALIDATION', 'Filter tidak valid.', 422)
    return c.json(await daftarKeluarga({ db, penyandi: deps.penyandi, pelaku }, filter.data, null))
  })

  // Murni baca walau metodenya POST (kata cari tidak boleh masuk URL): terdaftar di JALUR_CARI_BACA sesi bantuan.
  rute.post('/cari', async (c) => {
    const { db, pelaku } = butuhAkses(c, 'penduduk.lihat', TIDAK_BERHAK)
    const isian = cariSchema.safeParse(await c.req.json().catch(() => null))
    if (!isian.success) throw new GalatApp('VALIDATION', 'Kata pencarian atau filter tidak valid.', 422)
    return c.json(await daftarKeluarga({ db, penyandi: deps.penyandi, pelaku }, isian.data.filter, isian.data.kata))
  })

  const tulis = (c: Parameters<typeof butuhAkses>[0]) => {
    const { db, pelaku, desa } = butuhAkses(c, 'penduduk.ubah', TIDAK_BERHAK_UBAH)
    return { db, penyandi: deps.penyandi, pelaku, desa: desa.desa, sekarang: c.get('waktu')() }
  }

  rute.post('/:id/ganti-kepala', async (c) => c.json(await gantiKepala(tulis(c), c.req.param('id'), await c.req.json().catch(() => null))))

  rute.post('/:id/pecah', async (c) => c.json(await pecahKeluarga(tulis(c), c.req.param('id'), await c.req.json().catch(() => null)), 201))

  rute.get('/:id', async (c) => {
    const { db, pelaku } = butuhAkses(c, 'penduduk.lihat', TIDAK_BERHAK)
    return c.json(await detailKeluarga({ db, penyandi: deps.penyandi, pelaku }, c.req.param('id')))
  })

  return rute
}
