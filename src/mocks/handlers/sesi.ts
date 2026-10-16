import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { waktuIsoWib } from '@/domain/format/tanggal'
import type { Pengguna } from '@/domain/pengguna/schema'
import { KATA_SANDI_DEMO } from '../data/desa-demo'
import { ambilDb, ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { desaKonteks, konteksPermintaan, tanpaKonteks } from '../konteks-permintaan'
import { butuhPengguna, tokenUntuk } from '../sesi-mock'

const masukSchema = z.object({ email: z.string().min(1), kataSandi: z.string().min(1) })

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
      // Desa dari alamat (SPEC-V0.2 §4.3). Diperiksa sesudah kata sandi terbukti benar, supaya orang tidak bisa menebak
      // email mana terdaftar di desa mana.
      const k = konteksPermintaan(request)
      if (!tanpaKonteks(k)) {
        const desaAlamat = desaKonteks(ambilDb(), k)
        if (!desaAlamat) return balasGalat('FORBIDDEN', 'Panel desa dibuka dari alamat desa Anda.', 403)
        if (desaAlamat.id !== pengguna.desaId) {
          return balasGalat('FORBIDDEN', `Akun ini terdaftar di Desa ${sesi.desa.nama}.`, 403, { alamatDesa: sesi.desa.slug })
        }
      }
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
