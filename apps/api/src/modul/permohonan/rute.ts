import { AKSI_SURAT, cariPermohonanSchema, filterPermohonanSchema } from '@sinfodes/kontrak/surat/permohonan'
import { Hono, type Context } from 'hono'
import { GalatApp } from '../../galat'
import { galatIsian } from '../../galat-isian'
import type { Penyandi } from '../../kripto/penyandi'
import { butuhAkses, PESAN_PANEL_DITANGGUHKAN } from '../../lapisan/akses'
import type { LingkunganApp } from '../../lapisan/konteks'
import { antreanTandaTangan, cariPermohonan, daftarPermohonan, detailPermohonan, jumlahPermohonan, permohonanPerPenduduk, type KonteksPermohonan } from './layanan'
import type { EfekSurat } from './efek-surat'
import type { Pengirim } from './pengirim'
import type { Penandatangan } from './penandatangan'
import { buatPermohonan, jalankanAksi, PESAN_AKSI_TIDAK_DIKENAL, ubahPermohonan } from './layanan-tulis'
import { saranSurat } from './saran'

const TIDAK_BOLEH_LIHAT = 'Peran Anda tidak berhak membuka Layanan Surat.'
const TIDAK_BOLEH_TANDATANGANI = 'Peran Anda tidak menandatangani surat.'
const TIDAK_BOLEH_MEMBUAT = 'Peran Anda tidak berhak membuat surat.'
const TIDAK_BOLEH_MENGUBAH = 'Peran Anda tidak berhak mengubah permohonan.'
const filterJumlahSchema = filterPermohonanSchema.pick({ periode: true, jenis: true })
const kueri = (c: Context<LingkunganApp>) => Object.fromEntries(new URL(c.req.url).searchParams)

/**
 * `/api/v1/permohonan`: permohonan surat desa (SPEC §7.4). Rute berjalan dipasang sebelum `/:id` supaya `jumlah` dan
 * `antrian-ttd` tidak terbaca sebagai ID. Membuat dari loket dan menyunting butuh `surat.proses`; membaca butuh `surat.lihat`.
 */
export function rutePermohonan(deps: { penyandi: Penyandi; efek: EfekSurat; penandatangan: Penandatangan; pengirim: Pengirim; acak: () => number }): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()
  const baca = (c: Context<LingkunganApp>): KonteksPermohonan => {
    const { db, pelaku } = butuhAkses(c, 'surat.lihat', TIDAK_BOLEH_LIHAT)
    return { db, penyandi: deps.penyandi, pelaku, hariIni: c.get('waktu')() }
  }

  rute.get('/', async (c) => {
    const k = baca(c)
    const filter = filterPermohonanSchema.safeParse(kueri(c))
    if (!filter.success) throw new GalatApp('VALIDATION', 'Filter tidak valid.', 422)
    return c.json(await daftarPermohonan(k, filter.data))
  })

  rute.get('/jumlah', async (c) => {
    const k = baca(c)
    const filter = filterJumlahSchema.safeParse(kueri(c))
    if (!filter.success) throw new GalatApp('VALIDATION', 'Filter tidak valid.', 422)
    return c.json(await jumlahPermohonan(k, filter.data))
  })

  rute.get('/antrian-ttd', async (c) => {
    const { db, pelaku } = butuhAkses(c, 'surat.tandatangani', TIDAK_BOLEH_TANDATANGANI)
    return c.json(await antreanTandaTangan({ db, penyandi: deps.penyandi, pelaku, hariIni: c.get('waktu')() }))
  })

  // Murni baca walau metodenya POST (kata cari tidak boleh masuk URL): terdaftar di JALUR_CARI_BACA sesi bantuan.
  rute.post('/cari', async (c) => {
    const k = baca(c)
    const isian = cariPermohonanSchema.safeParse(await c.req.json().catch(() => null))
    if (!isian.success) throw galatIsian(isian.error)
    return c.json(await cariPermohonan(k, isian.data.kata, isian.data.jenis))
  })

  rute.get('/saran', async (c) => {
    const { db, desa } = butuhAkses(c, 'surat.proses', TIDAK_BOLEH_MEMBUAT)
    return c.json(await saranSurat({ db, penyandi: deps.penyandi }, desa.desa.id, kueri(c)))
  })

  const tulis = (c: Context<LingkunganApp>, pesan: string) => {
    const { db, pelaku, desa } = butuhAkses(c, 'surat.proses', pesan)
    return { db, penyandi: deps.penyandi, pelaku, desa: desa.desa, sekarang: c.get('waktu')() }
  }

  rute.post('/', async (c) => c.json(await buatPermohonan(tulis(c, TIDAK_BOLEH_MEMBUAT), await c.req.json().catch(() => null))))

  rute.patch('/:id', async (c) => c.json(await ubahPermohonan(tulis(c, TIDAK_BOLEH_MENGUBAH), c.req.param('id'), await c.req.json().catch(() => null))))

  // Aksi dibuka dengan `surat.lihat` (hak per aksi diperiksa `jalankanAksi`), jadi gerbang `butuhAkses` tidak menutup desa Ditangguhkan
  // untuk metode POST: status desa diperiksa di sini, sama dengan `tolakBilaDitangguhkan` API tiruan. Urutan pemeriksaan = tiruan.
  rute.post('/:id/:aksi', async (c) => {
    const aksi = AKSI_SURAT.find((a) => a === c.req.param('aksi'))
    if (!aksi) throw new GalatApp('NOT_FOUND', PESAN_AKSI_TIDAK_DIKENAL, 404)
    const { db, pelaku, desa } = butuhAkses(c, 'surat.lihat', TIDAK_BOLEH_LIHAT)
    if (desa.desa.status === 'Ditangguhkan') throw new GalatApp('FORBIDDEN', PESAN_PANEL_DITANGGUHKAN, 403)
    const badan = (await c.req.json().catch(() => null)) ?? {}
    return c.json(await jalankanAksi({ db, penyandi: deps.penyandi, pelaku, desa: desa.desa, sekarang: c.get('waktu')(), efek: deps.efek, penandatangan: deps.penandatangan, pengirim: deps.pengirim, acak: deps.acak }, c.req.param('id'), aksi, badan))
  })

  rute.get('/penduduk/:id', async (c) => c.json(await permohonanPerPenduduk(baca(c), c.req.param('id'))))

  rute.get('/:id', async (c) => c.json(await detailPermohonan(baca(c), c.req.param('id'))))

  return rute
}
