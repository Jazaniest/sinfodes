import { filterPendudukSchema } from '@sinfodes/kontrak/penduduk/filter'
import { ringkasanPendudukSchema } from '@sinfodes/kontrak/penduduk/schema'
import { Hono } from 'hono'
import { z } from 'zod'
import { GalatApp } from '../../galat'
import type { Penyandi } from '../../kripto/penyandi'
import { butuhAkses } from '../../lapisan/akses'
import type { LingkunganApp } from '../../lapisan/konteks'
import { daftarPenduduk, ringkasanPenduduk } from './layanan'

const TIDAK_BERHAK = 'Peran Anda tidak berhak melihat data penduduk.'
const cariSchema = z.object({ kata: z.string().trim().min(1).max(100), filter: filterPendudukSchema })
/** Perbedaan sengaja: tabel mutasi baru ada di 8E, jadi preset ini belum bisa dihitung dan ditolak dengan jelas. */
const PESAN_PRESET_BELUM_ADA = 'Filter "Pendatang tahun ini" belum tersedia di server ini.'

export function rutePenduduk(deps: { penyandi: Penyandi }): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()
  const tolakPresetBelumAda = (preset: string | undefined): void => {
    if (preset === 'pendatang-tahun-ini') throw new GalatApp('VALIDATION', PESAN_PRESET_BELUM_ADA, 422)
  }

  rute.get('/ringkasan', async (c) => {
    const { db, pelaku } = butuhAkses(c, 'penduduk.lihat', TIDAK_BERHAK)
    return c.json(ringkasanPendudukSchema.parse(await ringkasanPenduduk({ db, pelaku })))
  })

  rute.get('/', async (c) => {
    const { db, pelaku } = butuhAkses(c, 'penduduk.lihat', TIDAK_BERHAK)
    const filter = filterPendudukSchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams))
    if (!filter.success) throw new GalatApp('VALIDATION', 'Filter tidak valid.', 422)
    tolakPresetBelumAda(filter.data.preset)
    return c.json(await daftarPenduduk({ db, penyandi: deps.penyandi, pelaku, hariIni: c.get('waktu')() }, filter.data, null))
  })

  rute.post('/cari', async (c) => {
    const { db, pelaku } = butuhAkses(c, 'penduduk.lihat', TIDAK_BERHAK)
    const isian = cariSchema.safeParse(await c.req.json().catch(() => null))
    if (!isian.success) throw new GalatApp('VALIDATION', 'Kata pencarian atau filter tidak valid.', 422)
    tolakPresetBelumAda(isian.data.filter.preset)
    return c.json(await daftarPenduduk({ db, penyandi: deps.penyandi, pelaku, hariIni: c.get('waktu')() }, isian.data.filter, isian.data.kata))
  })

  return rute
}
