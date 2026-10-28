import { randomBytes } from 'node:crypto'
import { tiketBantuanSchema } from '@sinfodes/kontrak/konsol/schema'
import { Hono, type Context } from 'hono'
import { z } from 'zod'
import { catatAudit, catatAuditPlatform } from '../../audit'
import { cariSlugDesaMenurutId } from '../../basisdata/desa'
import { badanGalat, GalatApp } from '../../galat'
import type { Konfigurasi } from '../../konfigurasi'
import { bentukTokenSah, buatTokenSesi, hashToken } from '../../kripto/token'
import { butuhSesiKonsol, dbTanpaPelaku, pelakuPanel } from '../../lapisan/akses'
import { PESAN_TERLALU_SERING, type BatasLaju } from '../../lapisan/batas-laju'
import type { LingkunganApp } from '../../lapisan/konteks'
import {
  aksesBerlakuDesa, cariSesiBantuanMenurutHash, klaimTiket, penggunaSesiBantuan, simpanSesiBantuan, simpanTiket,
} from '../../sesi/repositori-bantuan'
import { pasangKuki } from '../../sesi/toples'
import { cabutSesiPanel, susunSesiAdmin } from '../sesi/layanan'

/** Satu kalimat untuk semua sebab tiket gagal ditukar; sama dengan API tiruan (SPEC-V0.3 §8.6). */
export const PESAN_TIKET_TIDAK_BERLAKU = 'Tiket bantuan tidak berlaku. Minta ulang dari Konsol.'
/** Tiket dari Konsol harus ditukar dalam waktu ini, dan hanya sekali. */
export const UMUR_TIKET_MS = 60_000

const tiketSchema = z.object({ tiket: z.string() })

/**
 * Konsol menerbitkan tiket bantuan untuk desa yang sudah memberi akses (SPEC-V0.2 §5.2). Konsol hanya membaca status akses dan
 * menambah baris tiket; ia tidak pernah membaca data desa. Dipasang di `/api/v1/konsol/desa`.
 */
export function ruteTiketBantuan(deps: { batasTiket: BatasLaju }): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()

  rute.post('/:id/tiket-bantuan', async (c) => {
    const { db, pelaku } = butuhSesiKonsol(c)
    const akun = pelaku.pengguna.id
    if (deps.batasTiket.tercapai(akun)) throw new GalatApp('RATE_LIMITED', PESAN_TERLALU_SERING, 429)
    deps.batasTiket.catat(akun)
    const desaId = c.req.param('id')
    const slug = await cariSlugDesaMenurutId(db, desaId)
    if (slug === null) throw new GalatApp('NOT_FOUND', 'Desa tidak ditemukan.', 404)
    const sekarang = c.get('waktu')()
    const akses = await aksesBerlakuDesa(db, desaId, sekarang)
    if (!akses) throw new GalatApp('CONFLICT', 'Desa belum memberi akses bantuan.', 409)
    const { token, hash } = buatTokenSesi()
    await simpanTiket(db, {
      id: `tkt_${randomBytes(12).toString('base64url')}`,
      desaId,
      aksesId: akses.id,
      tokenHash: hash,
      olehId: akun,
      olehNama: pelaku.pengguna.nama,
      sekarang,
      umurMs: UMUR_TIKET_MS,
    })
    await catatAuditPlatform(db, { jenis: 'akses_bantuan.tiket', pelaku: akun, waktu: sekarang, ringkasan: { desaId, aksesId: akses.id } })
    return c.json(tiketBantuanSchema.parse({ tiket: token, alamat: slug }))
  })

  return rute
}

export type DepsTukarTiket = { konfigurasi: Konfigurasi; batasTukar: BatasLaju; ipKlien: (c: Context) => string }

/**
 * Menukar tiket menjadi sesi bantuan di alamat desa pemberi akses. Semua sebab gagal menjawab 401 yang sama tanpa cookie.
 * Dipasang di `/api/v1/sesi/bantuan`.
 */
export function ruteTukarTiket(deps: DepsTukarTiket): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()
  const awalan = deps.konfigurasi.cookieAwalan

  rute.post('/', async (c) => {
    const { db, desa } = dbTanpaPelaku(c)
    const ip = deps.ipKlien(c)
    if (deps.batasTukar.tercapai(ip)) throw new GalatApp('RATE_LIMITED', PESAN_TERLALU_SERING, 429)
    deps.batasTukar.catat(ip)
    // Dikembalikan (bukan dilempar) supaya transaksi tidak dibatalkan.
    const tidakBerlaku = () => c.json(badanGalat('UNAUTHENTICATED', PESAN_TIKET_TIDAK_BERLAKU), 401)

    const isian = tiketSchema.safeParse(await c.req.json().catch(() => null))
    if (!isian.success || !bentukTokenSah(isian.data.tiket)) return tidakBerlaku()
    const sekarang = c.get('waktu')()
    const klaim = await klaimTiket(db, hashToken(isian.data.tiket), sekarang)
    if (!klaim) return tidakBerlaku()

    // Sesi lama dari peramban yang sama dicabut, seperti masuk panel: tidak ada dua sesi hidup dari satu peramban.
    const lama = pelakuPanel(c)
    if (lama) await cabutSesiPanel(db, lama, sekarang)
    const { token, hash } = buatTokenSesi()
    const sesiId = `sbt_${randomBytes(12).toString('base64url')}`
    await simpanSesiBantuan(db, { id: sesiId, desaId: desa.desa.id, aksesId: klaim.aksesId, tokenHash: hash, olehId: klaim.olehId, olehNama: klaim.olehNama, sekarang })
    await catatAudit(db, {
      desaId: desa.desa.id,
      jenis: 'akses_bantuan.pakai',
      pelaku: null,
      waktu: sekarang,
      ringkasan: { aksesId: klaim.aksesId, sesiId, olehKonsolId: klaim.olehId },
    })
    const temu = await cariSesiBantuanMenurutHash(db, hash)
    if (!temu) throw new Error('Sesi bantuan yang baru dibuat tidak ditemukan.')
    // Badan sesi disusun lebih dulu; cookie baru dipasang sesudahnya supaya jawaban 500 tidak membawa Set-Cookie.
    const sesi = await susunSesiAdmin(db, desa, penggunaSesiBantuan(temu.sesi), {
      sampai: temu.akses.sampai,
      sembunyikanDataPribadi: temu.akses.sembunyikanDataPribadi,
    })
    pasangKuki(c, 'panel', awalan, token)
    return c.json({ sesi })
  })

  return rute
}
