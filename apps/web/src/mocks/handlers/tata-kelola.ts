import { http, HttpResponse } from 'msw'
import { filterAsetSchema } from '@/domain/aset/schema'
import type { LapisanPeta } from '@/domain/peta/schema'
import { ambilDb } from '../db'
import { API, balasDaftar, balasGalat, denganJaringan } from '../http'
import { butuhPengguna } from '../sesi-mock'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { balasIsianTidakValid, butuhKemampuan } from '../tulis'

/** Lapisan Peta Desa: geometri desa ditambah lokasi kegiatan dari modul Pembangunan (SPEC §8); null bila peta belum ada. */
export function lapisanDesa(db: DbDemo, desaId: string): LapisanPeta | null {
  const peta = db.peta.find((p) => p.desaId === desaId)
  if (!peta) return null
  return {
    pusat: peta.pusat,
    zoom: peta.zoom,
    dusun: peta.dusun,
    fasilitas: peta.fasilitas,
    kegiatan: db.kegiatan
      .filter((k) => k.desaId === desaId)
      .map((k) => ({ id: k.id, nama: k.nama, status: k.status, progresFisik: k.progresFisik, dusunId: k.dusunId, titik: k.titik })),
  }
}

/** Aset Desa, Lembaga Desa, dan Peta Desa (SPEC §8): semuanya hanya lihat. */
export const handlerTataKelola = [
  http.get(
    `${API}/aset`,
    denganJaringan(({ request }) => {
      const pengguna = butuhKemampuan(request, 'aset.lihat', 'Peran Anda tidak berhak membuka Aset Desa.')
      if (pengguna instanceof Response) return pengguna
      const filter = filterAsetSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
      if (!filter.success) return balasIsianTidakValid(filter.error)
      const { kategori } = filter.data
      const daftar = ambilDb()
        .aset.filter((a) => a.desaId === pengguna.desaId && (kategori === undefined || a.kategori === kategori))
        .sort((a, b) => a.kode.localeCompare(b.kode))
      return balasDaftar(daftar, 1, Math.max(daftar.length, 1))
    }),
  ),
  http.get(
    `${API}/lembaga`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengguna(request)
      if (pengguna instanceof Response) return pengguna
      return HttpResponse.json(ambilDb().pengurusLembaga.filter((p) => p.desaId === pengguna.desaId))
    }),
  ),
  http.get(
    `${API}/peta/lapisan`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengguna(request)
      if (pengguna instanceof Response) return pengguna
      const lapisan = lapisanDesa(ambilDb(), pengguna.desaId)
      if (!lapisan) return balasGalat('NOT_FOUND', 'Peta desa belum tersedia.', 404)
      return HttpResponse.json(lapisan)
    }),
  ),
]
