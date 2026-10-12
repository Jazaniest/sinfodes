import { http, HttpResponse } from 'msw'
import { waktuIsoWib } from '@/domain/format/tanggal'
import { bersihkanWhatsapp, periksaPinBaru, periksaWhatsapp } from '@/domain/warga/akun'
import { lupaPinSchema, masukWargaSchema, ubahAkunWargaSchema, type SesiWarga } from '@/domain/warga/sesi'
import { ambilDb, ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { butuhWarga, tokenWargaUntuk, type WargaMasuk } from '../sesi-mock'
import type { DbDemo } from '../tipe-db'
import { bacaJson, balasIsianTidakValid } from '../tulis'

/** Pengaman percobaan masuk (SPEC §10, fokus review 2). */
const BATAS_PERCOBAAN = 5
const KUNCI_MS = 15 * 60_000
const PESAN_SALAH = 'NIK atau PIN salah.'
const PESAN_TERKUNCI = 'Terlalu banyak percobaan — coba lagi 15 menit.'
const PESAN_LUPA_PIN =
  'Bila NIK Anda terdaftar, PIN baru dikirim ke nomor WhatsApp yang terdaftar di kantor desa. Tidak menerima pesan dalam 10 menit? Datang ke kantor desa dengan membawa KTP.'
const DATA_TIDAK_UTUH = 'Data warga tidak lengkap.'

/** Isi sesi warga; null bila datanya tidak utuh. */
export function sesiWargaDari(db: DbDemo, w: WargaMasuk): SesiWarga | null {
  const desa = db.desa.find((d) => d.id === w.penduduk.desaId)
  if (!desa || w.penduduk.nik === null) return null
  return {
    jenis: 'warga',
    penduduk: { id: w.penduduk.id, nama: w.penduduk.nama, nik: w.penduduk.nik, keluargaId: w.penduduk.keluargaId },
    desa,
    whatsapp: w.akun.whatsapp,
  }
}

function terkunci(db: DbDemo, nik: string, sekarang: Date): boolean {
  const c = db.percobaanMasukWarga.find((x) => x.nik === nik)
  return c !== undefined && c.terkunciSampai !== null && new Date(c.terkunciSampai).getTime() > sekarang.getTime()
}

/** Catat satu percobaan salah. Mengembalikan sisa percobaan; 0 berarti NIK ini baru saja dikunci 15 menit. */
function catatGagal(d: DbDemo, nik: string, sekarang: Date): number {
  let c = d.percobaanMasukWarga.find((x) => x.nik === nik)
  if (!c) {
    c = { nik, gagal: 0, terkunciSampai: null }
    d.percobaanMasukWarga.push(c)
  }
  c.gagal += 1
  if (c.gagal < BATAS_PERCOBAAN) return BATAS_PERCOBAAN - c.gagal
  c.gagal = 0
  c.terkunciSampai = waktuIsoWib(new Date(sekarang.getTime() + KUNCI_MS))
  return 0
}

/** Masuk, lupa PIN, sesi, dan akun layanan warga (SPEC §10). */
export const handlerWargaSesi = [
  http.post(
    `${API}/warga/masuk`,
    denganJaringan(async ({ request }) => {
      const isian = masukWargaSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const { nik, pin } = isian.data
      const sekarang = new Date()
      const db = ambilDb()
      if (terkunci(db, nik, sekarang)) return balasGalat('RATE_LIMITED', PESAN_TERKUNCI, 429)
      const penduduk = db.penduduk.find((p) => p.nik === nik && p.statusDasar === 'Hidup')
      const akun = penduduk ? db.akunWarga.find((a) => a.pendudukId === penduduk.id) : undefined
      if (!penduduk || !akun || akun.pin !== pin) {
        // NIK tidak terdaftar dan PIN salah dijawab sama, dan sama-sama dihitung (fokus review 2).
        let sisa = BATAS_PERCOBAAN
        ubahDb((d) => {
          sisa = catatGagal(d, nik, sekarang)
        })
        if (sisa === 0) return balasGalat('RATE_LIMITED', PESAN_TERKUNCI, 429)
        const pesan = sisa <= 2 ? `${PESAN_SALAH} Sisa ${sisa} kali percobaan sebelum dikunci 15 menit.` : PESAN_SALAH
        return balasGalat('VALIDATION', pesan, 422, { pin: pesan })
      }
      if (db.percobaanMasukWarga.some((c) => c.nik === nik)) {
        ubahDb((d) => {
          d.percobaanMasukWarga = d.percobaanMasukWarga.filter((c) => c.nik !== nik)
        })
      }
      const sesi = sesiWargaDari(db, { akun, penduduk })
      if (!sesi) return balasGalat('SERVER', DATA_TIDAK_UTUH, 500)
      return HttpResponse.json({ token: tokenWargaUntuk(penduduk.id), sesi })
    }),
  ),
  http.post(
    `${API}/warga/lupa-pin`,
    denganJaringan(async ({ request }) => {
      const isian = lupaPinSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      // Sama untuk NIK terdaftar maupun tidak, dan PIN demo tidak diubah (SPEC §10: tiruan).
      return HttpResponse.json({ pesan: PESAN_LUPA_PIN })
    }),
  ),
  http.get(
    `${API}/warga/sesi`,
    denganJaringan(({ request }) => {
      const w = butuhWarga(request)
      if (w instanceof Response) return w
      const sesi = sesiWargaDari(ambilDb(), w)
      return sesi ? HttpResponse.json(sesi) : balasGalat('SERVER', DATA_TIDAK_UTUH, 500)
    }),
  ),
  http.patch(
    `${API}/warga/akun`,
    denganJaringan(async ({ request }) => {
      const w = butuhWarga(request)
      if (w instanceof Response) return w
      const isian = ubahAkunWargaSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const { pinLama, pinBaru } = isian.data
      const galat: Record<string, string> = {}
      if (pinBaru !== undefined) {
        if (pinLama !== w.akun.pin) galat.pinLama = 'PIN lama salah.'
        else {
          const g = periksaPinBaru(pinBaru, w.akun.pin)
          if (g) galat.pinBaru = g
        }
      }
      const whatsapp = isian.data.whatsapp === undefined ? undefined : bersihkanWhatsapp(isian.data.whatsapp)
      if (whatsapp !== undefined) {
        const g = periksaWhatsapp(whatsapp)
        if (g) galat.whatsapp = g
      }
      // PIN lama yang salah atau isian yang tidak valid tidak mengubah apa pun (fokus review 5).
      if (Object.keys(galat).length > 0) return balasGalat('VALIDATION', 'Periksa isian yang ditandai.', 422, galat)
      ubahDb(() => {
        if (pinBaru !== undefined) w.akun.pin = pinBaru
        if (whatsapp !== undefined) w.akun.whatsapp = whatsapp
      })
      const sesi = sesiWargaDari(ambilDb(), w)
      return sesi ? HttpResponse.json(sesi) : balasGalat('SERVER', DATA_TIDAK_UTUH, 500)
    }),
  ),
]
