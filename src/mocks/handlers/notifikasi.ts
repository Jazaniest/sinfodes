import { http, HttpResponse } from 'msw'
import { tandaiDibacaSchema, type KotakNotifikasi } from '@/domain/notifikasi/schema'
import type { PenggunaSesi } from '@/domain/pengguna/schema'
import { ambilDb, ubahDb } from '../db'
import { API, denganJaringan } from '../http'
import { notifikasiTenggatBaru } from '../pengingat-tenggat'
import { butuhPengguna } from '../sesi-mock'
import { bacaJson, balasIsianTidakValid } from '../tulis'

/** 50 notifikasi terbaru milik pengguna dan jumlah yang belum dibaca (angka menu Notifikasi). */
function kotakMilik(pengguna: PenggunaSesi): KotakNotifikasi {
  const milik = ambilDb()
    .notifikasi.filter((n) => n.penggunaId === pengguna.id)
    .sort((a, b) => b.waktu.localeCompare(a.waktu))
  return { data: milik.slice(0, 50), belumDibaca: milik.filter((n) => !n.dibaca).length }
}

/** Notifikasi terbuka untuk semua peran (SPEC §5.1, §5.5). */
export const handlerNotifikasi = [
  http.get(
    `${API}/notifikasi`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengguna(request)
      if (pengguna instanceof Response) return pengguna
      // Pengingat tenggat laporan ke kabupaten yang ambangnya sudah tercapai (SPEC-V0.2 §8.3 butir 4).
      const baru = notifikasiTenggatBaru(ambilDb(), pengguna, new Date())
      if (baru.length > 0) {
        ubahDb((d) => {
          d.notifikasi.push(...baru)
        })
      }
      return HttpResponse.json(kotakMilik(pengguna))
    }),
  ),
  http.post(
    `${API}/notifikasi/tandai-dibaca`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPengguna(request)
      if (pengguna instanceof Response) return pengguna
      const masukan = tandaiDibacaSchema.safeParse(await bacaJson(request))
      if (!masukan.success) return balasIsianTidakValid(masukan.error)
      const ids = masukan.data.ids === null ? null : new Set(masukan.data.ids)
      ubahDb((d) => {
        // Hanya milik pengguna sendiri: ID notifikasi orang lain diabaikan tanpa galat.
        for (const n of d.notifikasi) if (n.penggunaId === pengguna.id && (ids === null || ids.has(n.id))) n.dibaca = true
      })
      return HttpResponse.json(kotakMilik(pengguna))
    }),
  ),
]
