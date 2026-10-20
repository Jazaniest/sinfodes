import { http, HttpResponse } from 'msw'
import { waktuIsoWib } from '@/domain/format/tanggal'
import { periksaTema } from '@/domain/website/kontras'
import type { VersiSitus } from '@/domain/website/situs'
import { samaDenganGaleri } from '@/domain/website/galeri-dasar'
import { temaDasarSchema } from '@/domain/website/tema'
import { ambilDb, ubahDb } from '../db'
import { API, balasDaftar, balasGalat, denganJaringan } from '../http'
import type { DbDemo } from '../tipe-db'
import { situsBawaan } from '../generator/website'
import { bacaJson, balasIsianTidakValid, butuhKemampuan, pelakuDari } from '../tulis'

const butuhPengelola = (request: Request) => butuhKemampuan(request, 'website.kelola', 'Peran Anda tidak berhak mengelola Website Desa.')

/** Satu halaman berisi semua baris: daftar website pendek dan belum dipecah per halaman. */
const balasSemua = <T,>(daftar: readonly T[]) => balasDaftar(daftar, 1, Math.max(daftar.length, 1))

/** Versi terbit situs desa, atau tema Warta bawaan untuk desa yang belum punya dokumen (mis. desa baru dari Konsol). */
export function versiTerbit(db: DbDemo, desaId: string): VersiSitus {
  return (db.situs.find((x) => x.desaId === desaId) ?? situsBawaan(desaId, db.tanggalAcuan)).terbit
}

/** Website Desa (SPEC §8): artikel, pengumuman, agenda, dan galeri hanya lihat; Tampilan bisa disimpan. */
export const handlerWebsite = [
  http.get(
    `${API}/website/artikel`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengelola(request)
      if (pengguna instanceof Response) return pengguna
      return balasSemua(ambilDb().artikel.filter((a) => a.desaId === pengguna.desaId).sort((a, b) => b.tanggal.localeCompare(a.tanggal)))
    }),
  ),
  http.get(
    `${API}/website/pengumuman`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengelola(request)
      if (pengguna instanceof Response) return pengguna
      return balasSemua(ambilDb().pengumuman.filter((p) => p.desaId === pengguna.desaId).sort((a, b) => b.mulai.localeCompare(a.mulai)))
    }),
  ),
  http.get(
    `${API}/website/agenda`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengelola(request)
      if (pengguna instanceof Response) return pengguna
      return balasSemua(
        ambilDb()
          .agenda.filter((a) => a.desaId === pengguna.desaId)
          .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.mulai.localeCompare(b.mulai)),
      )
    }),
  ),
  http.get(
    `${API}/website/galeri`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengelola(request)
      if (pengguna instanceof Response) return pengguna
      return balasSemua(ambilDb().galeri.filter((f) => f.desaId === pengguna.desaId))
    }),
  ),
  http.get(
    `${API}/website/situs`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengelola(request)
      if (pengguna instanceof Response) return pengguna
      return HttpResponse.json({ terbit: versiTerbit(ambilDb(), pengguna.desaId) })
    }),
  ),
  http.put(
    `${API}/website/situs/tema`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPengelola(request)
      if (pengguna instanceof Response) return pengguna
      const isian = temaDasarSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      // Kontras ditegakkan di sini juga, bukan hanya di layar (fokus review 2).
      const gagal = periksaTema(isian.data).filter((p) => !p.lolos)
      if (gagal.length > 0) {
        const fields: Record<string, string> = {}
        for (const p of gagal) fields[p.kunci === 'aksen-latar' ? 'warnaAksen' : 'warnaUtama'] ??= p.pesan ?? ''
        return balasGalat('VALIDATION', gagal[0].pesan ?? 'Kontras warna belum cukup.', 422, fields)
      }
      // Tema galeri terpasang dihitung di sini, bukan dipercaya dari klien: null begitu satu pengaturan berbeda dari tema.
      const tema = { ...isian.data, idGaleri: samaDenganGaleri(isian.data) }
      const baru: VersiSitus = { tema, diperbarui: waktuIsoWib(new Date()), oleh: pelakuDari(pengguna) }
      ubahDb((d) => {
        const ada = d.situs.find((x) => x.desaId === pengguna.desaId)
        if (ada) ada.terbit = baru
        else d.situs.push({ desaId: pengguna.desaId, terbit: baru, draf: null, riwayat: [] })
      })
      return HttpResponse.json(baru)
    }),
  ),
]
