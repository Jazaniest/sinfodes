import { PERAN_KABUPATEN } from '@sinfodes/kontrak/kabupaten/schema'
import type { MiddlewareHandler } from 'hono'
import type { Db } from '../basisdata/klien'
import type { Konfigurasi } from '../konfigurasi'
import { bentukTokenSah, hashToken } from '../kripto/token'
import { sesiMasihBerlaku, keluargaDariJalur, type KeluargaPelaku } from '../sesi/pelaku'
import { cariSesiKabupatenMenurutHash, cariSesiKonsolMenurutHash, geserAktifKabupaten, geserAktifKonsol } from '../sesi/repositori-platform'
import { cariSesiBantuanMenurutHash, geserAktifBantuan, penggunaSesiBantuan, sesiBantuanBerlaku } from '../sesi/repositori-bantuan'
import { cariSesiWargaMenurutHash, geserAktifWarga } from '../sesi/repositori-warga'
import { cariSesiMenurutHash, geserAktif, JEDA_PERBARUI_MS, penggunaSesiDari, sesiBerlaku } from '../sesi/repositori'
import { bacaKuki } from '../sesi/toples'
import type { Waktu } from '../waktu'
import type { AlamatPermintaan, LingkunganApp, PelakuAktif } from './konteks'

const lamaDari = (terakhirAktif: Date, sekarang: Date): boolean => sekarang.getTime() - terakhirAktif.getTime() > JEDA_PERBARUI_MS

/** Sesi bantuan beserta akses induknya; dicabut, habis, menganggur, atau lewat batas mutlak berarti tidak ada pelaku. */
async function cariPelakuBantuan(db: Db, desaId: string, hash: string, sekarang: Date): Promise<PelakuAktif | null> {
  const ketemu = await cariSesiBantuanMenurutHash(db, hash)
  if (!ketemu || !sesiBantuanBerlaku(ketemu, desaId, sekarang)) return null
  if (lamaDari(ketemu.sesi.terakhirAktif, sekarang)) await geserAktifBantuan(db, ketemu.sesi.id, sekarang)
  const { akses, sesi } = ketemu
  return {
    ...penggunaSesiBantuan(sesi),
    jenis: 'panel',
    sesiId: sesi.id,
    bantuan: { aksesId: akses.id, sampai: akses.sampai, sembunyikanDataPribadi: akses.sembunyikanDataPribadi },
  }
}

/**
 * Mencari pelaku dari hash token menurut keluarga rutenya (SPEC-V0.3 §6.2, §8.1). Setiap keluarga hanya sah di jenis alamatnya
 * sendiri dan dicari di tabel sesinya sendiri, di dalam transaksi dengan peran dan konteks alamat itu, jadi cookie desa A di
 * alamat desa B tidak menemukan apa pun. Sebab gagal tidak dibedakan: semuanya `null`.
 */
async function cariPelaku(db: Db, keluarga: KeluargaPelaku, alamat: AlamatPermintaan, hash: string, sekarang: Date): Promise<PelakuAktif | null> {
  if (keluarga === 'panel' || keluarga === 'warga') {
    if (!alamat.desa) return null
    const desaId = alamat.desa.desa.id
    if (keluarga === 'panel') {
      const ketemu = await cariSesiMenurutHash(db, hash)
      // Bukan sesi pengguna desa: mungkin sesi bantuan Tim Sinfodes (tabel sendiri, cookie panel yang sama).
      if (!ketemu) return cariPelakuBantuan(db, desaId, hash, sekarang)
      if (!sesiBerlaku(ketemu, desaId, sekarang)) return null
      const pengguna = penggunaSesiDari(ketemu.pengguna)
      if (!pengguna) return null
      if (lamaDari(ketemu.sesi.terakhirAktif, sekarang)) await geserAktif(db, ketemu.sesi.id, sekarang)
      return { ...pengguna, jenis: 'panel', sesiId: ketemu.sesi.id }
    }
    const ketemu = await cariSesiWargaMenurutHash(db, hash)
    if (!ketemu || ketemu.sesi.desaId !== desaId || ketemu.statusDasar !== 'Hidup' || !sesiMasihBerlaku('warga', ketemu.sesi, sekarang)) return null
    if (lamaDari(ketemu.sesi.terakhirAktif, sekarang)) await geserAktifWarga(db, ketemu.sesi.id, sekarang)
    return { jenis: 'warga', sesiId: ketemu.sesi.id, pendudukId: ketemu.sesi.pendudukId, desaId }
  }
  if (keluarga === 'konsol') {
    if (alamat.konteks.jenis !== 'konsol') return null
    const ketemu = await cariSesiKonsolMenurutHash(db, hash)
    if (!ketemu || !ketemu.pengguna.aktif || !sesiMasihBerlaku('konsol', ketemu.sesi, sekarang) || ketemu.pengguna.peran !== 'tim') return null
    if (lamaDari(ketemu.sesi.terakhirAktif, sekarang)) await geserAktifKonsol(db, ketemu.sesi.id, sekarang)
    const { id, nama, jabatan, email } = ketemu.pengguna
    return { jenis: 'konsol', sesiId: ketemu.sesi.id, pengguna: { id, nama, jabatan, peran: 'tim', email } }
  }
  // kabupaten: hanya di alamat kabupaten mitra yang sama dengan kabupaten sesinya.
  if (alamat.konteks.jenis !== 'kabupaten' || !alamat.kabupaten?.mitra) return null
  const ketemu = await cariSesiKabupatenMenurutHash(db, hash)
  if (!ketemu || !ketemu.pengguna.aktif || !sesiMasihBerlaku('kabupaten', ketemu.sesi, sekarang)) return null
  if (ketemu.sesi.kabupatenKode !== alamat.kabupaten.kode || ketemu.pengguna.kabupatenKode !== alamat.kabupaten.kode) return null
  const peran = (PERAN_KABUPATEN as readonly string[]).includes(ketemu.pengguna.peran) ? (ketemu.pengguna.peran as (typeof PERAN_KABUPATEN)[number]) : null
  if (!peran) return null
  if (lamaDari(ketemu.sesi.terakhirAktif, sekarang)) await geserAktifKabupaten(db, ketemu.sesi.id, sekarang)
  const p = ketemu.pengguna
  return {
    jenis: 'kabupaten',
    sesiId: ketemu.sesi.id,
    pengguna: { id: p.id, kabupatenKode: p.kabupatenKode, nama: p.nama, jabatan: p.jabatan, peran, email: p.email, aktif: p.aktif },
    kabupaten: { kode: ketemu.mitra.kode, nama: ketemu.mitra.nama, label: ketemu.mitra.label },
  }
}

/**
 * Cookie menjadi pelaku. Keluarga rute (panel, warga, Konsol, kabupaten) menentukan cookie mana yang dibaca; cookie keluarga
 * lain tidak pernah disentuh. Cookie tidak sah, habis, atau dicabut membuat pelaku `null` tanpa membedakan sebabnya; rute yang
 * butuh pelaku menjawab 401.
 */
export function lapisanSesi(deps: { cookieAwalan: Konfigurasi['cookieAwalan']; waktu: Waktu }): MiddlewareHandler<LingkunganApp> {
  return async (c, next) => {
    c.set('pelaku', null)
    const db = c.get('dbTransaksi')
    if (db) {
      const keluarga = keluargaDariJalur(new URL(c.req.url).pathname.replace(/^\/api\/v1/, ''))
      const token = bacaKuki(c, keluarga, deps.cookieAwalan)
      if (token && bentukTokenSah(token)) {
        const pelaku = await cariPelaku(db, keluarga, c.get('alamat'), hashToken(token), deps.waktu())
        if (pelaku) c.set('pelaku', pelaku)
      }
    }
    await next()
  }
}
