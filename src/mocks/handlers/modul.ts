import { http, HttpResponse } from 'msw'
import { modulDesaSchema } from '@/domain/pengaturan/modul'
import { ubahDb } from '../db'
import { API, denganJaringan } from '../http'
import { modulDesaDi } from '../modul'
import { bacaJson, balasIsianTidakValid, butuhKemampuan } from '../tulis'

const butuhPengatur = (request: Request) => butuhKemampuan(request, 'modul.kelola', 'Hanya Sekretaris Desa yang mengatur modul.')

/** Modul desa (SPEC-V0.2 12.3): Sekretaris Desa menyalakan atau mematikan Kesehatan. Datanya tidak dihapus saat dimatikan. */
export const handlerModul = [
  http.get(
    `${API}/pengaturan/modul`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengatur(request)
      if (pengguna instanceof Response) return pengguna
      return HttpResponse.json(modulDesaDi(pengguna.desaId))
    }),
  ),
  http.put(
    `${API}/pengaturan/modul`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPengatur(request)
      if (pengguna instanceof Response) return pengguna
      const masukan = modulDesaSchema.safeParse(await bacaJson(request))
      if (!masukan.success) return balasIsianTidakValid(masukan.error)
      ubahDb((d) => {
        const ada = d.modulDesa.find((m) => m.desaId === pengguna.desaId)
        if (ada) Object.assign(ada, masukan.data)
        else d.modulDesa.push({ desaId: pengguna.desaId, ...masukan.data })
      })
      return HttpResponse.json(modulDesaDi(pengguna.desaId))
    }),
  ),
]
