import { http, HttpResponse } from 'msw'
import { filterPendudukSchema, saringPenduduk, urutkanPenduduk } from '@/domain/penduduk/filter'
import { boleh, cakupanDusun } from '@/domain/pengguna/hak-akses'
import { ambilDb } from '../db'
import { API, balasDaftar, balasGalat, denganJaringan } from '../http'
import { butuhPengguna } from '../sesi-mock'

const TIDAK_BERHAK = 'Peran Anda tidak berhak melihat data penduduk.'

export const handlerPenduduk = [
  http.get(
    `${API}/penduduk`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengguna(request)
      if (pengguna instanceof Response) return pengguna
      if (!boleh(pengguna.peran, 'penduduk.lihat')) return balasGalat('FORBIDDEN', TIDAK_BERHAK, 403)
      const filter = filterPendudukSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
      if (!filter.success) return balasGalat('VALIDATION', 'Filter tidak valid.', 422)

      const db = ambilDb()
      const dusunDesa = db.dusun.filter((d) => d.desaId === pengguna.desaId)
      const cakupan = cakupanDusun(pengguna)
      const milikPengguna = db.penduduk.filter(
        (p) => p.desaId === pengguna.desaId && (cakupan === null || p.dusunId === cakupan),
      )
      const tersaring = saringPenduduk(milikPengguna, filter.data, {
        hariIni: new Date(),
        dusunIdPerNomor: new Map(dusunDesa.map((d) => [d.nomor, d.id] as const)),
        idPendatangTahunIni: new Set<string>(),
      })
      const nomorDusun = (id: string) => dusunDesa.find((d) => d.id === id)?.nomor ?? Number.MAX_SAFE_INTEGER
      return balasDaftar(urutkanPenduduk(tersaring, filter.data.urut, { nomorDusun }), filter.data.page, filter.data.pageSize)
    }),
  ),
  http.get(
    `${API}/penduduk/:id`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhPengguna(request)
      if (pengguna instanceof Response) return pengguna
      if (!boleh(pengguna.peran, 'penduduk.lihat')) return balasGalat('FORBIDDEN', TIDAK_BERHAK, 403)
      const cakupan = cakupanDusun(pengguna)
      const penduduk = ambilDb().penduduk.find(
        (p) =>
          p.id === String(params.id) && p.desaId === pengguna.desaId && (cakupan === null || p.dusunId === cakupan),
      )
      return penduduk ? HttpResponse.json(penduduk) : balasGalat('NOT_FOUND', 'Data penduduk tidak ditemukan.', 404)
    }),
  ),
]
