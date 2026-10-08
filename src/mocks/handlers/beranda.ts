import { http, HttpResponse } from 'msw'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { JENIS_MUTASI, type JenisMutasi } from '@/domain/mutasi/schema'
import { dataBelumLengkap } from '@/domain/penduduk/filter'
import { dataMilik } from '../cakupan'
import { API, denganJaringan } from '../http'
import { butuhPengguna } from '../sesi-mock'

export const handlerBeranda = [
  http.get(
    `${API}/beranda`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengguna(request)
      if (pengguna instanceof Response) return pengguna
      const milik = dataMilik(pengguna)
      const sekarang = new Date()
      const hariIni = tanggalIsoWib(sekarang)
      const bulanIni = hariIni.slice(0, 7)
      const hidup = milik.penduduk.filter((p) => p.statusDasar === 'Hidup')
      const petugas = pengguna.peran === 'operator' || pengguna.peran === 'sekdes'
      const belumLengkap = hidup.filter((p) => dataBelumLengkap(p, sekarang)).length
      const mutasiBulanIni = Object.fromEntries(
        JENIS_MUTASI.map((j) => [j, milik.mutasi.filter((m) => m.jenis === j && m.tanggal.startsWith(bulanIni)).length]),
      ) as Record<JenisMutasi, number>
      return HttpResponse.json({
        tindakan: petugas ? (belumLengkap > 0 ? [{ jenis: 'data-belum-lengkap', jumlah: belumLengkap }] : []) : null,
        bukuHariIni: petugas
          ? milik.aktivitas
              .filter((a) => tanggalIsoWib(new Date(a.waktu)) === hariIni)
              .sort((a, b) => a.waktu.localeCompare(b.waktu))
          : null,
        keadaan: {
          cakupan: milik.dusunSaja === null ? 'desa' : 'dusun',
          dusunId: milik.dusunSaja,
          jiwa: hidup.length,
          kk: milik.keluarga.length,
          laki: hidup.filter((p) => p.jenisKelamin === 'L').length,
          perempuan: hidup.filter((p) => p.jenisKelamin === 'P').length,
          bulanIni: mutasiBulanIni,
        },
      })
    }),
  ),
]
