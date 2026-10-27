import { randomBytes } from 'node:crypto'
import { Hono, type Context } from 'hono'
import { z } from 'zod'
import { catatAudit } from '../../audit'
import { badanGalat, GalatApp } from '../../galat'
import type { Konfigurasi } from '../../konfigurasi'
import { periksaKataSandi, periksaTerhadapPalsu } from '../../kripto/kata-sandi'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'
import { buatTokenSesi } from '../../kripto/token'
import { butuhSesi, dbTanpaPelaku, pelakuPanel } from '../../lapisan/akses'
import { PESAN_TERLALU_SERING, type BatasLaju } from '../../lapisan/batas-laju'
import type { LingkunganApp } from '../../lapisan/konteks'
import { catatGagal, hapusKunci, periksaKunci, type RuangKunci } from '../../sesi/kunci-masuk'
import { cabutSesi, cariPenggunaMenurutEmail, penggunaSesiDari, simpanSesi } from '../../sesi/repositori'
import { hapusKuki, pasangKuki } from '../../sesi/toples'
import { susunSesiAdmin, type AlasanGagal } from './layanan'

const masukSchema = z.object({ email: z.string().min(1), kataSandi: z.string().min(1) })
/** Batas panjang isian masuk: email paling panjang 254 karakter; isian lebih panjang tidak masuk memori pembatas laju. */
const BATAS_EMAIL = 254
const BATAS_KATA_SANDI = 1000
/** Satu pesan untuk semua sebab gagal masuk: jawaban tidak boleh membedakan akun (SPEC-V0.3 §15.1). */
const PESAN_MASUK_GAGAL = 'Email atau kata sandi salah.'

export type DepsRuteSesi = {
  konfigurasi: Konfigurasi
  penyandi: Penyandi
  /** Kegagalan masuk per IP di memori; kunci per akun ada di PostgreSQL (`kunci_masuk_desa`). */
  batasIp: BatasLaju
  ipKlien: (c: Context) => string
}

export function ruteSesi(deps: DepsRuteSesi): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()
  const awalan = deps.konfigurasi.cookieAwalan

  rute.post('/masuk', async (c) => {
    const { db, desa } = dbTanpaPelaku(c)
    const isian = masukSchema.safeParse(await c.req.json().catch(() => null))
    if (!isian.success) throw new GalatApp('VALIDATION', 'Email dan kata sandi wajib diisi.', 422)
    if (isian.data.email.length > BATAS_EMAIL || isian.data.kataSandi.length > BATAS_KATA_SANDI) throw new GalatApp('VALIDATION', 'Isian terlalu panjang.', 422)
    const email = isian.data.email.trim().toLowerCase()
    const kunciIp = deps.ipKlien(c)
    // Dicek sebelum pekerjaan mahal apa pun: penebak tidak mendapat verifikasi argon2 gratis.
    if (deps.batasIp.tercapai(kunciIp)) throw new GalatApp('RATE_LIMITED', PESAN_TERLALU_SERING, 429)

    const sekarang = c.get('waktu')()
    // Kunci per akun di PostgreSQL (indeks HMAC email di ruang desa ini): sama untuk akun yang ada maupun tidak.
    const ruangKunci: RuangKunci = { tabel: 'desa', desaId: desa.desa.id, jenis: 'panel' }
    const kunci = deps.penyandi.indeks(email, ruang.emailPengguna(desa.desa.id))
    if ((await periksaKunci(db, ruangKunci, kunci, sekarang)).terkunciSampai) throw new GalatApp('RATE_LIMITED', PESAN_TERLALU_SERING, 429)
    const pengguna = await cariPenggunaMenurutEmail(db, email)
    // Satu verifikasi argon2 untuk setiap jalur (akun ada, tidak ada, atau nonaktif): waktu dan jawaban tidak membedakan.
    const aktif = pengguna !== null && pengguna.aktif
    const benar = aktif ? await periksaKataSandi(pengguna.kataSandiHash, isian.data.kataSandi) : await periksaTerhadapPalsu(isian.data.kataSandi)

    if (!benar || pengguna === null) {
      deps.batasIp.catat(kunciIp)
      const gagal = await catatGagal(db, ruangKunci, kunci, sekarang)
      const alasan: AlasanGagal = pengguna === null ? 'tak-dikenal' : !pengguna.aktif ? 'nonaktif' : 'kata-sandi-salah'
      // Dikembalikan (bukan dilempar) agar transaksi tidak dibatalkan dan jejak auditnya tersimpan.
      await catatAudit(db, {
        desaId: desa.desa.id,
        jenis: 'masuk.gagal',
        pelaku: null,
        waktu: sekarang,
        ringkasan: { emailIndeks: kunci, alasan },
      })
      if (gagal.terkunciSampai) return c.json(badanGalat('RATE_LIMITED', PESAN_TERLALU_SERING), 429)
      return c.json(badanGalat('VALIDATION', PESAN_MASUK_GAGAL, { kataSandi: PESAN_MASUK_GAGAL }), 422)
    }

    await hapusKunci(db, ruangKunci, kunci)
    const penggunaSesi = penggunaSesiDari(pengguna)
    if (!penggunaSesi) throw new Error('Peran pengguna di basis data tidak dikenal.')
    // Token dan ID sesi selalu baru (anti fiksasi); sesi lama dari peramban yang sama dicabut, bukan dibiarkan hidup.
    const lama = pelakuPanel(c)
    if (lama) await cabutSesi(db, lama.sesiId, sekarang)
    const { token, hash } = buatTokenSesi()
    await simpanSesi(db, { id: `ses_${randomBytes(12).toString('base64url')}`, desaId: desa.desa.id, penggunaId: pengguna.id, tokenHash: hash, sekarang })
    await catatAudit(db, { desaId: desa.desa.id, jenis: 'masuk.berhasil', pelaku: pengguna.id, waktu: sekarang, ringkasan: {} })
    pasangKuki(c, 'panel', awalan, token)
    return c.json({ sesi: await susunSesiAdmin(db, desa, penggunaSesi) })
  })

  rute.get('/', async (c) => {
    const { db, pelaku, desa } = butuhSesi(c)
    // `sesiId` tidak ikut keluar: skema sesi hanya meloloskan kolom pengguna.
    return c.json(await susunSesiAdmin(db, desa, pelaku))
  })

  rute.post('/keluar', async (c) => {
    const pelaku = pelakuPanel(c)
    if (pelaku) await cabutSesi(dbTanpaPelaku(c).db, pelaku.sesiId, c.get('waktu')())
    hapusKuki(c, 'panel', awalan)
    return c.body(null, 204)
  })

  return rute
}
