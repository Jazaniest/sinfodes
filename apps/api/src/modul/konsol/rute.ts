import { randomBytes } from 'node:crypto'
import { sesiKonsolSchema, type SesiKonsol } from '@sinfodes/kontrak/konsol/schema'
import { Hono, type Context } from 'hono'
import { z } from 'zod'
import { catatAuditPlatform } from '../../audit'
import { badanGalat, GalatApp } from '../../galat'
import type { Konfigurasi } from '../../konfigurasi'
import { periksaKataSandi, periksaTerhadapPalsu } from '../../kripto/kata-sandi'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'
import { buatTokenSesi } from '../../kripto/token'
import { periksaTotp } from '../../kripto/totp'
import { butuhSesiKonsol, dbKonsolTanpaPelaku } from '../../lapisan/akses'
import { PESAN_TERLALU_SERING, type BatasLaju } from '../../lapisan/batas-laju'
import type { LingkunganApp } from '../../lapisan/konteks'
import { catatGagal, hapusKunci, periksaKunci, type RuangKunci } from '../../sesi/kunci-masuk'
import { cabutSesiKonsol, simpanSesiKonsol } from '../../sesi/repositori-platform'
import { hapusKuki, pasangKuki } from '../../sesi/toples'
import { cariPenggunaKonsol, klaimLangkahTotp } from './repositori'

/** `kodeTotp` sengaja longgar di sini: kode yang bukan enam angka dijawab sama dengan kode salah, bukan sebagai galat isian. */
const masukSchema = z.object({ email: z.string().min(1), kataSandi: z.string().min(1), kodeTotp: z.string().max(32).optional() })
const PESAN_MASUK_GAGAL = 'Email atau kata sandi salah.'
const PESAN_TERKUNCI = 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.'
const BATAS_EMAIL = 254
const BATAS_KATA_SANDI = 1000
const RUANG_KUNCI: RuangKunci = { tabel: 'platform', jenis: 'konsol' }

export type DepsRuteKonsol = {
  konfigurasi: Konfigurasi
  penyandi: Penyandi
  batasIp: BatasLaju
  ipKlien: (c: Context) => string
}

/** Masuk, sesi, dan keluar Konsol (SPEC-V0.2 §7, SPEC-V0.3 §8.4). Hanya di alamat `konsol`, dengan TOTP. */
export function ruteKonsol(deps: DepsRuteKonsol): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()
  const awalan = deps.konfigurasi.cookieAwalan

  rute.post('/sesi/masuk', async (c) => {
    const { db } = dbKonsolTanpaPelaku(c)
    const isian = masukSchema.safeParse(await c.req.json().catch(() => null))
    if (!isian.success) throw new GalatApp('VALIDATION', 'Email dan kata sandi wajib diisi.', 422)
    if (isian.data.email.length > BATAS_EMAIL || isian.data.kataSandi.length > BATAS_KATA_SANDI) throw new GalatApp('VALIDATION', 'Isian terlalu panjang.', 422)
    const email = isian.data.email.trim().toLowerCase()
    const ip = deps.ipKlien(c)
    if (deps.batasIp.tercapai(ip)) throw new GalatApp('RATE_LIMITED', PESAN_TERLALU_SERING, 429)

    const sekarang = c.get('waktu')()
    const kunci = deps.penyandi.indeks(email, ruang.emailKonsol)
    if ((await periksaKunci(db, RUANG_KUNCI, kunci, sekarang)).terkunciSampai) throw new GalatApp('RATE_LIMITED', PESAN_TERKUNCI, 429)

    const pengguna = await cariPenggunaKonsol(db, email)
    const aktif = pengguna !== null && pengguna.aktif
    // Satu verifikasi argon2 untuk setiap jalur (ada, tidak ada, nonaktif): waktu dan jawaban tidak membedakan akun.
    const sandiBenar = aktif ? await periksaKataSandi(pengguna.kataSandiHash, isian.data.kataSandi) : await periksaTerhadapPalsu(isian.data.kataSandi)

    // TOTP: akun yang sudah didaftarkan wajib kode di lingkungan mana pun; akun yang belum hanya boleh masuk bila lingkungan
    // tidak mewajibkannya. Kode salah, kosong, atau bukan enam angka sama-sama gagal.
    const rahasia = aktif && pengguna.totpRahasiaSandi !== null ? Buffer.from(deps.penyandi.bukaSandi(pengguna.totpRahasiaSandi, ruang.totpKonsol), 'base64') : null
    const totp = rahasia ? periksaTotp(rahasia, isian.data.kodeTotp ?? '', sekarang, pengguna?.totpLangkahTerakhir ?? null) : null
    const totpBenar = rahasia ? (totp?.sah ?? false) : !deps.konfigurasi.totpKonsolWajib

    let berhasil = aktif && sandiBenar && totpBenar
    // Langkah TOTP baru dianggap terpakai bila kata sandi juga benar, dan klaimnya atomik (anti kode ganda yang serentak).
    if (berhasil && totp && pengguna !== null && !(await klaimLangkahTotp(db, pengguna.id, totp.langkah))) berhasil = false

    if (!berhasil || pengguna === null) {
      deps.batasIp.catat(ip)
      const gagal = await catatGagal(db, RUANG_KUNCI, kunci, sekarang)
      const alasan = pengguna === null ? 'tak-dikenal' : !pengguna.aktif ? 'nonaktif' : !sandiBenar ? 'kata-sandi-salah' : rahasia ? 'totp-salah' : 'totp-belum-didaftarkan'
      await catatAuditPlatform(db, { jenis: 'konsol.masuk.gagal', pelaku: null, waktu: sekarang, ringkasan: { emailIndeks: kunci, alasan } })
      // Dikembalikan (bukan dilempar) supaya hitungan kunci dan jejak auditnya tersimpan.
      if (gagal.terkunciSampai) return c.json(badanGalat('RATE_LIMITED', PESAN_TERKUNCI), 429)
      return c.json(badanGalat('VALIDATION', PESAN_MASUK_GAGAL, { kataSandi: PESAN_MASUK_GAGAL }), 422)
    }

    await hapusKunci(db, RUANG_KUNCI, kunci)
    const lama = c.get('pelaku')
    if (lama?.jenis === 'konsol') await cabutSesiKonsol(db, lama.sesiId, sekarang)
    const { token, hash } = buatTokenSesi()
    await simpanSesiKonsol(db, { id: `sk_${randomBytes(12).toString('base64url')}`, penggunaId: pengguna.id, tokenHash: hash, sekarang })
    await catatAuditPlatform(db, { jenis: 'konsol.masuk.berhasil', pelaku: pengguna.id, waktu: sekarang, ringkasan: { totp: rahasia !== null } })
    pasangKuki(c, 'konsol', awalan, token)
    const sesi: SesiKonsol = sesiKonsolSchema.parse({
      jenis: 'konsol',
      pengguna: { id: pengguna.id, nama: pengguna.nama, jabatan: pengguna.jabatan, peran: pengguna.peran, email: pengguna.email },
    })
    return c.json({ sesi })
  })

  rute.get('/sesi', (c) => c.json(sesiKonsolSchema.parse({ jenis: 'konsol', pengguna: butuhSesiKonsol(c).pelaku.pengguna })))

  rute.post('/sesi/keluar', async (c) => {
    const pelaku = c.get('pelaku')
    if (pelaku?.jenis === 'konsol') await cabutSesiKonsol(dbKonsolTanpaPelaku(c).db, pelaku.sesiId, c.get('waktu')())
    hapusKuki(c, 'konsol', awalan)
    return c.body(null, 204)
  })

  return rute
}
