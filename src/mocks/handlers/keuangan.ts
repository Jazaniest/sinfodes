import { http, HttpResponse } from 'msw'
import { waktuIsoWib } from '@/domain/format/tanggal'
import { filterApbdesSchema, type Apbdes } from '@/domain/keuangan/schema'
import { ambilDb, ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { balasIsianTidakValid, butuhKemampuan } from '../tulis'

const butuhPembaca = (request: Request) => butuhKemampuan(request, 'keuangan.lihat', 'Peran Anda tidak berhak membuka Keuangan desa.')

/** APBDes tahun terbaru milik desa (dipakai juga Pembangunan dan Beranda). */
export function apbdesTerbaru(desaId: string): Apbdes | undefined {
  return ambilDb()
    .apbdes.filter((a) => a.desaId === desaId)
    .sort((a, b) => b.tahun - a.tahun)[0]
}

/** Keuangan desa (SPEC §8): APBDes yang disinkronkan dari Siskeudes. */
export const handlerKeuangan = [
  http.get(
    `${API}/keuangan/apbdes`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const filter = filterApbdesSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
      if (!filter.success) return balasIsianTidakValid(filter.error)
      const tahun = filter.data.tahun
      const a =
        tahun === undefined
          ? apbdesTerbaru(pengguna.desaId)
          : ambilDb().apbdes.find((x) => x.desaId === pengguna.desaId && x.tahun === tahun)
      if (!a) return balasGalat('NOT_FOUND', `APBDes ${tahun ?? 'tahun ini'} belum tersedia.`, 404)
      return HttpResponse.json(a)
    }),
  ),
  http.post(
    `${API}/keuangan/sinkron-siskeudes`,
    denganJaringan(({ request }) => {
      const pengguna = butuhKemampuan(request, 'keuangan.sinkron', 'Hanya Kaur Keuangan yang bisa menyinkronkan data Siskeudes.')
      if (pengguna instanceof Response) return pengguna
      const a = apbdesTerbaru(pengguna.desaId)
      if (!a) return balasGalat('NOT_FOUND', 'APBDes tahun ini belum tersedia.', 404)
      // Tiruan: Siskeudes sungguhan belum tersambung (SPEC §2.2), jadi hanya waktu sinkron yang berubah.
      ubahDb(() => {
        a.sinkronPada = waktuIsoWib(new Date())
      })
      return HttpResponse.json(a)
    }),
  ),
]
