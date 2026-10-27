import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import type { PenggunaKabupaten, SesiKabupaten } from '@/domain/kabupaten/schema'
import { KATA_SANDI_DEMO } from '../data/desa-demo'
import { ambilDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { konteksPermintaan, tanpaKonteks } from '../konteks-permintaan'
import { butuhPenggunaKabupaten, tokenKabupatenUntuk } from '../sesi-mock'
import type { DbDemo } from '../tipe-db'
import { bacaJson } from '../tulis'

const masukSchema = z.object({ email: z.string().trim().toLowerCase().min(1), kataSandi: z.string().min(1) })

/** Isi sesi kabupaten: akun dan identitas kabupatennya. */
export function sesiKabupatenUntuk(db: DbDemo, akun: PenggunaKabupaten): SesiKabupaten | null {
  const k = db.kabupatenMitra.find((m) => m.kode === akun.kabupatenKode)
  return k ? { jenis: 'kabupaten', pengguna: akun, kabupaten: { kode: k.kode, nama: k.nama, label: k.label } } : null
}

/** Masuk, sesi, dan keluar dasbor kabupaten (SPEC-V0.2 §8.1). Hanya di alamat `kab-…` milik kabupaten mitra. */
export const handlerKabupatenSesi = [
  http.post(
    `${API}/kabupaten/sesi/masuk`,
    denganJaringan(async ({ request }) => {
      const db = ambilDb()
      const k = konteksPermintaan(request)
      if (!tanpaKonteks(k)) {
        if (k.jenis !== 'kabupaten') return balasGalat('NOT_FOUND', 'Dasbor kabupaten tidak ada di alamat ini.', 404)
        if (!db.kabupatenMitra.some((m) => m.label === k.label)) return balasGalat('NOT_FOUND', 'Kabupaten ini belum memakai Sinfodes.', 404)
      }
      const isian = masukSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasGalat('VALIDATION', 'Email dan kata sandi wajib diisi.', 422)
      const akun = db.penggunaKabupaten.find((p) => p.email.toLowerCase() === isian.data.email && p.aktif)
      if (!akun || isian.data.kataSandi !== KATA_SANDI_DEMO) {
        return balasGalat('VALIDATION', 'Email atau kata sandi salah.', 422, { kataSandi: 'Email atau kata sandi salah.' })
      }
      const sesi = sesiKabupatenUntuk(db, akun)
      if (!sesi) return balasGalat('SERVER', 'Data kabupaten tidak ditemukan.', 500)
      // Kabupaten dari alamat, diperiksa sesudah kata sandi terbukti benar supaya email tidak bisa ditebak (pola SPEC-V0.2 §4.3).
      if (!tanpaKonteks(k) && k.jenis === 'kabupaten' && k.label !== sesi.kabupaten.label) {
        return balasGalat('FORBIDDEN', `Akun ini terdaftar di Kabupaten ${sesi.kabupaten.nama}.`, 403, {
          alamatKabupaten: sesi.kabupaten.label,
        })
      }
      return HttpResponse.json({ token: tokenKabupatenUntuk(akun.id), sesi })
    }),
  ),
  http.get(
    `${API}/kabupaten/sesi`,
    denganJaringan(({ request }) => {
      const akun = butuhPenggunaKabupaten(request)
      if (akun instanceof Response) return akun
      const sesi = sesiKabupatenUntuk(ambilDb(), akun)
      return sesi ? HttpResponse.json(sesi) : balasGalat('SERVER', 'Data kabupaten tidak ditemukan.', 500)
    }),
  ),
  http.post(
    `${API}/kabupaten/sesi/keluar`,
    denganJaringan(() => new HttpResponse(null, { status: 204 })),
  ),
]
