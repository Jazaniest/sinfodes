import { http, HttpResponse } from 'msw'
import { filterPenerimaSchema, type PenerimaBansos, type ProgramBansos, type RingkasProgram } from '@/domain/bansos/schema'
import { cakupanDusun } from '@/domain/pengguna/hak-akses'
import type { Pengguna } from '@/domain/pengguna/schema'
import { ambilDb } from '../db'
import { API, balasDaftar, balasGalat, denganJaringan } from '../http'
import { balasIsianTidakValid, butuhKemampuan } from '../tulis'

const butuhPembaca = (request: Request) => butuhKemampuan(request, 'bansos.lihat', 'Peran Anda tidak berhak membuka Bantuan Sosial.')
const TIDAK_DITEMUKAN = 'Program bantuan tidak ditemukan.'

/** Program desa dan penerimanya dalam cakupan pengguna: Kepala Dusun hanya penerima di dusunnya (SPEC §5.1). */
function bansosMilik(pengguna: Pengguna) {
  const db = ambilDb()
  const dusunSaja = cakupanDusun(pengguna)
  return {
    dusun: db.dusun.filter((d) => d.desaId === pengguna.desaId),
    program: db.programBansos.filter((p) => p.desaId === pengguna.desaId),
    penerima: db.penerimaBansos.filter((x) => x.desaId === pengguna.desaId && (dusunSaja === null || x.dusunId === dusunSaja)),
  }
}

function ringkas(p: ProgramBansos, penerima: readonly PenerimaBansos[]): RingkasProgram {
  const milik = penerima.filter((x) => x.programId === p.id)
  return { ...p, jumlahPenerima: milik.length, perluDitinjau: milik.filter((x) => x.perluDitinjau !== null).length }
}

/** Bantuan sosial (SPEC §8): hanya lihat. */
export const handlerBansos = [
  http.get(
    `${API}/bansos/program`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const { program, penerima } = bansosMilik(pengguna)
      const daftar = program.map((p) => ringkas(p, penerima))
      return balasDaftar(daftar, 1, Math.max(daftar.length, 1))
    }),
  ),
  http.get(
    `${API}/bansos/program/:id`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const { program, penerima } = bansosMilik(pengguna)
      const p = program.find((x) => x.id === String(params.id))
      return p ? HttpResponse.json(ringkas(p, penerima)) : balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
    }),
  ),
  http.get(
    `${API}/bansos/program/:id/penerima`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const filter = filterPenerimaSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
      if (!filter.success) return balasIsianTidakValid(filter.error)
      const f = filter.data
      const { dusun, program, penerima } = bansosMilik(pengguna)
      const p = program.find((x) => x.id === String(params.id))
      if (!p) return balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
      const nomor = new Map(dusun.map((d) => [d.id, d.nomor]))
      const dusunId = f.dusun === undefined ? null : (dusun.find((d) => d.nomor === f.dusun)?.id ?? '-')
      const daftar = penerima
        .filter(
          (x) =>
            x.programId === p.id && (dusunId === null || x.dusunId === dusunId) && (f.tampil === 'semua' || x.perluDitinjau !== null),
        )
        .sort(
          (a, b) =>
            (nomor.get(a.dusunId) ?? 0) - (nomor.get(b.dusunId) ?? 0) ||
            a.rw.localeCompare(b.rw) ||
            a.rt.localeCompare(b.rt) ||
            a.atasNama.nama.localeCompare(b.atasNama.nama, 'id'),
        )
      return balasDaftar(daftar, f.page, f.pageSize)
    }),
  ),
  http.get(
    `${API}/bansos/keluarga/:id`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const { program, penerima } = bansosMilik(pengguna)
      const hasil = penerima
        .filter((x) => x.keluargaId === String(params.id))
        .flatMap((x) => {
          const p = program.find((y) => y.id === x.programId)
          return p ? [{ program: p, penerima: x }] : []
        })
      return HttpResponse.json(hasil)
    }),
  ),
]
