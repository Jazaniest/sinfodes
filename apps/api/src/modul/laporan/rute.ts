import { filterLaporanSchema } from '@sinfodes/kontrak/laporan/schema'
import { Hono } from 'hono'
import { GalatApp } from '../../galat'
import type { Penyandi } from '../../kripto/penyandi'
import { butuhAkses } from '../../lapisan/akses'
import type { LingkunganApp } from '../../lapisan/konteks'
import { daftarLaporan, detailLaporan, terapkanLaporan, tolakLaporan } from './layanan'

const TIDAK_BERHAK = 'Peran Anda tidak berhak melihat laporan data warga.'
const TIDAK_BERHAK_UBAH = 'Peran Anda tidak berhak mengubah data kependudukan.'

export function ruteLaporan(deps: { penyandi: Penyandi }): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()

  rute.get('/', async (c) => {
    const { db, pelaku } = butuhAkses(c, 'penduduk.lihat', TIDAK_BERHAK)
    const filter = filterLaporanSchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams))
    if (!filter.success) throw new GalatApp('VALIDATION', 'Filter tidak valid.', 422)
    return c.json(await daftarLaporan({ db, penyandi: deps.penyandi, pelaku }, filter.data))
  })

  const tulis = (c: Parameters<typeof butuhAkses>[0]) => {
    const { db, pelaku, desa } = butuhAkses(c, 'penduduk.ubah', TIDAK_BERHAK_UBAH)
    return { db, penyandi: deps.penyandi, pelaku, desa: desa.desa, sekarang: c.get('waktu')() }
  }

  rute.post('/:id/terapkan', async (c) => c.json(await terapkanLaporan(tulis(c), c.req.param('id'))))

  rute.post('/:id/tolak', async (c) => c.json(await tolakLaporan(tulis(c), c.req.param('id'), await c.req.json().catch(() => null))))

  rute.get('/:id', async (c) => {
    const { db, pelaku } = butuhAkses(c, 'penduduk.lihat', TIDAK_BERHAK)
    return c.json(await detailLaporan({ db, penyandi: deps.penyandi, pelaku }, c.req.param('id')))
  })

  return rute
}
