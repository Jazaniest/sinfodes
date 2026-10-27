import { http, HttpResponse } from 'msw'
import { tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import { tandaiDikirimSchema, type TenggatDesa } from '@/domain/kabupaten/tenggat'
import { ambilDb, ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { butirTenggatDesa, tenggatUntukDesa } from '../pengingat-tenggat'
import { bacaJson, balasField, balasIsianTidakValid, butuhKemampuan } from '../tulis'

const butuhPembaca = (request: Request) => butuhKemampuan(request, 'keuangan.lihat', 'Peran Anda tidak membuka Keuangan.')
const butuhPelapor = (request: Request) =>
  butuhKemampuan(request, 'keuangan.lapor', 'Hanya Sekretaris Desa, Kepala Desa, dan Kaur Keuangan yang menandai laporan.')
const tidakAda = () => balasGalat('NOT_FOUND', 'Tenggat tidak ditemukan.', 404)

/** Tenggat yang berlaku untuk desa pengguna; tenggat kabupaten lain sama dengan tidak ada. */
function cariTenggatDesa(desaId: string, tenggatId: string) {
  const db = ambilDb()
  return tenggatUntukDesa(db, db.desa.find((d) => d.id === desaId))?.tenggat.find((t) => t.id === tenggatId)
}

/** Tenggat laporan ke kabupaten di panel desa (SPEC-V0.2 §8.3 butir 4): desa melihat dan menandai sendiri. */
export const handlerTenggatDesa = [
  http.get(
    `${API}/tenggat-laporan`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const db = ambilDb()
      const berlaku = tenggatUntukDesa(db, db.desa.find((d) => d.id === pengguna.desaId))
      const hariIni = tanggalIsoWib(new Date())
      const semua = berlaku?.tenggat ?? []
      const akan = semua.filter((t) => t.tanggal >= hariIni).sort((a, b) => a.tanggal.localeCompare(b.tanggal))
      const lewat = semua.filter((t) => t.tanggal < hariIni).sort((a, b) => b.tanggal.localeCompare(a.tanggal))
      const hasil: TenggatDesa = {
        kabupaten: berlaku?.kabupaten.nama ?? null,
        data: [...akan, ...lewat].map((t) => butirTenggatDesa(db, t, pengguna.desaId)),
      }
      return HttpResponse.json(hasil)
    }),
  ),
  http.post(
    `${API}/tenggat-laporan/:id/kirim`,
    denganJaringan(async ({ request, params }) => {
      const pengguna = butuhPelapor(request)
      if (pengguna instanceof Response) return pengguna
      const isian = tandaiDikirimSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const sekarang = new Date()
      if (isian.data.tanggal > tanggalIsoWib(sekarang)) return balasField('tanggal', 'Tanggal kirim tidak boleh setelah hari ini.')
      const t = cariTenggatDesa(pengguna.desaId, String(params.id))
      if (!t) return tidakAda()
      ubahDb((d) => {
        d.kirimLaporan = d.kirimLaporan.filter((k) => !(k.tenggatId === t.id && k.desaId === pengguna.desaId))
        d.kirimLaporan.push({
          tenggatId: t.id, desaId: pengguna.desaId, tanggal: isian.data.tanggal, oleh: { id: pengguna.id, nama: pengguna.nama },
          dicatatPada: waktuIsoWib(sekarang),
        })
      })
      return HttpResponse.json(butirTenggatDesa(ambilDb(), t, pengguna.desaId))
    }),
  ),
  http.delete(
    `${API}/tenggat-laporan/:id/kirim`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhPelapor(request)
      if (pengguna instanceof Response) return pengguna
      const t = cariTenggatDesa(pengguna.desaId, String(params.id))
      if (!t) return tidakAda()
      ubahDb((d) => {
        d.kirimLaporan = d.kirimLaporan.filter((k) => !(k.tenggatId === t.id && k.desaId === pengguna.desaId))
      })
      return HttpResponse.json(butirTenggatDesa(ambilDb(), t, pengguna.desaId))
    }),
  ),
]
