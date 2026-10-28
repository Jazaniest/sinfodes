import { bodyLimit } from 'hono/body-limit'
import { Hono } from 'hono'
import { z } from 'zod'
import { badanGalat, GalatApp } from '../../galat'
import type { Penyandi } from '../../kripto/penyandi'
import { butuhAkses } from '../../lapisan/akses'
import type { LingkunganApp } from '../../lapisan/konteks'
import { BATAS_IMPOR } from './baca-berkas'
import { konfirmasiImpor } from './konfirmasi'
import { unggahImpor, type MasukanUnggah } from './layanan'

const TIDAK_BERHAK_UBAH = 'Peran Anda tidak berhak mengubah data kependudukan.'

/** Jalur unggahan berkas: satu-satunya rute dengan batas badan lebih besar dari bawaan (10 MB berkas + sampul multipart). */
export const JALUR_UNGGAH_IMPOR = '/api/v1/impor/penduduk'
export const BATAS_BADAN_IMPOR = BATAS_IMPOR.ukuranBait + 1024 * 1024

const contohSchema = z.object({ contoh: z.literal(true) })

export function ruteImpor(deps: { penyandi: Penyandi }): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()

  rute.post(
    '/penduduk',
    bodyLimit({ maxSize: BATAS_BADAN_IMPOR, onError: (c) => c.json(badanGalat('VALIDATION', 'Isi permintaan terlalu besar.'), 413) }),
    async (c) => {
      const { db, pelaku, desa } = butuhAkses(c, 'penduduk.ubah', TIDAK_BERHAK_UBAH)
      const bacaMasukan = async (): Promise<MasukanUnggah> => {
        if ((c.req.header('Content-Type') ?? '').includes('application/json')) {
          if (!contohSchema.safeParse(await c.req.json().catch(() => null)).success) throw new GalatApp('VALIDATION', 'Pilih berkas Excel atau CSV.', 422)
          return { jenis: 'contoh' }
        }
        try {
          const berkas = (await c.req.formData()).get('berkas')
          if (berkas instanceof File) return { jenis: 'berkas', nama: berkas.name, isi: new Uint8Array(await berkas.arrayBuffer()) }
        } catch {
          // Bukan multipart yang sah: ditangani di bawah.
        }
        throw new GalatApp('VALIDATION', 'Berkas tidak terbaca. Pilih berkas .xlsx atau .csv.', 422, { berkas: 'Berkas tidak terbaca' })
      }
      return c.json(await unggahImpor({ db, penyandi: deps.penyandi, pelaku, desa: desa.desa, sekarang: c.get('waktu')() }, bacaMasukan), 201)
    },
  )

  rute.post('/penduduk/:id/konfirmasi', async (c) => {
    const { db, pelaku, desa } = butuhAkses(c, 'penduduk.ubah', TIDAK_BERHAK_UBAH)
    const mentah = await c.req.json().catch(() => null)
    return c.json(await konfirmasiImpor({ db, penyandi: deps.penyandi, pelaku, desa: desa.desa, sekarang: c.get('waktu')() }, c.req.param('id'), mentah), 201)
  })

  return rute
}
