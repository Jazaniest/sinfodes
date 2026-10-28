import { isiBukuSchema, ringkasBukuSchema } from '@sinfodes/kontrak/buku/schema'
import { boleh } from '@sinfodes/kontrak/pengguna/hak-akses'
import { Hono } from 'hono'
import { z } from 'zod'
import { GalatApp } from '../../galat'
import type { Penyandi } from '../../kripto/penyandi'
import { butuhSesi } from '../../lapisan/akses'
import type { LingkunganApp } from '../../lapisan/konteks'
import { daftarBuku, isiBuku } from './layanan'

export function ruteBuku(deps: { penyandi: Penyandi }): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()

  rute.get('/', async (c) => {
    const { db, pelaku, desa } = butuhSesi(c)
    if (!boleh(pelaku.peran, 'buku.lihat')) throw new GalatApp('FORBIDDEN', 'Peran Anda tidak berhak membuka Buku Administrasi.', 403)
    const buku = await daftarBuku({ db, penyandi: deps.penyandi, pelaku, hariIni: c.get('waktu')(), desaId: desa.desa.id })
    return c.json(z.array(ringkasBukuSchema).parse(buku))
  })

  rute.get('/:kode', async (c) => {
    const { db, pelaku, desa } = butuhSesi(c)
    // Urutan pemeriksaan tiruan: buku, hak, sumber, baru filter (semuanya di `isiBuku`).
    const hasil = await isiBuku(
      { db, penyandi: deps.penyandi, pelaku, hariIni: c.get('waktu')(), desaId: desa.desa.id },
      c.req.param('kode'),
      Object.fromEntries(new URL(c.req.url).searchParams),
    )
    return c.json(isiBukuSchema.parse(hasil))
  })

  return rute
}
