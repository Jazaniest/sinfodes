import { http, HttpResponse } from 'msw'
import {
  jabatanBawaan, periksaAturanPengguna, ubahPenggunaSchema, undangPenggunaSchema, type PelanggaranPengguna,
} from '@/domain/pengaturan/pengguna'
import { PERAN, type Pengguna } from '@/domain/pengguna/schema'
import type { Dusun } from '@/domain/wilayah/schema'
import { ambilDb, ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import type { DbDemo } from '../tipe-db'
import { bacaJson, balasField, balasIsianTidakValid, butuhKemampuan, emailTerpakai, idBaru } from '../tulis'

const butuhPengelola = (request: Request) => butuhKemampuan(request, 'pengguna.kelola', 'Hanya Sekretaris Desa yang mengelola pengguna.')

function balasPelanggaran(p: PelanggaranPengguna): Response {
  const status = p.kode === 'FORBIDDEN' ? 403 : p.kode === 'CONFLICT' ? 409 : 422
  return balasGalat(p.kode, p.pesan, status, p.field ? { [p.field]: p.pesan } : undefined)
}

/** Dusun milik desa; undefined bila ID tidak dikenal, null bila tidak ada dusun yang dipilih. */
function dusunDesa(db: DbDemo, desaId: string, dusunId: string | null): Dusun | null | undefined {
  return dusunId === null ? null : db.dusun.find((d) => d.id === dusunId && d.desaId === desaId)
}
const dusunTidakAda = () => balasGalat('VALIDATION', 'Dusun tidak ditemukan.', 422, { dusunId: 'Dusun tidak ditemukan.' })

const urutPeran = (p: Pengguna) => PERAN.indexOf(p.peran)

/** Pengguna desa (SPEC §8). Hanya Sekretaris Desa yang mengelolanya (SPEC §5.1). */
export const handlerPenggunaDesa = [
  http.get(
    `${API}/pengaturan/pengguna`,
    denganJaringan(({ request }) => {
      const pelaku = butuhPengelola(request)
      if (pelaku instanceof Response) return pelaku
      const daftar = ambilDb()
        .pengguna.filter((p) => p.desaId === pelaku.desaId)
        .sort((a, b) => Number(b.aktif) - Number(a.aktif) || urutPeran(a) - urutPeran(b) || a.nama.localeCompare(b.nama, 'id'))
      return HttpResponse.json(daftar)
    }),
  ),
  http.post(
    `${API}/pengaturan/pengguna`,
    denganJaringan(async ({ request }) => {
      const pelaku = butuhPengelola(request)
      if (pelaku instanceof Response) return pelaku
      const isian = undangPenggunaSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const db = ambilDb()
      const dusun = dusunDesa(db, pelaku.desaId, isian.data.peran === 'kadus' ? isian.data.dusunId : null)
      if (dusun === undefined) return dusunTidakAda()
      // Di demo undangan langsung membuat akun aktif dengan kata sandi demo (keputusan rencana).
      const baru: Pengguna = {
        id: idBaru(db, 'pgn'),
        desaId: pelaku.desaId,
        nama: isian.data.nama,
        jabatan: jabatanBawaan(isian.data.peran, dusun),
        peran: isian.data.peran,
        dusunId: dusun?.id ?? null,
        email: isian.data.email,
        aktif: true,
      }
      const langgar = periksaAturanPengguna(db.pengguna, pelaku.id, null, baru)
      if (langgar) return balasPelanggaran(langgar)
      // Sisanya akun Konsol atau kabupaten: pemiliknya di luar desa, jadi namanya tidak ditampilkan.
      if (emailTerpakai(db, baru.email)) return balasField('email', 'Surel ini sudah dipakai akun lain.', 'CONFLICT')
      ubahDb((d) => {
        d.pengguna.push(baru)
      })
      return HttpResponse.json(baru, { status: 201 })
    }),
  ),
  http.patch(
    `${API}/pengaturan/pengguna/:id`,
    denganJaringan(async ({ request, params }) => {
      const pelaku = butuhPengelola(request)
      if (pelaku instanceof Response) return pelaku
      const isian = ubahPenggunaSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const db = ambilDb()
      const sasaran = db.pengguna.find((p) => p.id === String(params.id) && p.desaId === pelaku.desaId)
      if (!sasaran) return balasGalat('NOT_FOUND', 'Pengguna tidak ditemukan.', 404)
      const peran = isian.data.peran ?? sasaran.peran
      const dusunId = peran === 'kadus' ? (isian.data.dusunId !== undefined ? isian.data.dusunId : sasaran.dusunId) : null
      const dusun = dusunDesa(db, pelaku.desaId, dusunId)
      if (dusun === undefined) return dusunTidakAda()
      const berubahJabatan = peran !== sasaran.peran || dusunId !== sasaran.dusunId
      const sesudah: Pengguna = {
        ...sasaran,
        peran,
        dusunId,
        aktif: isian.data.aktif ?? sasaran.aktif,
        jabatan: berubahJabatan ? jabatanBawaan(peran, dusun) : sasaran.jabatan,
      }
      const langgar = periksaAturanPengguna(db.pengguna, pelaku.id, sasaran, sesudah)
      if (langgar) return balasPelanggaran(langgar)
      ubahDb(() => {
        Object.assign(sasaran, sesudah)
      })
      return HttpResponse.json(sasaran)
    }),
  ),
]
