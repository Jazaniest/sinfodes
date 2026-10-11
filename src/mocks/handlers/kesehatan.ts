import { http } from 'msw'
import { hitungUmur, tanggalIsoWib } from '@/domain/format/tanggal'
import { filterBalitaSchema, jadwalBerikut, jadwalPosyandu, type BarisBalita, type RingkasPosyandu } from '@/domain/kesehatan/schema'
import type { Penduduk } from '@/domain/penduduk/schema'
import type { Pengguna } from '@/domain/pengguna/schema'
import { dataMilik } from '../cakupan'
import { API, balasDaftar, denganJaringan } from '../http'
import { balasIsianTidakValid, butuhKemampuan } from '../tulis'

const butuhPembaca = (request: Request) => butuhKemampuan(request, 'kesehatan.lihat', 'Peran Anda tidak berhak membuka data Kesehatan.')

/**
 * Balita dihitung saat diminta: penduduk hidup berumur 0–4 tahun dalam cakupan pengguna, digabung dengan pengukurannya.
 * Bayi yang baru dicatat langsung muncul (belum diukur); balita yang meninggal atau pindah langsung hilang.
 */
function kesehatanMilik(pengguna: Pengguna, sekarang: Date) {
  const { db, dusun, penduduk, dusunSaja } = dataMilik(pengguna)
  const posyandu = db.posyandu
    .filter((p) => p.desaId === pengguna.desaId && (dusunSaja === null || p.dusunId === dusunSaja))
    .sort((a, b) => (dusun.find((d) => d.id === a.dusunId)?.nomor ?? 0) - (dusun.find((d) => d.id === b.dusunId)?.nomor ?? 0))
  const ukur = new Map(db.pengukuranBalita.map((u) => [u.pendudukId, u]))
  const perKeluarga = new Map<string, Penduduk[]>()
  for (const p of penduduk) {
    const anggota = perKeluarga.get(p.keluargaId)
    if (anggota) anggota.push(p)
    else perKeluarga.set(p.keluargaId, [p])
  }
  const balita = penduduk
    .filter((p) => p.statusDasar === 'Hidup' && hitungUmur(p.tanggalLahir, sekarang).tahun <= 4)
    .map((p): BarisBalita => {
      const u = ukur.get(p.id)
      const pengukuran = u?.pengukuran ?? []
      const ibu = perKeluarga.get(p.keluargaId)?.find((x) => x.jenisKelamin === 'P' && x.nama === p.namaIbu)
      return {
        id: p.id, nama: p.nama, jenisKelamin: p.jenisKelamin, tanggalLahir: p.tanggalLahir,
        umurBulan: hitungUmur(p.tanggalLahir, sekarang).bulan,
        ibu: { id: ibu?.id ?? null, nama: ibu?.nama ?? (p.namaIbu || 'Tidak tercatat') },
        dusunId: p.dusunId, posyanduId: posyandu.find((x) => x.dusunId === p.dusunId)?.id ?? '',
        pengukuran, status: pengukuran.length > 0 ? (u?.status ?? null) : null,
      }
    })
  return { posyandu, balita }
}

/** Kesehatan (SPEC §8): posyandu dan pemantauan balita, hanya lihat. */
export const handlerKesehatan = [
  http.get(
    `${API}/kesehatan/posyandu`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const sekarang = new Date()
      const hariIni = tanggalIsoWib(sekarang)
      const { posyandu, balita } = kesehatanMilik(pengguna, sekarang)
      const daftar = posyandu.map((p): RingkasPosyandu => {
        const milik = balita.filter((b) => b.posyanduId === p.id)
        return {
          ...p,
          jadwalBulanIni: jadwalPosyandu(p.jadwal, hariIni.slice(0, 7)),
          jadwalBerikut: jadwalBerikut(p.jadwal, hariIni),
          jumlahBalita: milik.length,
          perluPemantauan: milik.filter((b) => b.status === 'perlu-pemantauan').length,
          pendek: milik.filter((b) => b.status === 'pendek').length,
        }
      })
      return balasDaftar(daftar, 1, Math.max(daftar.length, 1))
    }),
  ),
  http.get(
    `${API}/kesehatan/balita`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const filter = filterBalitaSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
      if (!filter.success) return balasIsianTidakValid(filter.error)
      const f = filter.data
      const { posyandu, balita } = kesehatanMilik(pengguna, new Date())
      const urutan = new Map(posyandu.map((p, i) => [p.id, i]))
      const daftar = balita
        .filter((b) => (f.posyandu === undefined || b.posyanduId === f.posyandu) && (f.status === undefined || b.status === f.status))
        .sort((a, b) => (urutan.get(a.posyanduId) ?? 0) - (urutan.get(b.posyanduId) ?? 0) || a.nama.localeCompare(b.nama, 'id'))
      return balasDaftar(daftar, f.page, f.pageSize)
    }),
  ),
]
