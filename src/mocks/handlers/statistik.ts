import { http, HttpResponse } from 'msw'
import { hitungStatistik } from '@/domain/statistik/penduduk'
import { dataMilik } from '../cakupan'
import { API, balasGalat, denganJaringan } from '../http'
import { butuhKemampuan } from '../tulis'

export const handlerStatistik = [
  http.get(
    `${API}/statistik/penduduk`,
    denganJaringan(({ request }) => {
      const pengguna = butuhKemampuan(request, 'penduduk.lihat', 'Peran Anda tidak berhak melihat statistik penduduk.')
      if (pengguna instanceof Response) return pengguna
      const milik = dataMilik(pengguna)
      const desa = milik.db.desa.find((d) => d.id === pengguna.desaId)
      if (!desa) return balasGalat('SERVER', 'Data desa tidak ditemukan.', 500)
      const diminta = new URL(request.url).searchParams.get('dusun')
      // Kepala Dusun selalu mendapat dusunnya sendiri; permintaan dusun lain diabaikan (SPEC §5.1).
      const dusunSendiri = milik.dusunSaja === null ? null : (milik.dusun.find((d) => d.id === milik.dusunSaja)?.nomor ?? null)
      const nomor = dusunSendiri ?? (diminta !== null && /^\d+$/.test(diminta) ? Number(diminta) : null)
      const d = nomor === null ? undefined : milik.dusun.find((x) => x.nomor === nomor)
      if (nomor !== null && !d) return balasGalat('VALIDATION', 'Dusun tidak dikenal.', 422)
      const penduduk = d ? milik.penduduk.filter((p) => p.dusunId === d.id) : milik.penduduk
      const kk = d ? milik.keluarga.filter((k) => k.dusunId === d.id).length : milik.keluarga.length
      return HttpResponse.json(
        hitungStatistik(penduduk, { hariIni: new Date(), dusun: milik.dusun, istilah: desa.istilahWilayah, dusunTerpilih: nomor, kk }),
      )
    }),
  ),
]
