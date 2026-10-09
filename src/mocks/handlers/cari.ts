import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { cocokNama, cocokPenduduk, kataAngka, kataCukup } from '@/domain/penduduk/cari'
import { boleh } from '@/domain/pengguna/hak-akses'
import { dataMilik } from '../cakupan'
import { API, balasGalat, denganJaringan } from '../http'
import { butuhPengguna } from '../sesi-mock'

const MAKS_PER_JENIS = 5
const cariSchema = z.object({ kata: z.string().trim().max(100) })

export const handlerCari = [
  http.post(
    `${API}/cari`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPengguna(request)
      if (pengguna instanceof Response) return pengguna
      const isian = cariSchema.safeParse(await request.json().catch(() => null))
      if (!isian.success) return balasGalat('VALIDATION', 'Kata pencarian tidak valid.', 422)
      const kata = isian.data.kata
      if (!kataCukup(kata) || !boleh(pengguna.peran, 'penduduk.lihat')) {
        return HttpResponse.json({ penduduk: [], keluarga: [], surat: [] })
      }
      const milik = dataMilik(pengguna)
      const perId = new Map(milik.penduduk.map((p) => [p.id, p] as const))
      const nomorKk = new Map(milik.semuaKeluarga.map((k) => [k.id, k.nomorKk] as const))
      const penduduk = milik.penduduk
        .filter((p) => cocokPenduduk(p, kata, nomorKk.get(p.keluargaId) ?? ''))
        .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
        .slice(0, MAKS_PER_JENIS)
        .map(({ id, nama, nik, jenisKelamin, tanggalLahir, dusunId, rw, rt, statusDasar }) => ({
          id, nama, nik, jenisKelamin, tanggalLahir, dusunId, rw, rt, statusDasar,
        }))
      const angka = kataAngka(kata)
      const keluarga = milik.keluarga
        .map((k) => ({ k, namaKepala: perId.get(k.kepalaKeluargaId)?.nama ?? '' }))
        .filter(({ k, namaKepala }) => (angka !== null ? k.nomorKk.includes(angka) : cocokNama(namaKepala, kata)))
        .sort((a, b) => a.namaKepala.localeCompare(b.namaKepala, 'id'))
        .slice(0, MAKS_PER_JENIS)
        .map(({ k, namaKepala }) => ({ id: k.id, nomorKk: k.nomorKk, namaKepala, dusunId: k.dusunId, rw: k.rw, rt: k.rt }))
      // Surat (SPEC §5.4): kata bergaris miring dicari di nomor surat; selain itu di nama pemohon. Kadus: dusunnya.
      const jenisPeta = new Map(milik.jenisSurat.map((j) => [j.id, j] as const))
      const surat = (boleh(pengguna.peran, 'surat.lihat') ? milik.permohonan : [])
        .filter((p) =>
          kata.includes('/') ? (p.terbit?.nomor.includes(kata.toUpperCase()) ?? false) : cocokNama(perId.get(p.pemohonId)?.nama ?? '', kata),
        )
        .sort((a, b) => b.masukPada.localeCompare(a.masukPada))
        .slice(0, MAKS_PER_JENIS)
        .map((p) => ({
          id: p.id,
          kode: jenisPeta.get(p.jenisId)?.kode ?? '?',
          jenisNama: jenisPeta.get(p.jenisId)?.nama ?? 'Jenis surat tidak dikenal',
          pemohon: perId.get(p.pemohonId)?.nama ?? '',
          nomor: p.terbit?.nomor ?? null,
          status: p.status,
        }))
      return HttpResponse.json({ penduduk, keluarga, surat })
    }),
  ),
]
