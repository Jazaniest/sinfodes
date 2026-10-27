import { http, HttpResponse } from 'msw'
import { tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import { gantiKepalaSchema, pecahKeluargaSchema } from '@/domain/keluarga/masukan'
import type { Keluarga } from '@/domain/keluarga/schema'
import type { Penduduk } from '@/domain/penduduk/schema'
import { kodeWilayahNik } from '@/domain/wilayah/alamat'
import { dataMilik } from '../cakupan'
import { ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { detailDari, nomorKkBaru, ubahHubungan } from '../operasi-kk'
import { bacaJson, balasField, balasIsianTidakValid, butuhPengubah, catatAktivitas, idBaru, pelakuDari, wilayahSah } from '../tulis'

const TIDAK_DITEMUKAN = 'Data keluarga tidak ditemukan.'

export const handlerKeluargaTulis = [
  http.post(
    `${API}/keluarga/:id/ganti-kepala`,
    denganJaringan(async ({ request, params }) => {
      const pengguna = butuhPengubah(request)
      if (pengguna instanceof Response) return pengguna
      const milik = dataMilik(pengguna)
      const kk = milik.keluarga.find((k) => k.id === String(params.id))
      if (!kk) return balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
      const isian = gantiKepalaSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const { kepalaBaruId, hubunganKepalaLama } = isian.data
      if (kepalaBaruId === kk.kepalaKeluargaId) return balasField('kepalaBaruId', 'Penduduk ini sudah menjadi kepala keluarga')
      const baru = kk.anggotaIds.includes(kepalaBaruId) ? milik.penduduk.find((p) => p.id === kepalaBaruId) : undefined
      if (!baru) return balasField('kepalaBaruId', 'Pilih salah satu anggota KK ini')
      const lama = kk.anggotaIds.includes(kk.kepalaKeluargaId) ? milik.penduduk.find((p) => p.id === kk.kepalaKeluargaId) : undefined
      const waktu = waktuIsoWib(new Date())
      const oleh = pelakuDari(pengguna)
      ubahDb((d) => {
        if (lama) ubahHubungan(d, lama, hubunganKepalaLama, oleh, waktu)
        ubahHubungan(d, baru, 'Kepala Keluarga', oleh, waktu)
        kk.kepalaKeluargaId = baru.id
        kk.anggotaIds = [baru.id, ...kk.anggotaIds.filter((id) => id !== baru.id)]
        catatAktivitas(d, {
          desaId: kk.desaId, dusunId: kk.dusunId, waktu, jenis: 'keluarga-ganti-kepala',
          ringkasan: `Kepala keluarga diganti · KK ${baru.nama}`, oleh, rujukan: { jenis: 'keluarga', id: kk.id },
        })
      })
      return HttpResponse.json(detailDari(kk, milik.penduduk))
    }),
  ),
  http.post(
    `${API}/keluarga/:id/pecah`,
    denganJaringan(async ({ request, params }) => {
      const pengguna = butuhPengubah(request)
      if (pengguna instanceof Response) return pengguna
      const milik = dataMilik(pengguna)
      const { db } = milik
      const kk = milik.keluarga.find((k) => k.id === String(params.id))
      if (!kk) return balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
      const isian = pecahKeluargaSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const m = isian.data
      const keluarIds = [...new Set(m.anggotaIds)]
      if (keluarIds.some((id) => !kk.anggotaIds.includes(id))) {
        return balasField('anggotaIds', 'Anggota yang dipilih harus anggota KK ini')
      }
      if (keluarIds.includes(kk.kepalaKeluargaId)) {
        return balasField('anggotaIds', 'Kepala keluarga tidak ikut dipindah. Ganti kepala keluarga lebih dulu bila perlu.')
      }
      if (!wilayahSah(milik.dusun, m.dusunId, m.rw, m.rt)) return balasField('dusunId', 'Wilayah tidak dikenal')
      const desa = db.desa.find((d) => d.id === pengguna.desaId)
      if (!desa) return balasGalat('SERVER', 'Data desa tidak ditemukan.', 500)
      const pindah = keluarIds.flatMap((id): Penduduk[] => {
        const p = milik.penduduk.find((x) => x.id === id)
        return p ? [p] : []
      })
      const kepala = pindah.find((p) => p.id === m.kepalaBaruId)
      if (!kepala) return balasField('kepalaBaruId', 'Kepala keluarga baru harus salah satu anggota yang keluar')

      const sekarang = new Date()
      const waktu = waktuIsoWib(sekarang)
      const oleh = pelakuDari(pengguna)
      const baru: Keluarga = {
        id: idBaru(db, 'kk'), desaId: pengguna.desaId, nomorKk: nomorKkBaru(db, kodeWilayahNik(desa), sekarang),
        kepalaKeluargaId: kepala.id, dusunId: m.dusunId, rw: m.rw, rt: m.rt, tanggalTerbit: tanggalIsoWib(sekarang),
        anggotaIds: [kepala.id, ...keluarIds.filter((id) => id !== kepala.id)],
      }
      ubahDb((d) => {
        d.keluarga.push(baru)
        kk.anggotaIds = kk.anggotaIds.filter((id) => !keluarIds.includes(id))
        for (const p of pindah) {
          Object.assign(p, { keluargaId: baru.id, dusunId: baru.dusunId, rw: baru.rw, rt: baru.rt, diubahPada: waktu })
          ubahHubungan(d, p, p.id === kepala.id ? 'Kepala Keluarga' : (m.hubungan[p.id] ?? p.hubunganKeluarga), oleh, waktu)
        }
        catatAktivitas(d, {
          desaId: baru.desaId, dusunId: baru.dusunId, waktu, jenis: 'keluarga-pecah',
          ringkasan: `KK dipecah · ${kepala.nama}${pindah.length > 1 ? ` (${pindah.length} orang)` : ''} membentuk KK baru`,
          oleh, rujukan: { jenis: 'keluarga', id: baru.id },
        })
      })
      return HttpResponse.json(detailDari(baru, milik.penduduk), { status: 201 })
    }),
  ),
]
