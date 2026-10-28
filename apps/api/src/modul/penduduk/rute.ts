import { filterPendudukSchema } from '@sinfodes/kontrak/penduduk/filter'
import { ringkasanPendudukSchema } from '@sinfodes/kontrak/penduduk/schema'
import { Hono } from 'hono'
import { z } from 'zod'
import { GalatApp } from '../../galat'
import type { Penyandi } from '../../kripto/penyandi'
import { butuhAkses } from '../../lapisan/akses'
import type { LingkunganApp } from '../../lapisan/konteks'
import { bacaRiwayatPenduduk, daftarPenduduk, detailPenduduk, ringkasanPenduduk } from './layanan'
import { eksporPenduduk } from './ekspor'
import { cekNik, tambahPenduduk, ubahPenduduk } from './layanan-tulis'

const TIDAK_BERHAK = 'Peran Anda tidak berhak melihat data penduduk.'
const TIDAK_BERHAK_UBAH = 'Peran Anda tidak berhak mengubah data kependudukan.'
const cariSchema = z.object({ kata: z.string().trim().min(1).max(100), filter: filterPendudukSchema })

export function rutePenduduk(deps: { penyandi: Penyandi }): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()

  rute.get('/ringkasan', async (c) => {
    const { db, pelaku } = butuhAkses(c, 'penduduk.lihat', TIDAK_BERHAK)
    return c.json(ringkasanPendudukSchema.parse(await ringkasanPenduduk({ db, pelaku })))
  })

  rute.get('/', async (c) => {
    const { db, pelaku } = butuhAkses(c, 'penduduk.lihat', TIDAK_BERHAK)
    const filter = filterPendudukSchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams))
    if (!filter.success) throw new GalatApp('VALIDATION', 'Filter tidak valid.', 422)
    return c.json(await daftarPenduduk({ db, penyandi: deps.penyandi, pelaku, hariIni: c.get('waktu')() }, filter.data, null))
  })

  rute.post('/cari', async (c) => {
    const { db, pelaku } = butuhAkses(c, 'penduduk.lihat', TIDAK_BERHAK)
    const isian = cariSchema.safeParse(await c.req.json().catch(() => null))
    if (!isian.success) throw new GalatApp('VALIDATION', 'Kata pencarian atau filter tidak valid.', 422)
    return c.json(await daftarPenduduk({ db, penyandi: deps.penyandi, pelaku, hariIni: c.get('waktu')() }, isian.data.filter, isian.data.kata))
  })

  // Ekspor berbentuk POST (kata cari tidak boleh masuk URL) tetapi mencatat jejak dan mengeluarkan data pribadi massal:
  // sengaja TIDAK masuk JALUR_CARI_BACA, jadi sesi bantuan Tim Sinfodes tidak pernah bisa mengunduh.
  rute.post('/ekspor', async (c) => {
    const { db, pelaku, desa } = butuhAkses(c, 'penduduk.lihat', TIDAK_BERHAK)
    const mentah = await c.req.json().catch(() => null)
    return c.json(await eksporPenduduk({ db, penyandi: deps.penyandi, pelaku, hariIni: c.get('waktu')(), idDesa: desa.desa.id }, mentah))
  })

  const tulis = (c: Parameters<typeof butuhAkses>[0]) => {
    const { db, pelaku, desa } = butuhAkses(c, 'penduduk.ubah', TIDAK_BERHAK_UBAH)
    return { db, penyandi: deps.penyandi, pelaku, desa: desa.desa, sekarang: c.get('waktu')() }
  }

  rute.post('/cek-nik', async (c) => c.json(await cekNik(tulis(c), await c.req.json().catch(() => null))))

  rute.post('/', async (c) => c.json(await tambahPenduduk(tulis(c), await c.req.json().catch(() => null)), 201))

  rute.patch('/:id', async (c) => c.json(await ubahPenduduk(tulis(c), c.req.param('id'), await c.req.json().catch(() => null))))

  rute.get('/:id/riwayat', async (c) => {
    const { db, pelaku } = butuhAkses(c, 'penduduk.lihat', TIDAK_BERHAK)
    return c.json(await bacaRiwayatPenduduk({ db, penyandi: deps.penyandi, pelaku }, c.req.param('id')))
  })

  rute.get('/:id', async (c) => {
    const { db, pelaku } = butuhAkses(c, 'penduduk.lihat', TIDAK_BERHAK)
    return c.json(await detailPenduduk({ db, penyandi: deps.penyandi, pelaku }, c.req.param('id')))
  })

  return rute
}
