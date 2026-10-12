import { http, HttpResponse } from 'msw'
import { filterAsetSchema } from '@/domain/aset/schema'
import type { LapisanPeta } from '@/domain/peta/schema'
import { ambilDb } from '../db'
import { API, balasDaftar, balasGalat, denganJaringan } from '../http'
import { butuhPengguna } from '../sesi-mock'
import { balasIsianTidakValid, butuhKemampuan } from '../tulis'

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
      const db = ambilDb()
      const peta = db.peta.find((p) => p.desaId === pengguna.desaId)
      if (!peta) return balasGalat('NOT_FOUND', 'Peta desa belum tersedia.', 404)
      const lapisan: LapisanPeta = {
        pusat: peta.pusat,
        zoom: peta.zoom,
        dusun: peta.dusun,
        fasilitas: peta.fasilitas,
        // Lokasi kegiatan diambil dari modul Pembangunan (SPEC §8).
        kegiatan: db.kegiatan
          .filter((k) => k.desaId === pengguna.desaId)
          .map((k) => ({ id: k.id, nama: k.nama, status: k.status, progresFisik: k.progresFisik, dusunId: k.dusunId, titik: k.titik })),
      }
      return HttpResponse.json(lapisan)
    }),
  ),
]
