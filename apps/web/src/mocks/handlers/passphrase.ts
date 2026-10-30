import { http, HttpResponse } from 'msw'
import { aturPassphraseSchema, type StatusPassphrase } from '@/domain/surat/passphrase'
import { API, denganJaringan } from '../http'
import { bacaJson, balasIsianTidakValid, butuhKemampuan } from '../tulis'

const TIDAK_BERHAK = 'Peran Anda tidak menandatangani surat.'
// Demo memakai satu passphrase tetap (PASSPHRASE_TTE_DEMO), jadi status selalu "diatur" dan PUT tidak menyimpan apa pun.
const DIATUR: StatusPassphrase = { diatur: true }

/** Passphrase tanda tangan (Ruling 1 tahap 8F2b). Server nyata menyimpan hash argon2id; tiruan hanya memeriksa bentuk isian. */
export const handlerPassphrase = [
  http.get(
    `${API}/sesi/passphrase-tanda-tangan`,
    denganJaringan(({ request }) => {
      const pengguna = butuhKemampuan(request, 'surat.tandatangani', TIDAK_BERHAK)
      if (pengguna instanceof Response) return pengguna
      return HttpResponse.json(DIATUR)
    }),
  ),
  http.put(
    `${API}/sesi/passphrase-tanda-tangan`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhKemampuan(request, 'surat.tandatangani', TIDAK_BERHAK)
      if (pengguna instanceof Response) return pengguna
      const masukan = aturPassphraseSchema.safeParse(await bacaJson(request))
      if (!masukan.success) return balasIsianTidakValid(masukan.error)
      return HttpResponse.json(DIATUR)
    }),
  ),
]
