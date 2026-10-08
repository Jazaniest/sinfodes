import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { KATA_SANDI_DEMO } from '../data/desa-demo'
import { ambilDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { butuhPengguna, tokenUntuk } from '../sesi-mock'

const masukSchema = z.object({ email: z.string().min(1), kataSandi: z.string().min(1) })

export const handlerSesi = [
  http.post(
    `${API}/sesi/masuk`,
    denganJaringan(async ({ request }) => {
      const isian = masukSchema.safeParse(await request.json().catch(() => null))
      if (!isian.success) return balasGalat('VALIDATION', 'Email dan kata sandi wajib diisi.', 422)
      const db = ambilDb()
      const email = isian.data.email.trim().toLowerCase()
      const pengguna = db.pengguna.find((p) => p.email === email && p.aktif)
      if (!pengguna || isian.data.kataSandi !== KATA_SANDI_DEMO) {
        return balasGalat('VALIDATION', 'Email atau kata sandi salah.', 422, { kataSandi: 'Email atau kata sandi salah.' })
      }
      const desa = db.desa.find((d) => d.id === pengguna.desaId)
      if (!desa) return balasGalat('SERVER', 'Data desa tidak ditemukan.', 500)
      return HttpResponse.json({ token: tokenUntuk(pengguna.id), sesi: { jenis: 'admin', pengguna, desa } })
    }),
  ),
  http.get(
    `${API}/sesi`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengguna(request)
      if (pengguna instanceof Response) return pengguna
      const desa = ambilDb().desa.find((d) => d.id === pengguna.desaId)
      if (!desa) return balasGalat('SERVER', 'Data desa tidak ditemukan.', 500)
      return HttpResponse.json({ jenis: 'admin', pengguna, desa })
    }),
  ),
  http.post(
    `${API}/sesi/keluar`,
    denganJaringan(() => new HttpResponse(null, { status: 204 })),
  ),
]
