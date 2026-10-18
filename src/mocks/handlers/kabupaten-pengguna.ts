import { http, HttpResponse } from 'msw'
import type { PelanggaranPengguna } from '@/domain/pengaturan/pengguna'
import { periksaAturanPenggunaKabupaten, tambahPenggunaKabupatenSchema, ubahPenggunaKabupatenSchema } from '@/domain/kabupaten/pengguna'
import { LABEL_PERAN_KABUPATEN, PERAN_KABUPATEN, type PenggunaKabupaten } from '@/domain/kabupaten/schema'
import { ambilDb, ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { butuhKemampuanKabupaten } from '../sesi-mock'
import { bacaJson, balasField, balasIsianTidakValid, emailTerpakai, idBaru } from '../tulis'

const butuhPengelola = (request: Request) => butuhKemampuanKabupaten(request, 'kab.pengguna', 'Hanya Admin Kabupaten yang mengelola pengguna.')

function balasPelanggaran(p: PelanggaranPengguna): Response {
  const status = p.kode === 'FORBIDDEN' ? 403 : p.kode === 'CONFLICT' ? 409 : 422
  return balasGalat(p.kode, p.pesan, status, p.field ? { [p.field]: p.pesan } : undefined)
}

const urutPeran = (p: PenggunaKabupaten) => PERAN_KABUPATEN.indexOf(p.peran)

/** Pengguna kabupaten (SPEC-V0.2 §8.1). Hanya Admin Kabupaten, dan hanya akun kabupatennya sendiri. */
export const handlerPenggunaKabupaten = [
  http.get(
    `${API}/kabupaten/pengguna`,
    denganJaringan(({ request }) => {
      const pelaku = butuhPengelola(request)
      if (pelaku instanceof Response) return pelaku
      const daftar = ambilDb()
        .penggunaKabupaten.filter((p) => p.kabupatenKode === pelaku.kabupatenKode)
        .sort((a, b) => Number(b.aktif) - Number(a.aktif) || urutPeran(a) - urutPeran(b) || a.nama.localeCompare(b.nama, 'id'))
      return HttpResponse.json(daftar)
    }),
  ),
  http.post(
    `${API}/kabupaten/pengguna`,
    denganJaringan(async ({ request }) => {
      const pelaku = butuhPengelola(request)
      if (pelaku instanceof Response) return pelaku
      const isian = tambahPenggunaKabupatenSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const db = ambilDb()
      if (emailTerpakai(db, isian.data.email)) return balasField('email', 'Email ini sudah dipakai akun lain.', 'CONFLICT')
      // Di demo undangan langsung membuat akun aktif dengan kata sandi demo, sama dengan undangan pengguna desa.
      const baru: PenggunaKabupaten = {
        id: idBaru(db, 'kab'),
        kabupatenKode: pelaku.kabupatenKode,
        nama: isian.data.nama,
        jabatan: isian.data.jabatan || LABEL_PERAN_KABUPATEN[isian.data.peran],
        peran: isian.data.peran,
        email: isian.data.email,
        aktif: true,
      }
      ubahDb((d) => {
        d.penggunaKabupaten.push(baru)
      })
      return HttpResponse.json(baru, { status: 201 })
    }),
  ),
  http.patch(
    `${API}/kabupaten/pengguna/:id`,
    denganJaringan(async ({ request, params }) => {
      const pelaku = butuhPengelola(request)
      if (pelaku instanceof Response) return pelaku
      const isian = ubahPenggunaKabupatenSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const db = ambilDb()
      // Akun kabupaten lain sama dengan tidak ada: keberadaannya pun tidak dibocorkan.
      const sasaran = db.penggunaKabupaten.find((p) => p.id === String(params.id) && p.kabupatenKode === pelaku.kabupatenKode)
      if (!sasaran) return balasGalat('NOT_FOUND', 'Pengguna tidak ditemukan.', 404)
      const sesudah: PenggunaKabupaten = { ...sasaran, peran: isian.data.peran ?? sasaran.peran, aktif: isian.data.aktif ?? sasaran.aktif }
      const langgar = periksaAturanPenggunaKabupaten(db.penggunaKabupaten, pelaku.id, sasaran, sesudah)
      if (langgar) return balasPelanggaran(langgar)
      ubahDb(() => {
        Object.assign(sasaran, sesudah)
      })
      return HttpResponse.json(sasaran)
    }),
  ),
]
