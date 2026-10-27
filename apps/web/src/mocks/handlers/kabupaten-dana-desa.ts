import { http, HttpResponse } from 'msw'
import { ambilDb } from '../db'
import { API, denganJaringan } from '../http'
import { danaDesaKabupaten } from '../kabupaten-angka'
import { butuhKemampuanKabupaten } from '../sesi-mock'

const TIDAK_BERHAK = 'Akun ini tidak berhak membuka dasbor kabupaten.'

/** Dana Desa kabupaten (SPEC-V0.2 §8.3 butir 4): hanya desa di kabupaten akun. */
export const handlerKabupatenDanaDesa = [
  http.get(
    `${API}/kabupaten/dana-desa`,
    denganJaringan(({ request }) => {
      const akun = butuhKemampuanKabupaten(request, 'kab.lihat', TIDAK_BERHAK)
      if (akun instanceof Response) return akun
      return HttpResponse.json(danaDesaKabupaten(ambilDb(), akun.kabupatenKode, new Date()))
    }),
  ),
]
