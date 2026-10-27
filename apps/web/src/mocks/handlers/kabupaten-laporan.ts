import { http, HttpResponse } from 'msw'
import { waktuIsoWib } from '@/domain/format/tanggal'
import { tertinggal } from '@/domain/kabupaten/dana-desa'
import { JUMLAH_DESA_KABUPATEN } from '@/domain/kabupaten/jumlah-desa'
import { akhirBulan, bulanLaporanSchema, bulanLaporanTersedia, type DesaRingkas, type LaporanBulanan } from '@/domain/kabupaten/laporan'
import { median } from '@/domain/kabupaten/pemantauan'
import type { KabupatenMitra } from '@/domain/kabupaten/schema'
import { statusKirim } from '@/domain/kabupaten/tenggat'
import { ambilDb } from '../db'
import { bekukanBulanTutup, podiumKabupaten } from '../indeks'
import { API, balasGalat, denganJaringan } from '../http'
import { apbdesDesa, bergabungPada, desaDiKabupaten, desaSasaranKabupaten, realisasiSampai, suratTerbitBulan } from '@sinfodes/demo/kabupaten-angka'
import { butuhKemampuanKabupaten } from '../sesi-mock'
import type { DbDemo } from '@sinfodes/demo/tipe-db'

const butuhPembaca = (request: Request) => butuhKemampuanKabupaten(request, 'kab.lihat', 'Akun ini tidak berhak membuka dasbor kabupaten.')
const urut = (a: DesaRingkas, b: DesaRingkas) => a.kecamatan.localeCompare(b.kecamatan, 'id') || a.nama.localeCompare(b.nama, 'id')

/** Laporan satu bulan yang sudah tutup, dihitung saat diminta dari data demo (SPEC-V0.2 §8.3 butir 7). */
function susunLaporan(db: DbDemo, kab: KabupatenMitra, bulan: string, sekarang: Date): LaporanBulanan {
  bekukanBulanTutup(sekarang)
  const akhir = akhirBulan(bulan)
  const tahun = Number(bulan.slice(0, 4))
  const semua = desaDiKabupaten(db, kab.kode).map((d) => {
    const bergabung = bergabungPada(db, d, akhir)
    // Dana Desa hanya untuk desa yang memakai Sinfodes pada akhir bulan itu.
    const a = bergabung ? apbdesDesa(db, d, tahun) : null
    return {
      d, bergabung, suratTerbit: suratTerbitBulan(db, d, bulan),
      anggaran: a ? a.anggaran : null, realisasi: a ? realisasiSampai(a.bulanan, bulan) : null,
    }
  })
  const rasio = (x: { anggaran: number | null; realisasi: number | null }) =>
    x.anggaran !== null && x.realisasi !== null && x.anggaran > 0 ? x.realisasi / x.anggaran : null
  const medianRealisasi = median(semua.flatMap((x) => (rasio(x) === null ? [] : [rasio(x) as number])))
  const desa = semua
    .map((x) => ({
      nama: x.d.nama, kecamatan: x.d.kecamatan.nama, bergabung: x.bergabung, suratTerbit: x.suratTerbit,
      anggaran: x.anggaran, realisasi: x.realisasi, tertinggal: tertinggal(rasio(x), medianRealisasi),
    }))
    .sort(urut)
  const ringkas = (x: { nama: string; kecamatan: string }): DesaRingkas => ({ nama: x.nama, kecamatan: x.kecamatan })
  const perKecamatan = new Map<string, LaporanBulanan['kecamatan'][number]>()
  for (const x of semua) {
    const k = perKecamatan.get(x.d.kecamatan.kode) ?? {
      kecamatan: { kode: x.d.kecamatan.kode, nama: x.d.kecamatan.nama }, bergabung: 0, suratTerbit: 0, anggaran: 0, realisasi: 0,
    }
    k.bergabung += x.bergabung ? 1 : 0
    k.suratTerbit += x.suratTerbit
    k.anggaran += x.anggaran ?? 0
    k.realisasi += x.realisasi ?? 0
    perKecamatan.set(x.d.kecamatan.kode, k)
  }
  const sasaran = desaSasaranKabupaten(db, kab.kode)
  const tenggat = db.tenggatLaporan
    .filter((t) => t.kabupatenKode === kab.kode && t.tanggal.startsWith(bulan))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
    .map((t) => ({
      nama: t.nama,
      tanggal: t.tanggal,
      desa: sasaran
        .filter((d) => {
          // Kiriman sesudah akhir bulan belum terlihat di laporan bulan itu.
          const kirim = db.kirimLaporan.find((k) => k.tenggatId === t.id && k.desaId === d.id && k.tanggal <= akhir)?.tanggal ?? null
          return statusKirim(t.tanggal, kirim, akhir) !== 'dikirim'
        })
        .map((d) => ({ nama: d.nama, kecamatan: d.kecamatan.nama }))
        .sort(urut),
    }))
    .filter((t) => t.desa.length > 0)
  return {
    kabupaten: { kode: kab.kode, nama: kab.nama, label: kab.label },
    bulan,
    dibuatPada: waktuIsoWib(sekarang),
    ringkasan: {
      jumlahDesa: JUMLAH_DESA_KABUPATEN[kab.kode] ?? semua.length,
      bergabung: desa.filter((x) => x.bergabung).length,
      suratTerbit: desa.reduce((n, x) => n + x.suratTerbit, 0),
      danaDesa: {
        tahun,
        anggaran: desa.reduce((n, x) => n + (x.anggaran ?? 0), 0),
        realisasi: desa.reduce((n, x) => n + (x.realisasi ?? 0), 0),
        medianRealisasi,
        tertinggal: desa.filter((x) => x.tertinggal).length,
      },
    },
    podium: podiumKabupaten(db, kab.kode, { musim: 'bulanan', kode: bulan }, sekarang),
    kecamatan: [...perKecamatan.values()].sort((a, b) => a.kecamatan.nama.localeCompare(b.kecamatan.nama, 'id')),
    perhatian: {
      tanpaSurat: desa.filter((x) => x.bergabung && x.suratTerbit === 0).map(ringkas),
      tertinggal: desa.filter((x) => x.tertinggal).map(ringkas),
      tenggat,
    },
    desa,
  }
}

/** Laporan bulanan kabupaten (SPEC-V0.2 §8.3 butir 7): hanya bulan yang sudah tutup sejak kabupaten bergabung. */
export const handlerKabupatenLaporan = [
  http.get(
    `${API}/kabupaten/laporan`,
    denganJaringan(({ request }) => {
      const akun = butuhPembaca(request)
      if (akun instanceof Response) return akun
      const kab = ambilDb().kabupatenMitra.find((k) => k.kode === akun.kabupatenKode)
      if (!kab) return balasGalat('SERVER', 'Data kabupaten tidak ditemukan.', 500)
      return HttpResponse.json({ bulan: bulanLaporanTersedia(kab.bergabung, new Date()) })
    }),
  ),
  http.get(
    `${API}/kabupaten/laporan/:bulan`,
    denganJaringan(({ request, params }) => {
      const akun = butuhPembaca(request)
      if (akun instanceof Response) return akun
      const bulan = bulanLaporanSchema.safeParse(String(params.bulan))
      if (!bulan.success) return balasGalat('VALIDATION', 'Bulan laporan tidak sah.', 400)
      const db = ambilDb()
      const kab = db.kabupatenMitra.find((k) => k.kode === akun.kabupatenKode)
      if (!kab) return balasGalat('SERVER', 'Data kabupaten tidak ditemukan.', 500)
      const sekarang = new Date()
      if (!bulanLaporanTersedia(kab.bergabung, sekarang).includes(bulan.data)) {
        return balasGalat('NOT_FOUND', 'Laporan bulan ini belum tersedia.', 404)
      }
      return HttpResponse.json(susunLaporan(db, kab, bulan.data, sekarang))
    }),
  ),
]
