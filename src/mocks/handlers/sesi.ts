import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { waktuIsoWib } from '@/domain/format/tanggal'
import type { Pengguna } from '@/domain/pengguna/schema'
import { KATA_SANDI_DEMO } from '../data/desa-demo'
import { ambilDb, ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { butuhPengguna, tokenUntuk } from '../sesi-mock'

const masukSchema = z.object({ email: z.string().min(1), kataSandi: z.string().min(1) })
const kenaliSchema = z.object({ email: z.string().trim().min(1) })

const penggunaAktif = (email: string) =>
  ambilDb().pengguna.find((p) => p.email === email.trim().toLowerCase() && p.aktif)

/** Isi sesi admin: pengguna, desanya, dan daftar dusunnya. */
function sesiUntuk(pengguna: Pengguna) {
  const db = ambilDb()
  const desa = db.desa.find((d) => d.id === pengguna.desaId)
  if (!desa) return null
  return { jenis: 'admin' as const, pengguna, desa, dusun: db.dusun.filter((d) => d.desaId === desa.id) }
}

export const handlerSesi = [
  http.post(
    `${API}/sesi/kenali`,
    denganJaringan(async ({ request }) => {
      const isian = kenaliSchema.safeParse(await request.json().catch(() => null))
      if (!isian.success) return balasGalat('VALIDATION', 'Email wajib diisi.', 422, { email: 'Email wajib diisi.' })
      const pengguna = penggunaAktif(isian.data.email)
      const desa = pengguna ? ambilDb().desa.find((d) => d.id === pengguna.desaId) : undefined
      // Email yang tidak dikenal tetap dijawab 200 tanpa desa; langkah kata sandi tetap ditampilkan.
      return HttpResponse.json({
        desa: desa ? { nama: desa.nama, kecamatan: desa.kecamatan.nama, kabupaten: desa.kabupaten.nama } : null,
      })
    }),
  ),
  http.post(
    `${API}/sesi/masuk`,
    denganJaringan(async ({ request }) => {
      const isian = masukSchema.safeParse(await request.json().catch(() => null))
      if (!isian.success) return balasGalat('VALIDATION', 'Email dan kata sandi wajib diisi.', 422)
      const pengguna = penggunaAktif(isian.data.email)
      if (!pengguna || isian.data.kataSandi !== KATA_SANDI_DEMO) {
        return balasGalat('VALIDATION', 'Email atau kata sandi salah.', 422, { kataSandi: 'Email atau kata sandi salah.' })
      }
      const sesi = sesiUntuk(pengguna)
      if (!sesi) return balasGalat('SERVER', 'Data desa tidak ditemukan.', 500)
      // Dasar "login per minggu" dan "pengguna aktif" di Konsol (SPEC §11).
      ubahDb((d) => {
        d.riwayatMasuk.push({ penggunaId: pengguna.id, desaId: pengguna.desaId, waktu: waktuIsoWib(new Date()) })
      })
      return HttpResponse.json({ token: tokenUntuk(pengguna.id), sesi })
    }),
  ),
  http.get(
    `${API}/sesi`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengguna(request)
      if (pengguna instanceof Response) return pengguna
      const sesi = sesiUntuk(pengguna)
      return sesi ? HttpResponse.json(sesi) : balasGalat('SERVER', 'Data desa tidak ditemukan.', 500)
    }),
  ),
  http.post(
    `${API}/sesi/keluar`,
    denganJaringan(() => new HttpResponse(null, { status: 204 })),
  ),
]
