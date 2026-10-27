import { randomBytes } from 'node:crypto'
import { galatDariZod } from '@sinfodes/kontrak/format/galat-isian'
import { bersihkanWhatsapp, periksaPinBaru, periksaWhatsapp } from '@sinfodes/kontrak/warga/akun'
import { lupaPinSchema, masukWargaSchema, ubahAkunWargaSchema } from '@sinfodes/kontrak/warga/sesi'
import { Hono, type Context } from 'hono'
import { catatAudit } from '../../audit'
import { badanGalat, GalatApp } from '../../galat'
import type { Konfigurasi } from '../../konfigurasi'
import { hashKataSandi, periksaKataSandi, periksaTerhadapPalsu } from '../../kripto/kata-sandi'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'
import { buatTokenSesi } from '../../kripto/token'
import { butuhSesiWarga, dbTanpaPelaku } from '../../lapisan/akses'
import { PESAN_TERLALU_SERING, type BatasLaju } from '../../lapisan/batas-laju'
import type { LingkunganApp } from '../../lapisan/konteks'
import { catatGagal, hapusKunci, periksaKunci, type RuangKunci } from '../../sesi/kunci-masuk'
import { cabutSesiWarga, simpanSesiWarga } from '../../sesi/repositori-warga'
import { hapusKuki, pasangKuki } from '../../sesi/toples'
import { susunSesiWarga } from './layanan'
import { ambilRekamWarga, cabutSesiLain, cariWargaMenurutNikIndeks, ubahPin, ubahWhatsapp } from './repositori'

/** Pesan sama dengan API tiruan (SPEC-V0.2 §10, fokus review 2). */
const PESAN_SALAH = 'NIK atau PIN salah.'
const PESAN_TERKUNCI = 'Terlalu banyak percobaan — coba lagi 15 menit.'
const PESAN_LUPA_PIN =
  'Bila NIK Anda terdaftar, PIN baru dikirim ke nomor WhatsApp yang terdaftar di kantor desa. Tidak menerima pesan dalam 10 menit? Datang ke kantor desa dengan membawa KTP.'
const PESAN_ISIAN = 'Isian belum lengkap atau tidak valid.'

export type DepsRuteWarga = {
  konfigurasi: Konfigurasi
  penyandi: Penyandi
  /** Kegagalan masuk per IP (bersama rute masuk lain). */
  batasIp: BatasLaju
  /** Permintaan lupa PIN per IP. */
  batasLupaPin: BatasLaju
  ipKlien: (c: Context) => string
}

export function ruteWarga(deps: DepsRuteWarga): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()
  const awalan = deps.konfigurasi.cookieAwalan

  rute.post('/masuk', async (c) => {
    const { db, desa } = dbTanpaPelaku(c)
    const isian = masukWargaSchema.safeParse(await c.req.json().catch(() => null))
    if (!isian.success) throw new GalatApp('VALIDATION', PESAN_ISIAN, 422, galatDariZod(isian.error))
    const { nik, pin } = isian.data
    // Desa Persiapan belum melayani warga (SPEC-V0.2 §4.1): dijawab sebelum NIK diperiksa, sama untuk NIK mana pun.
    if (desa.desa.status === 'Persiapan') throw new GalatApp('FORBIDDEN', 'Layanan warga desa ini belum dibuka.', 403)
    const ip = deps.ipKlien(c)
    if (deps.batasIp.tercapai(ip)) throw new GalatApp('RATE_LIMITED', PESAN_TERLALU_SERING, 429)

    const sekarang = c.get('waktu')()
    // Kunci = indeks NIK di ruang desa alamat ini: NIK warga desa lain dihitung terhadap desa ini seperti NIK tak dikenal.
    const kunci = deps.penyandi.indeks(nik, ruang.nik(desa.desa.id))
    const ruangKunci: RuangKunci = { tabel: 'desa', desaId: desa.desa.id, jenis: 'warga' }
    if ((await periksaKunci(db, ruangKunci, kunci, sekarang)).terkunciSampai) throw new GalatApp('RATE_LIMITED', PESAN_TERKUNCI, 429)

    const warga = await cariWargaMenurutNikIndeks(db, kunci)
    const hidup = warga !== null && warga.statusDasar === 'Hidup'
    // Satu verifikasi argon2 untuk setiap jalur: waktu dan jawaban tidak membedakan NIK yang ada dan yang tidak.
    const benar = hidup ? await periksaKataSandi(warga.pinHash, pin) : await periksaTerhadapPalsu(pin)
    if (!benar || warga === null) {
      deps.batasIp.catat(ip)
      const gagal = await catatGagal(db, ruangKunci, kunci, sekarang)
      const alasan = warga === null ? 'tak-dikenal' : !hidup ? 'bukan-hidup' : 'pin-salah'
      await catatAudit(db, { desaId: desa.desa.id, jenis: 'warga.masuk.gagal', pelaku: null, waktu: sekarang, ringkasan: { nikIndeks: kunci, alasan } })
      // Dikembalikan (bukan dilempar) supaya hitungan kunci dan jejak auditnya tersimpan.
      if (gagal.terkunciSampai) return c.json(badanGalat('RATE_LIMITED', PESAN_TERKUNCI), 429)
      const pesan = gagal.sisa <= 2 ? `${PESAN_SALAH} Sisa ${gagal.sisa} kali percobaan sebelum dikunci 15 menit.` : PESAN_SALAH
      return c.json(badanGalat('VALIDATION', pesan, { pin: pesan }), 422)
    }

    await hapusKunci(db, ruangKunci, kunci)
    const lama = c.get('pelaku')
    if (lama?.jenis === 'warga') await cabutSesiWarga(db, lama.sesiId, sekarang)
    const { token, hash } = buatTokenSesi()
    await simpanSesiWarga(db, { id: `sw_${randomBytes(12).toString('base64url')}`, desaId: desa.desa.id, pendudukId: warga.id, tokenHash: hash, sekarang })
    await catatAudit(db, { desaId: desa.desa.id, jenis: 'warga.masuk.berhasil', pelaku: warga.id, waktu: sekarang, ringkasan: {} })
    pasangKuki(c, 'warga', awalan, token)
    return c.json({ sesi: await susunSesiWarga(db, deps.penyandi, desa, warga.id) })
  })

  rute.post('/lupa-pin', async (c) => {
    dbTanpaPelaku(c)
    const isian = lupaPinSchema.safeParse(await c.req.json().catch(() => null))
    if (!isian.success) throw new GalatApp('VALIDATION', PESAN_ISIAN, 422, galatDariZod(isian.error))
    const ip = deps.ipKlien(c)
    if (deps.batasLupaPin.tercapai(ip)) throw new GalatApp('RATE_LIMITED', PESAN_TERLALU_SERING, 429)
    deps.batasLupaPin.catat(ip)
    // Jawaban sama untuk NIK terdaftar maupun tidak, dan tidak ada yang diubah: pemulihan lewat operator desa (SPEC-V0.3 §8.5).
    return c.json({ pesan: PESAN_LUPA_PIN })
  })

  rute.get('/sesi', async (c) => {
    const { db, pelaku, desa } = butuhSesiWarga(c)
    return c.json(await susunSesiWarga(db, deps.penyandi, desa, pelaku.pendudukId))
  })

  rute.patch('/akun', async (c) => {
    const { db, pelaku, desa } = butuhSesiWarga(c)
    const isian = ubahAkunWargaSchema.safeParse(await c.req.json().catch(() => null))
    if (!isian.success) throw new GalatApp('VALIDATION', PESAN_ISIAN, 422, galatDariZod(isian.error))
    const { pinLama, pinBaru } = isian.data
    const whatsapp = isian.data.whatsapp === undefined ? undefined : bersihkanWhatsapp(isian.data.whatsapp)
    const rekam = await ambilRekamWarga(db, pelaku.pendudukId)
    if (!rekam) throw new GalatApp('SERVER', 'Data warga tidak lengkap.', 500)
    const sekarang = c.get('waktu')()
    const galat: Record<string, string> = {}

    if (pinBaru !== undefined) {
      // PIN lama yang salah dihitung di kunci yang sama dengan masuk: pemilik sesi curian tidak bisa menebak PIN lewat sini.
      const ruangKunci: RuangKunci = { tabel: 'desa', desaId: desa.desa.id, jenis: 'warga' }
      const kunci = rekam.nikIndeks ?? ''
      if (kunci !== '' && (await periksaKunci(db, ruangKunci, kunci, sekarang)).terkunciSampai) throw new GalatApp('RATE_LIMITED', PESAN_TERKUNCI, 429)
      if (pinLama === undefined || !(await periksaKataSandi(rekam.pinHash, pinLama))) {
        const gagal = kunci === '' ? { terkunciSampai: null } : await catatGagal(db, ruangKunci, kunci, sekarang)
        if (gagal.terkunciSampai) return c.json(badanGalat('RATE_LIMITED', PESAN_TERKUNCI), 429)
        galat.pinLama = 'PIN lama salah.'
      } else {
        const g = periksaPinBaru(pinBaru, pinLama)
        if (g) galat.pinBaru = g
        if (kunci !== '') await hapusKunci(db, ruangKunci, kunci)
      }
    }
    if (whatsapp !== undefined) {
      const g = periksaWhatsapp(whatsapp)
      if (g) galat.whatsapp = g
    }
    // PIN lama yang salah atau isian yang tidak valid tidak mengubah apa pun (dikembalikan, agar hitungan kunci tersimpan).
    if (Object.keys(galat).length > 0) return c.json(badanGalat('VALIDATION', 'Periksa isian yang ditandai.', galat), 422)

    if (pinBaru !== undefined) {
      await ubahPin(db, rekam.id, await hashKataSandi(pinBaru), sekarang)
      await cabutSesiLain(db, rekam.id, pelaku.sesiId, sekarang)
      await catatAudit(db, { desaId: desa.desa.id, jenis: 'warga.pin.diganti', pelaku: rekam.id, waktu: sekarang, ringkasan: {} })
    }
    if (whatsapp !== undefined) await ubahWhatsapp(db, rekam.id, deps.penyandi.sandikan(whatsapp, ruang.whatsapp(desa.desa.id)), sekarang)
    return c.json(await susunSesiWarga(db, deps.penyandi, desa, rekam.id))
  })

  rute.post('/sesi/keluar', async (c) => {
    const pelaku = c.get('pelaku')
    if (pelaku?.jenis === 'warga') await cabutSesiWarga(dbTanpaPelaku(c).db, pelaku.sesiId, c.get('waktu')())
    hapusKuki(c, 'warga', awalan)
    return c.body(null, 204)
  })

  return rute
}
