import { http, HttpResponse } from 'msw'
import { waktuIsoWib } from '@/domain/format/tanggal'
import { ubahTampilanSchema, type TampilanWebsite } from '@/domain/website/schema'
import { ambilDb, ubahDb } from '../db'
import { API, balasDaftar, denganJaringan } from '../http'
import type { DbDemo } from '../tipe-db'
import { bacaJson, balasIsianTidakValid, butuhKemampuan } from '../tulis'

const butuhPengelola = (request: Request) => butuhKemampuan(request, 'website.kelola', 'Peran Anda tidak berhak mengelola Website Desa.')

/** Satu halaman berisi semua baris: daftar website pendek dan belum dipecah per halaman. */
const balasSemua = <T,>(daftar: readonly T[]) => balasDaftar(daftar, 1, Math.max(daftar.length, 1))

/** Tampilan tersimpan, atau bawaan netral (motif Garis) untuk desa yang belum mengaturnya (SPEC §9). */
export function tampilanDesa(db: DbDemo, desaId: string): TampilanWebsite {
  return (
    db.tampilanWebsite.find((t) => t.desaId === desaId) ?? {
      desaId, aksen: 'biru-tinta', motif: 'garis', sampul: null, logo: null, diperbarui: db.tanggalAcuan,
    }
  )
}

/** Website Desa (SPEC §8): artikel, pengumuman, agenda, dan galeri hanya lihat; Tampilan bisa disimpan. */
export const handlerWebsite = [
  http.get(
    `${API}/website/artikel`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengelola(request)
      if (pengguna instanceof Response) return pengguna
      return balasSemua(ambilDb().artikel.filter((a) => a.desaId === pengguna.desaId).sort((a, b) => b.tanggal.localeCompare(a.tanggal)))
    }),
  ),
  http.get(
    `${API}/website/pengumuman`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengelola(request)
      if (pengguna instanceof Response) return pengguna
      return balasSemua(ambilDb().pengumuman.filter((p) => p.desaId === pengguna.desaId).sort((a, b) => b.mulai.localeCompare(a.mulai)))
    }),
  ),
  http.get(
    `${API}/website/agenda`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengelola(request)
      if (pengguna instanceof Response) return pengguna
      return balasSemua(
        ambilDb()
          .agenda.filter((a) => a.desaId === pengguna.desaId)
          .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.mulai.localeCompare(b.mulai)),
      )
    }),
  ),
  http.get(
    `${API}/website/galeri`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengelola(request)
      if (pengguna instanceof Response) return pengguna
      return balasSemua(ambilDb().galeri.filter((f) => f.desaId === pengguna.desaId))
    }),
  ),
  http.get(
    `${API}/website/tampilan`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengelola(request)
      if (pengguna instanceof Response) return pengguna
      return HttpResponse.json(tampilanDesa(ambilDb(), pengguna.desaId))
    }),
  ),
  http.put(
    `${API}/website/tampilan`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPengelola(request)
      if (pengguna instanceof Response) return pengguna
      const isian = ubahTampilanSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const baru: TampilanWebsite = { ...isian.data, desaId: pengguna.desaId, diperbarui: waktuIsoWib(new Date()) }
      ubahDb((d) => {
        d.tampilanWebsite = [...d.tampilanWebsite.filter((t) => t.desaId !== pengguna.desaId), baru]
      })
      return HttpResponse.json(baru)
    }),
  ),
]
