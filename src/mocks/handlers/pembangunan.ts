import { http, HttpResponse } from 'msw'
import type { Apbdes } from '@/domain/keuangan/schema'
import { URUTAN_STATUS, type BarisKegiatan, type Kegiatan } from '@/domain/pembangunan/schema'
import type { PenggunaSesi } from '@/domain/pengguna/schema'
import { ambilDb } from '../db'
import { API, balasDaftar, balasGalat, denganJaringan } from '../http'
import { butuhPengguna } from '../sesi-mock'
import { apbdesTerbaru } from './keuangan'

/** Anggaran dan realisasi kegiatan dibaca dari rincian APBDes (SPEC §8); rincian yang tidak ada dibaca 0. */
export function barisKegiatan(k: Kegiatan, apbdes: Apbdes | undefined): BarisKegiatan {
  const pos = apbdes?.pos.find((p) => p.kode === k.kodeApbdes)
  return { ...k, anggaran: pos?.anggaran ?? 0, realisasi: pos?.realisasi ?? 0 }
}

function kegiatanMilik(pengguna: PenggunaSesi): BarisKegiatan[] {
  const apbdes = apbdesTerbaru(pengguna.desaId)
  return ambilDb()
    .kegiatan.filter((k) => k.desaId === pengguna.desaId)
    .map((k) => barisKegiatan(k, apbdes))
}

/** Pembangunan (SPEC §8): terbuka untuk semua peran (SPEC §5.1). */
export const handlerPembangunan = [
  http.get(
    `${API}/pembangunan/kegiatan`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengguna(request)
      if (pengguna instanceof Response) return pengguna
      const daftar = kegiatanMilik(pengguna).sort(
        (a, b) => URUTAN_STATUS[a.status] - URUTAN_STATUS[b.status] || a.kodeApbdes.localeCompare(b.kodeApbdes),
      )
      return balasDaftar(daftar, 1, Math.max(daftar.length, 1))
    }),
  ),
  http.get(
    `${API}/pembangunan/kegiatan/:id`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhPengguna(request)
      if (pengguna instanceof Response) return pengguna
      const k = kegiatanMilik(pengguna).find((x) => x.id === String(params.id))
      return k ? HttpResponse.json(k) : balasGalat('NOT_FOUND', 'Kegiatan pembangunan tidak ditemukan.', 404)
    }),
  ),
]
