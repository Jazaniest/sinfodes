import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { waktuIsoWib } from '@/domain/format/tanggal'
import { periksaTema } from '@/domain/website/kontras'
import { pratinjauSchema, simpanDrafSchema } from '@/domain/website/susunan'
import type { TemaDasar } from '@/domain/website/tema'
import type { SitusDesa, VersiRiwayat, VersiSitus } from '@/domain/website/situs'
import { samaDenganGaleri } from '@/domain/website/galeri-dasar'
import { temaDasarSchema } from '@/domain/website/tema'
import { pratinjauBlok, type SumberTampil } from '../blok-publik'
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

/** Sumber tampilan dari versi terbit, dipakai penyelesaian blok website publik (bukan pratinjau penyunting). */
export function sumberTerbit(db: DbDemo, desaId: string): SumberTampil {
  const v = versiTerbit(db, desaId)
  return { motif: v.tema.motif, sampul: v.tema.sampul, halaman: v.susunan.halaman }
}

/** Tema valid (skema + kontras server); `idGaleri` dihitung ulang, tidak dipercaya dari klien (fokus review 2). */
function sahkanTema(mentah: unknown): TemaDasar | Response {
  const isian = temaDasarSchema.safeParse(mentah)
  if (!isian.success) return balasIsianTidakValid(isian.error)
  const gagal = periksaTema(isian.data).filter((p) => !p.lolos)
  if (gagal.length > 0) {
    const fields: Record<string, string> = {}
    for (const p of gagal) fields[p.kunci === 'aksen-latar' ? 'warnaAksen' : 'warnaUtama'] ??= p.pesan ?? ''
    return balasGalat('VALIDATION', gagal[0].pesan ?? 'Kontras warna belum cukup.', 422, fields)
  }
  return { ...isian.data, idGaleri: samaDenganGaleri(isian.data) }
}

/** `vrs_` + nomor berikutnya, dihitung dari semua versi dokumen desa itu. */
function idVersiBaru(db: DbDemo, desaId: string): string {
  const s = db.situs.find((x) => x.desaId === desaId)
  const nomor = [s?.terbit.id, s?.draf?.id, ...(s?.riwayat ?? []).map((v) => v.id)]
    .map((id) => Number(/^vrs_([0-9]+)$/.exec(id ?? '')?.[1] ?? 0))
    .reduce((a, b) => Math.max(a, b), 0)
  return `vrs_${nomor + 1}`
}

const dokumen = (db: DbDemo, desaId: string): SitusDesa => db.situs.find((x) => x.desaId === desaId) ?? situsBawaan(desaId, db.tanggalAcuan)

/** Versi riwayat tanpa gambar data URL besar: `logo`, `sampul`, dan `fotoLatar` diganti penanda `true`/`null`. */
function kePenanda(v: VersiSitus): VersiRiwayat {
  return {
    ...v,
    tema: {
      ...v.tema,
      logo: v.tema.logo ? true : null,
      sampul: v.tema.sampul ? true : null,
      warga: { ...v.tema.warga, fotoLatar: v.tema.warga.fotoLatar ? true : null },
    },
  }
}

const skemaCatatan = z.object({
  catatan: z
    .string()
    .trim()
    .max(200, 'Paling banyak 200 karakter.')
    .transform((s) => (s === '' ? null : s))
    .nullable()
    .default(null),
})

/** Website Desa (SPEC A8): artikel, pengumuman, agenda, dan galeri hanya lihat; Tampilan bisa disimpan. */
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
      const dok = dokumen(ambilDb(), pengguna.desaId)
      return HttpResponse.json({ terbit: dok.terbit, draf: dok.draf })
    }),
  ),
  http.post(
    `${API}/website/situs/pratinjau`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPengelola(request)
      if (pengguna instanceof Response) return pengguna
      const masukan = pratinjauSchema.safeParse(await bacaJson(request))
      if (!masukan.success) return balasIsianTidakValid(masukan.error)
      // Kontras tema tidak diperiksa: pratinjau tetap jalan selama warnanya sedang diperbaiki.
      const tema = temaDasarSchema.safeParse(masukan.data.tema)
      if (!tema.success) return balasIsianTidakValid(tema.error)
      const db = ambilDb()
      const desa = db.desa.find((x) => x.id === pengguna.desaId)
      if (!desa) return balasGalat('NOT_FOUND', 'Desa tidak ditemukan.', 404)
      const susunan = masukan.data.susunan
      const blok = masukan.data.halaman === 'beranda' ? susunan.beranda : susunan.halaman.find((h) => h.id === masukan.data.halaman)?.blok
      if (!blok) return balasGalat('NOT_FOUND', 'Halaman tidak ditemukan.', 404)
      // Pratinjau memakai tema dan halaman yang sedang disunting, bukan versi terbit.
      const sumber: SumberTampil = { motif: tema.data.motif, sampul: tema.data.sampul, halaman: susunan.halaman }
      return HttpResponse.json({ blok: pratinjauBlok(db, desa, blok, new Date(), sumber) })
    }),
  ),
  http.put(
    `${API}/website/situs/draf`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPengelola(request)
      if (pengguna instanceof Response) return pengguna
      const masukan = simpanDrafSchema.safeParse(await bacaJson(request))
      if (!masukan.success) return balasIsianTidakValid(masukan.error)
      const db = ambilDb()
      // Penjaga timpa diam-diam: simpanan ditolak bila draf di server sudah berganti ID (mis. tab lain menyimpan lebih dulu).
      const drafKini = db.situs.find((x) => x.desaId === pengguna.desaId)?.draf ?? null
      if (drafKini && drafKini.id !== masukan.data.dasarId) {
        return balasGalat('CONFLICT', 'Draf diubah di tempat lain. Muat ulang untuk melihat perubahan terbaru.', 409)
      }
      const tema = sahkanTema(masukan.data.tema)
      if (tema instanceof Response) return tema
      const draf: VersiSitus = {
        id: idVersiBaru(db, pengguna.desaId),
        tema,
        susunan: masukan.data.susunan,
        diperbarui: waktuIsoWib(new Date()),
        oleh: pelakuDari(pengguna),
        catatan: null,
      }
      ubahDb((d) => {
        const ada = d.situs.find((x) => x.desaId === pengguna.desaId)
        if (ada) ada.draf = draf
        else d.situs.push({ desaId: pengguna.desaId, terbit: situsBawaan(pengguna.desaId, d.tanggalAcuan).terbit, draf, riwayat: [] })
      })
      return HttpResponse.json(draf)
    }),
  ),
  http.delete(
    `${API}/website/situs/draf`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengelola(request)
      if (pengguna instanceof Response) return pengguna
      const terbit = dokumen(ambilDb(), pengguna.desaId).terbit
      ubahDb((d) => {
        const ada = d.situs.find((x) => x.desaId === pengguna.desaId)
        if (ada) ada.draf = null
      })
      return HttpResponse.json({ terbit, draf: null })
    }),
  ),
  http.post(
    `${API}/website/situs/terbitkan`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPengelola(request)
      if (pengguna instanceof Response) return pengguna
      const isian = skemaCatatan.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const dok = dokumen(ambilDb(), pengguna.desaId)
      if (!dok.draf) return balasGalat('CONFLICT', 'Tidak ada draf untuk diterbitkan.', 409)
      const terbit: VersiSitus = { ...dok.draf, diperbarui: waktuIsoWib(new Date()), oleh: pelakuDari(pengguna), catatan: isian.data.catatan }
      ubahDb((d) => {
        const ada = d.situs.find((x) => x.desaId === pengguna.desaId)
        if (!ada) return
        ada.riwayat.unshift(ada.terbit)
        ada.riwayat = ada.riwayat.slice(0, 20)
        ada.terbit = terbit
        ada.draf = null
      })
      return HttpResponse.json(terbit)
    }),
  ),
  http.get(
    `${API}/website/situs/riwayat`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengelola(request)
      if (pengguna instanceof Response) return pengguna
      return HttpResponse.json({ data: dokumen(ambilDb(), pengguna.desaId).riwayat.map(kePenanda) })
    }),
  ),
  http.post(
    `${API}/website/situs/riwayat/:id/pulihkan`,
    denganJaringan(({ params, request }) => {
      const pengguna = butuhPengelola(request)
      if (pengguna instanceof Response) return pengguna
      const db = ambilDb()
      const versi = dokumen(db, pengguna.desaId).riwayat.find((v) => v.id === String(params.id))
      if (!versi) return balasGalat('NOT_FOUND', 'Versi tidak ditemukan.', 404)
      // Pulihkan menyalin versi lama menjadi draf; website belum berubah sampai diterbitkan.
      const draf: VersiSitus = { ...structuredClone(versi), id: idVersiBaru(db, pengguna.desaId), diperbarui: waktuIsoWib(new Date()) }
      ubahDb((d) => {
        const ada = d.situs.find((x) => x.desaId === pengguna.desaId)
        if (ada) ada.draf = draf
        else d.situs.push({ desaId: pengguna.desaId, terbit: situsBawaan(pengguna.desaId, d.tanggalAcuan).terbit, draf, riwayat: [] })
      })
      return HttpResponse.json(draf)
    }),
  ),
]
