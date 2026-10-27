import { http, HttpResponse } from 'msw'
import { POLA_KODE_LENCANA, ubahTampilLencanaSchema } from '@/domain/indeks/lencana'
import { ambilDb, ubahDb } from '../db'
import { API, balasDaftar, balasGalat, denganJaringan } from '../http'
import { buktiLencana, keLencanaAdmin, lencanaDesa, pastikanLencana } from '../lencana'
import { bacaJson, balasIsianTidakValid, butuhKemampuan } from '../tulis'

const TIDAK_DITEMUKAN = 'Lencana tidak ditemukan.'

/**
 * Lencana juara (SPEC-V0.2 §9.6): daftar dan saklar tampil untuk pengelola Website Desa, dan halaman bukti publik di alamat
 * induk. Lencana desa lain dijawab 404 supaya keberadaannya tidak bocor.
 */
export const handlerLencana = [
  http.get(
    `${API}/website/lencana`,
    denganJaringan(({ request }) => {
      const pengguna = butuhKemampuan(request, 'website.kelola', 'Peran Anda tidak mengelola Website Desa.')
      if (pengguna instanceof Response) return pengguna
      pastikanLencana(new Date())
      const daftar = lencanaDesa(ambilDb(), pengguna.desaId).map(keLencanaAdmin)
      return balasDaftar(daftar, 1, Math.max(daftar.length, 1))
    }),
  ),
  http.put(
    `${API}/website/lencana/:kode`,
    denganJaringan(async ({ request, params }) => {
      const pengguna = butuhKemampuan(request, 'website.kelola', 'Peran Anda tidak mengelola Website Desa.')
      if (pengguna instanceof Response) return pengguna
      const isian = ubahTampilLencanaSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      pastikanLencana(new Date())
      const kode = String(params.kode)
      if (!ambilDb().lencana.some((l) => l.kode === kode && l.desaId === pengguna.desaId)) return balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
      ubahDb((d) => {
        d.lencana.find((l) => l.kode === kode)!.tampil = isian.data.tampil
      })
      return HttpResponse.json(keLencanaAdmin(ambilDb().lencana.find((l) => l.kode === kode)!))
    }),
  ),
  http.get(
    `${API}/induk/lencana/:kode`,
    denganJaringan(({ params }) => {
      const kode = String(params.kode)
      if (!POLA_KODE_LENCANA.test(kode)) return balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
      pastikanLencana(new Date())
      const bukti = buktiLencana(ambilDb(), kode)
      return bukti ? HttpResponse.json(bukti) : balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
    }),
  ),
]
