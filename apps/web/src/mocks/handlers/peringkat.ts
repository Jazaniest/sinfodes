import { http, HttpResponse } from 'msw'
import { ambilDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { bekukanBulanTutup } from '../indeks'
import { uraiMusimPeriode } from '../indeks-parameter'
import { pastikanLencana } from '../lencana'
import { susunPeringkatDesa } from '../peringkat-desa'
import { butuhPengguna } from '../sesi-mock'

/** Halaman Peringkat panel desa (SPEC-V0.2 §9.5): hanya posisi desa sesi, tanpa nama atau ID desa lain. */
export const handlerPeringkat = [
  http.get(
    `${API}/peringkat`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengguna(request)
      if (pengguna instanceof Response) return pengguna
      const sekarang = new Date()
      const { musim, periode, galat } = uraiMusimPeriode(new URL(request.url).searchParams, sekarang)
      if (Object.keys(galat).length > 0) return balasGalat('VALIDATION', 'Pilihan periode tidak sah.', 422, galat)
      bekukanBulanTutup(sekarang)
      pastikanLencana(sekarang)
      const desa = ambilDb().desa.find((d) => d.id === pengguna.desaId)
      if (!desa) return balasGalat('NOT_FOUND', 'Desa tidak ditemukan.', 404)
      return HttpResponse.json(susunPeringkatDesa(ambilDb(), desa, musim, periode, sekarang))
    }),
  ),
]
