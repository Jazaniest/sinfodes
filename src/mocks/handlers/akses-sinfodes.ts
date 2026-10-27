import { http, HttpResponse } from 'msw'
import { waktuIsoWib } from '@/domain/format/tanggal'
import { beriAksesSchema, type AksesSinfodes, type RiwayatAkses } from '@/domain/pengaturan/akses-sinfodes'
import { masihBerlaku } from '../bantuan'
import { ambilDb, ubahDb } from '../db'
import { API, denganJaringan } from '../http'
import type { AksesBantuan, DbDemo } from '../tipe-db'
import { bacaJson, balasIsianTidakValid, butuhKemampuan, idBaru } from '../tulis'

const JAM_MS = 3_600_000

const butuhPemberi = (request: Request) =>
  butuhKemampuan(request, 'akses-sinfodes.kelola', 'Hanya Sekretaris Desa dan Kepala Desa yang memberi akses bantuan Sinfodes.')

function berakhir(a: AksesBantuan, sekarang: Date): RiwayatAkses['berakhir'] {
  if (a.dicabut !== null) return 'dicabut'
  return masihBerlaku(a, sekarang) ? null : 'habis'
}

/** Keadaan akses bantuan desa; riwayat terbaru dulu (urutan simpan sudah urutan waktu). */
export function aksesSinfodesDesa(db: DbDemo, desaId: string, sekarang: Date): AksesSinfodes {
  const nama = (id: string) => db.pengguna.find((p) => p.id === id)?.nama ?? 'Pengguna desa'
  const milik = db.aksesBantuan.filter((a) => a.desaId === desaId).reverse()
  const aktif = milik.find((a) => masihBerlaku(a, sekarang))
  return {
    aktif: aktif
      ? { id: aktif.id, mulai: aktif.mulai, sampai: aktif.sampai, sembunyikanDataPribadi: aktif.sembunyikanDataPribadi, diberiOleh: nama(aktif.diberiOlehId) }
      : null,
    riwayat: milik.map((a) => ({
      id: a.id,
      mulai: a.mulai,
      sampai: a.sampai,
      berakhir: berakhir(a, sekarang),
      diberiOleh: nama(a.diberiOlehId),
      sesi: a.sesi.map((s) => ({ oleh: s.olehNama, mulai: s.mulai, halaman: s.halaman })),
    })),
  }
}

/** Akses bantuan Sinfodes, sisi desa (SPEC-V0.2 §5.3): beri, lihat, dan cabut. */
export const handlerAksesSinfodes = [
  http.get(
    `${API}/pengaturan/akses-sinfodes`,
    denganJaringan(({ request }) => {
      const pelaku = butuhPemberi(request)
      if (pelaku instanceof Response) return pelaku
      return HttpResponse.json(aksesSinfodesDesa(ambilDb(), pelaku.desaId, new Date()))
    }),
  ),
  http.post(
    `${API}/pengaturan/akses-sinfodes`,
    denganJaringan(async ({ request }) => {
      const pelaku = butuhPemberi(request)
      if (pelaku instanceof Response) return pelaku
      const isian = beriAksesSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const sekarang = new Date()
      const kini = waktuIsoWib(sekarang)
      ubahDb((d) => {
        // Satu akses berlaku pada satu waktu: akses lama ditutup, jejaknya tetap di riwayat.
        for (const a of d.aksesBantuan) if (a.desaId === pelaku.desaId && masihBerlaku(a, sekarang)) a.dicabut = kini
        d.aksesBantuan.push({
          id: idBaru(d, 'aks'),
          desaId: pelaku.desaId,
          diberiOlehId: pelaku.id,
          mulai: kini,
          sampai: waktuIsoWib(new Date(sekarang.getTime() + isian.data.lamaJam * JAM_MS)),
          sembunyikanDataPribadi: isian.data.sembunyikanDataPribadi,
          dicabut: null,
          sesi: [],
        })
      })
      return HttpResponse.json(aksesSinfodesDesa(ambilDb(), pelaku.desaId, sekarang), { status: 201 })
    }),
  ),
  http.delete(
    `${API}/pengaturan/akses-sinfodes`,
    denganJaringan(({ request }) => {
      const pelaku = butuhPemberi(request)
      if (pelaku instanceof Response) return pelaku
      const sekarang = new Date()
      ubahDb((d) => {
        for (const a of d.aksesBantuan) if (a.desaId === pelaku.desaId && masihBerlaku(a, sekarang)) a.dicabut = waktuIsoWib(sekarang)
      })
      return HttpResponse.json(aksesSinfodesDesa(ambilDb(), pelaku.desaId, sekarang))
    }),
  ),
]
