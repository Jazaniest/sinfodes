import { http, HttpResponse } from 'msw'
import { tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import { PERPINDAHAN_STATUS } from '@/domain/konsol/aturan'
import { ubahPeriodeTagihanSchema, ubahStatusDesaSchema } from '@/domain/konsol/schema'
import { jadwalTagihan, periodeTagihanMemuat } from '@/domain/langganan/tagihan'
import { langkahBerikut } from '@/domain/wilayah/persiapan'
import { ambilDb, ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { angkaKonsolDesa } from '../konsol-angka'
import { butuhPenggunaKonsol } from '../sesi-mock'
import { buatTagihan } from '../tagihan'
import { terapkanTagihanBaru } from '@sinfodes/demo/tagihan-hitung'
import { bacaJson, balasIsianTidakValid } from '../tulis'
import { detailDesa } from './konsol'

const HARI_MS = 86_400_000
const tambahHari = (t: string, hari: number): string => new Date(Date.parse(`${t}T00:00:00Z`) + hari * HARI_MS).toISOString().slice(0, 10)
/** Lama masa uji coba sejak desa keluar dari Persiapan (sama dengan desa Uji coba di pembangkit). */
const HARI_UJI_COBA = 60

const TIDAK_DITEMUKAN = 'Desa tidak ditemukan.'

/**
 * Ubah status desa dan periode tagihannya (SPEC-V0.2 §7, §10.5, §18), hanya Tim Sinfodes. Perubahan status membutuhkan alasan,
 * tercatat di `riwayatStatusDesa`, dan tidak pernah menghapus data desa.
 */
export const handlerKonsolStatus = [
  http.post(
    `${API}/konsol/desa/:id/status`,
    denganJaringan(async ({ request, params }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      const db = ambilDb()
      const desa = db.desa.find((d) => d.id === String(params.id))
      if (!desa) return balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
      const isian = ubahStatusDesaSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const { ke, alasan } = isian.data
      const dari = desa.status
      if (!PERPINDAHAN_STATUS[dari].includes(ke)) return balasGalat('CONFLICT', 'Perubahan status ini tidak tersedia.', 409)
      const sekarang = new Date()
      if (dari === 'Persiapan' && langkahBerikut(angkaKonsolDesa(db, desa, sekarang).persiapan) !== null) {
        return balasGalat('CONFLICT', 'Selesaikan kelima langkah persiapan dulu.', 409)
      }
      const hariIni = tanggalIsoWib(sekarang)
      const pada = waktuIsoWib(sekarang)
      ubahDb((d) => {
        const x = d.desa.find((y) => y.id === desa.id)!
        const l = d.langganan.find((y) => y.desaId === desa.id)
        x.status = ke
        d.riwayatStatusDesa.push({ desaId: desa.id, dari, ke, alasan, pada, oleh: { id: pengguna.id, nama: pengguna.nama } })
        if (l && dari === 'Persiapan') {
          l.mulai = hariIni
          l.sampai = tambahHari(hariIni, HARI_UJI_COBA)
        }
        if (l && dari === 'Uji coba' && ke === 'Aktif') {
          // Langganan dimulai hari ini, tahunan (SPEC-V0.2 §18). Tagihan pertama untuk tahun kalender yang memuat hari ini, terbit
          // hari ini dengan jatuh tempo 14 hari lagi atau mulai periode + 14, mana yang lebih lambat.
          l.mulai = hariIni
          l.periodeTagihan = 'tahunan'
          const periode = periodeTagihanMemuat('tahunan', hariIni)
          const pertama = buatTagihan(d, { desa: x, langganan: l, periode })
          pertama.terbit = hariIni
          pertama.jatuhTempo = [jadwalTagihan(periode).jatuhTempo, tambahHari(hariIni, 14)].sort().at(-1)!
          pertama.riwayat[0].pada = pada
          terapkanTagihanBaru(d, [pertama])
        }
      })
      const baru = ambilDb()
      return HttpResponse.json(detailDesa(baru, baru.desa.find((d) => d.id === desa.id)!, sekarang))
    }),
  ),
  http.put(
    `${API}/konsol/desa/:id/periode-tagihan`,
    denganJaringan(async ({ request, params }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      const desa = ambilDb().desa.find((d) => d.id === String(params.id))
      if (!desa) return balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
      const isian = ubahPeriodeTagihanSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      // Berlaku mulai tagihan berikutnya: tagihan yang sudah terbit tidak disentuh.
      ubahDb((d) => {
        const l = d.langganan.find((y) => y.desaId === desa.id)
        if (l) l.periodeTagihan = isian.data.periodeTagihan
      })
      const baru = ambilDb()
      return HttpResponse.json(detailDesa(baru, baru.desa.find((d) => d.id === desa.id)!, new Date()))
    }),
  ),
]
