import { Hono } from 'hono'
import { butuhAkses } from '../../lapisan/akses'
import type { LingkunganApp } from '../../lapisan/konteks'
import { statistikPenduduk } from './layanan'

const TIDAK_BERHAK = 'Peran Anda tidak berhak melihat statistik penduduk.'

export function ruteStatistik(): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()

  rute.get('/penduduk', async (c) => {
    const { db, pelaku, desa } = butuhAkses(c, 'penduduk.lihat', TIDAK_BERHAK)
    const dusun = new URL(c.req.url).searchParams.get('dusun')
    return c.json(await statistikPenduduk({ db, pelaku, hariIni: c.get('waktu')(), desaId: desa.desa.id }, dusun))
  })

  return rute
}
