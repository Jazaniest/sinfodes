import { Hono } from 'hono'
import { z } from 'zod'
import { GalatApp } from '../../galat'
import type { Penyandi } from '../../kripto/penyandi'
import { butuhSesi } from '../../lapisan/akses'
import type { LingkunganApp } from '../../lapisan/konteks'
import { cariGlobal } from './layanan'

const cariSchema = z.object({ kata: z.string().trim().max(100) })

export function ruteCari(deps: { penyandi: Penyandi }): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()

  // Murni baca walau metodenya POST (kata cari tidak boleh masuk URL): terdaftar di JALUR_CARI_BACA sesi bantuan. Hak penduduk
  // dan surat dinilai per jenis di `cariGlobal`, jadi peran tanpa hak mendapat jawaban kosong, bukan 403 (seperti tiruan).
  rute.post('/', async (c) => {
    const { db, pelaku } = butuhSesi(c)
    const isian = cariSchema.safeParse(await c.req.json().catch(() => null))
    if (!isian.success) throw new GalatApp('VALIDATION', 'Kata pencarian tidak valid.', 422)
    return c.json(await cariGlobal({ db, penyandi: deps.penyandi, pelaku, hariIni: c.get('waktu')() }, isian.data.kata))
  })

  return rute
}
