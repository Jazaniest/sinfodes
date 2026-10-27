import { randomBytes } from 'node:crypto'
import { PERAN_KABUPATEN, sesiKabupatenSchema, type SesiKabupaten } from '@sinfodes/kontrak/kabupaten/schema'
import { Hono, type Context } from 'hono'
import { z } from 'zod'
import { catatAuditPlatform } from '../../audit'
import { badanGalat, GalatApp } from '../../galat'
import type { Konfigurasi } from '../../konfigurasi'
import { periksaKataSandi, periksaTerhadapPalsu } from '../../kripto/kata-sandi'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'
import { buatTokenSesi } from '../../kripto/token'
import { butuhSesiKabupaten, dbKabupatenTanpaPelaku } from '../../lapisan/akses'
import { PESAN_TERLALU_SERING, type BatasLaju } from '../../lapisan/batas-laju'
import type { LingkunganApp } from '../../lapisan/konteks'
import { catatGagal, hapusKunci, periksaKunci, type RuangKunci } from '../../sesi/kunci-masuk'
import { cabutSesiKabupaten, simpanSesiKabupaten } from '../../sesi/repositori-platform'
import { hapusKuki, pasangKuki } from '../../sesi/toples'
import { cariPenggunaKabupaten } from './repositori'

const masukSchema = z.object({ email: z.string().min(1), kataSandi: z.string().min(1) })
const PESAN_MASUK_GAGAL = 'Email atau kata sandi salah.'
const PESAN_TERKUNCI = 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.'
const BATAS_EMAIL = 254
const BATAS_KATA_SANDI = 1000
const RUANG_KUNCI: RuangKunci = { tabel: 'platform', jenis: 'kabupaten' }

export type DepsRuteKabupaten = {
  konfigurasi: Konfigurasi
  penyandi: Penyandi
  batasIp: BatasLaju
  ipKlien: (c: Context) => string
}

/** Masuk, sesi, dan keluar dasbor kabupaten (SPEC-V0.2 §8.1). Hanya di alamat `kab-...` milik kabupaten mitra. */
export function ruteKabupaten(deps: DepsRuteKabupaten): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()
  const awalan = deps.konfigurasi.cookieAwalan

  rute.post('/sesi/masuk', async (c) => {
    const { db, kabupaten } = dbKabupatenTanpaPelaku(c)
    const isian = masukSchema.safeParse(await c.req.json().catch(() => null))
    if (!isian.success) throw new GalatApp('VALIDATION', 'Email dan kata sandi wajib diisi.', 422)
    if (isian.data.email.length > BATAS_EMAIL || isian.data.kataSandi.length > BATAS_KATA_SANDI) throw new GalatApp('VALIDATION', 'Isian terlalu panjang.', 422)
    const email = isian.data.email.trim().toLowerCase()
    const ip = deps.ipKlien(c)
    if (deps.batasIp.tercapai(ip)) throw new GalatApp('RATE_LIMITED', PESAN_TERLALU_SERING, 429)

    const sekarang = c.get('waktu')()
    // Kunci per akun di kabupaten ini: indeks HMAC email, sama untuk akun yang ada maupun tidak.
    const kunci = deps.penyandi.indeks(email, ruang.emailKabupaten(kabupaten.kode))
    if ((await periksaKunci(db, RUANG_KUNCI, kunci, sekarang)).terkunciSampai) throw new GalatApp('RATE_LIMITED', PESAN_TERKUNCI, 429)

    // Akun kabupaten lain dengan kata sandi benar tidak ditemukan di kabupaten ini, jadi dijawab sama dengan kata sandi salah.
    const pengguna = await cariPenggunaKabupaten(db, kabupaten.kode, email)
    const aktif = pengguna !== null && pengguna.aktif
    const benar = aktif ? await periksaKataSandi(pengguna.kataSandiHash, isian.data.kataSandi) : await periksaTerhadapPalsu(isian.data.kataSandi)
    const peran = pengguna && (PERAN_KABUPATEN as readonly string[]).includes(pengguna.peran) ? (pengguna.peran as (typeof PERAN_KABUPATEN)[number]) : null

    if (!benar || pengguna === null || peran === null) {
      deps.batasIp.catat(ip)
      const gagal = await catatGagal(db, RUANG_KUNCI, kunci, sekarang)
      const alasan = pengguna === null ? 'tak-dikenal' : !pengguna.aktif ? 'nonaktif' : 'kata-sandi-salah'
      await catatAuditPlatform(db, { jenis: 'kabupaten.masuk.gagal', pelaku: null, waktu: sekarang, ringkasan: { emailIndeks: kunci, kabupaten: kabupaten.kode, alasan } })
      // Dikembalikan (bukan dilempar) supaya hitungan kunci dan jejak auditnya tersimpan.
      if (gagal.terkunciSampai) return c.json(badanGalat('RATE_LIMITED', PESAN_TERKUNCI), 429)
      return c.json(badanGalat('VALIDATION', PESAN_MASUK_GAGAL, { kataSandi: PESAN_MASUK_GAGAL }), 422)
    }

    await hapusKunci(db, RUANG_KUNCI, kunci)
    const lama = c.get('pelaku')
    if (lama?.jenis === 'kabupaten') await cabutSesiKabupaten(db, lama.sesiId, sekarang)
    const { token, hash } = buatTokenSesi()
    await simpanSesiKabupaten(db, { id: `sb_${randomBytes(12).toString('base64url')}`, penggunaId: pengguna.id, kabupatenKode: kabupaten.kode, tokenHash: hash, sekarang })
    await catatAuditPlatform(db, { jenis: 'kabupaten.masuk.berhasil', pelaku: pengguna.id, waktu: sekarang, ringkasan: { kabupaten: kabupaten.kode } })
    pasangKuki(c, 'kabupaten', awalan, token)
    const sesi: SesiKabupaten = sesiKabupatenSchema.parse({
      jenis: 'kabupaten',
      pengguna: { id: pengguna.id, kabupatenKode: pengguna.kabupatenKode, nama: pengguna.nama, jabatan: pengguna.jabatan, peran, email: pengguna.email, aktif: pengguna.aktif },
      kabupaten: { kode: kabupaten.kode, nama: kabupaten.nama, label: kabupaten.label },
    })
    return c.json({ sesi })
  })

  rute.get('/sesi', (c) => {
    const { pelaku } = butuhSesiKabupaten(c)
    return c.json(sesiKabupatenSchema.parse({ jenis: 'kabupaten', pengguna: pelaku.pengguna, kabupaten: pelaku.kabupaten }))
  })

  rute.post('/sesi/keluar', async (c) => {
    const pelaku = c.get('pelaku')
    if (pelaku?.jenis === 'kabupaten') await cabutSesiKabupaten(dbKabupatenTanpaPelaku(c).db, pelaku.sesiId, c.get('waktu')())
    hapusKuki(c, 'kabupaten', awalan)
    return c.body(null, 204)
  })

  return rute
}
