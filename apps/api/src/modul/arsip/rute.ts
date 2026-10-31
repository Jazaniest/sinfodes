import { filterSuratKeluarSchema, filterSuratMasukSchema } from '@sinfodes/kontrak/surat/arsip'
import { Hono, type Context } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { jawabBerkas, PESAN_BERKAS_BANTUAN } from '../../berkas/jawab'
import { badanGalat, GalatApp } from '../../galat'
import { galatIsian } from '../../galat-isian'
import type { Penyandi } from '../../kripto/penyandi'
import { butuhAkses } from '../../lapisan/akses'
import type { LingkunganApp } from '../../lapisan/konteks'
import { bukaScan, catatSuratMasuk, daftarSuratKeluar, daftarSuratMasuk, type KonteksArsip } from './layanan'

const TIDAK_BOLEH_LIHAT = 'Peran Anda tidak berhak membuka Layanan Surat.'
const TIDAK_BOLEH_MENCATAT = 'Peran Anda tidak berhak mencatat surat masuk.'
const kueri = (c: Context<LingkunganApp>) => Object.fromEntries(new URL(c.req.url).searchParams)

/** Jalur pencatatan surat masuk: rute dengan batas badan lebih besar dari bawaan (pindaian 5 MB beserta sampul multipart). */
export const JALUR_CATAT_SURAT_MASUK = '/api/v1/surat-masuk'
export const BATAS_BADAN_SURAT_MASUK = 6 * 1024 * 1024

/**
 * Arsip Layanan Surat (SPEC §7.4 layar 5, rencana 8F3): surat keluar (dari permohonan terbit), register surat masuk beserta
 * pindaiannya. Dipasang di `/api/v1`. Membaca butuh `surat.lihat`; mencatat butuh `surat.proses`.
 */
export function ruteArsip(deps: { penyandi: Penyandi }): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()
  const baca = (c: Context<LingkunganApp>): KonteksArsip => {
    const { db, pelaku, desa } = butuhAkses(c, 'surat.lihat', TIDAK_BOLEH_LIHAT)
    return { db, penyandi: deps.penyandi, pelaku, desa: desa.desa, sekarang: c.get('waktu')() }
  }

  rute.get('/surat-keluar', async (c) => {
    const k = baca(c)
    const q = kueri(c)
    const filter = filterSuratKeluarSchema.safeParse(q)
    if (!filter.success) throw galatIsian(filter.error)
    return c.json(await daftarSuratKeluar(k, filter.data, q.semua === '1'))
  })

  rute.get('/surat-masuk', async (c) => {
    const k = baca(c)
    const filter = filterSuratMasukSchema.safeParse(kueri(c))
    if (!filter.success) throw galatIsian(filter.error)
    return c.json(await daftarSuratMasuk(k, filter.data))
  })

  rute.post(
    '/surat-masuk',
    bodyLimit({ maxSize: BATAS_BADAN_SURAT_MASUK, onError: (c) => c.json(badanGalat('VALIDATION', 'Isi permintaan terlalu besar.'), 413) }),
    async (c) => {
      const { db, pelaku, desa } = butuhAkses(c, 'surat.proses', TIDAK_BOLEH_MENCATAT)
      const form = await c.req.formData().catch(() => null)
      return c.json(await catatSuratMasuk({ db, penyandi: deps.penyandi, pelaku, desa: desa.desa, sekarang: c.get('waktu')() }, form), 201)
    },
  )

  // Pindaian memuat data pribadi sebagai piksel: sesi bantuan Tim Sinfodes ditolak walau hanya membaca (8F3 Ruling 7).
  rute.get('/surat-masuk/:id/scan', async (c) => {
    const k = baca(c)
    if (k.pelaku.bantuan) throw new GalatApp('FORBIDDEN', PESAN_BERKAS_BANTUAN, 403)
    const { tipe, nama, bita } = await bukaScan(k, c.req.param('id'))
    return jawabBerkas(tipe, nama, bita)
  })

  return rute
}
