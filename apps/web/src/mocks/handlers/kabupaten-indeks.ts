import { http, HttpResponse } from 'msw'
import { KATEGORI_DESA, KATEGORI_KABUPATEN, type KategoriDesa } from '@/domain/indeks/kategori'
import { daftarPeriode, labelPeriode, periodeBerjalan } from '@/domain/indeks/periode'
import type { PapanIndeks } from '@/domain/indeks/schema'
import { ambilDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { bekukanBulanTutup, bulanAwalIndeks, kategoriProvinsi, papanKabupaten, peringkatProvinsi } from '../indeks'
import { adalah, PILIHAN_TIDAK_DIKENAL, uraiMusimPeriode } from '../indeks-parameter'
import { desaDiKabupaten } from '@sinfodes/demo/kabupaten-angka'
import { butuhKemampuanKabupaten } from '../sesi-mock'

/** Papan Indeks dan peringkat (SPEC-V0.2 §9.4, §9.5): desa di kabupaten sesi, ditambah podium kabupaten se-provinsi. */
export const handlerKabupatenIndeks = [
  http.get(
    `${API}/kabupaten/indeks`,
    denganJaringan(({ request }) => {
      const akun = butuhKemampuanKabupaten(request, 'kab.lihat', 'Akun ini tidak berhak membuka dasbor kabupaten.')
      if (akun instanceof Response) return akun
      const sekarang = new Date()
      bekukanBulanTutup(sekarang)
      const db = ambilDb()
      const parameter = new URL(request.url).searchParams
      const { musim, periode, galat } = uraiMusimPeriode(parameter, sekarang)

      const mentahKategori = parameter.get('kategori')
      const kategori: KategoriDesa = adalah(KATEGORI_DESA, mentahKategori) ? mentahKategori : 'umum'
      if (mentahKategori !== null && !adalah(KATEGORI_DESA, mentahKategori)) galat.kategori = PILIHAN_TIDAK_DIKENAL

      const desaKab = desaDiKabupaten(db, akun.kabupatenKode)
      const kecamatanKab = [...new Map(desaKab.map((d) => [d.kecamatan.kode, { kode: d.kecamatan.kode, nama: d.kecamatan.nama }])).values()].sort((a, b) =>
        a.nama.localeCompare(b.nama, 'id'),
      )
      const mentahKecamatan = parameter.get('kecamatan')
      if (mentahKecamatan !== null && !kecamatanKab.some((k) => k.kode === mentahKecamatan)) galat.kecamatan = 'Pilih kecamatan di kabupaten ini.'
      if (Object.keys(galat).length > 0) return balasGalat('VALIDATION', 'Pilihan papan tidak sah.', 422, galat)

      const papan = papanKabupaten(db, akun.kabupatenKode, { musim, periode, kategori, kecamatan: mentahKecamatan }, sekarang)
      const kabSesi = db.kabupatenMitra.find((k) => k.kode === akun.kabupatenKode)
      const provinsi = kabSesi?.provinsi ?? desaKab[0]?.provinsi ?? { kode: akun.kabupatenKode.slice(0, 2), nama: '' }
      const hasil: PapanIndeks = {
        kabupaten: { kode: akun.kabupatenKode, nama: kabSesi?.nama ?? akun.kabupatenKode },
        ...papan,
        daftarPeriode: daftarPeriode(musim, bulanAwalIndeks(sekarang), sekarang).map((p) => ({
          kode: p.kode,
          label: labelPeriode(p),
          berjalan: p.kode === periodeBerjalan(musim, sekarang).kode,
        })),
        daftarKecamatan: kecamatanKab,
        provinsi: {
          provinsi: { kode: provinsi.kode, nama: provinsi.nama },
          kategori: KATEGORI_KABUPATEN.map((k) => kategoriProvinsi(k, peringkatProvinsi(db, provinsi.kode, periode, sekarang), akun.kabupatenKode)),
        },
      }
      return HttpResponse.json(hasil)
    }),
  ),
]
