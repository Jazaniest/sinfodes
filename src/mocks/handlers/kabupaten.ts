import { http, HttpResponse } from 'msw'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { JUMLAH_DESA_KABUPATEN } from '@/domain/kabupaten/jumlah-desa'
import { ringkasWilayah, type BarisPemantauanDesa, type Pemantauan } from '@/domain/kabupaten/pemantauan'
import type { PenggunaKabupaten, PerhatianKabupaten, RingkasanKabupaten } from '@/domain/kabupaten/schema'
import { hitungPerhatian } from '@/domain/konsol/aturan'
import { langkahBerikut } from '@/domain/wilayah/persiapan'
import type { Desa } from '@/domain/wilayah/schema'
import { ambilDb } from '../db'
import { danaDesaKabupaten } from '../kabupaten-angka'
import { API, balasGalat, denganJaringan } from '../http'
import { angkaKonsolDesa, type AngkaKonsol } from '../konsol-angka'
import { butuhKemampuanKabupaten } from '../sesi-mock'
import { desaBelumMembacaSiaran } from '../siaran'
import type { DbDemo } from '../tipe-db'

const TIDAK_BERHAK = 'Akun ini tidak berhak membuka dasbor kabupaten.'
const butuhPembaca = (request: Request) => butuhKemampuanKabupaten(request, 'kab.lihat', TIDAK_BERHAK)

/** Desa pelanggan di kabupaten akun saja (SPEC-V0.2 §5.1: kabupaten hanya melihat wilayahnya sendiri). */
export const desaKabupaten = (db: DbDemo, akun: PenggunaKabupaten): Desa[] => db.desa.filter((d) => d.kabupaten.kode === akun.kabupatenKode)

const urutNama = (a: { nama: string }, b: { nama: string }) => a.nama.localeCompare(b.nama, 'id')

/** Satu desa di Pemantauan: hanya angka agregat (SPEC §11, SPEC-V0.2 §8.3). */
const barisPemantauan = (desa: Desa, a: AngkaKonsol): BarisPemantauanDesa => ({
  id: desa.id, nama: desa.nama, alamat: desa.slug, status: desa.status, suratBulanIni: a.suratBulanIni, waktuLayananJam: a.waktuLayananJam, jiwa: a.jiwa,
  kelengkapan: a.kelengkapan, waktuTanggapanJam: a.waktuTanggapanJam, apbdes: a.apbdes,
})

/** Dasbor kabupaten (SPEC-V0.2 §8.3): Ringkasan dan Pemantauan. */
export const handlerKabupaten = [
  http.get(
    `${API}/kabupaten/ringkasan`,
    denganJaringan(({ request }) => {
      const akun = butuhPembaca(request)
      if (akun instanceof Response) return akun
      const db = ambilDb()
      const sekarang = new Date()
      const kab = db.kabupatenMitra.find((k) => k.kode === akun.kabupatenKode)
      if (!kab) return balasGalat('SERVER', 'Data kabupaten tidak ditemukan.', 500)
      const desa = desaKabupaten(db, akun).map((d) => ({ d, a: angkaKonsolDesa(db, d, sekarang) }))
      const jumlah = (s: Desa['status']) => desa.filter(({ d }) => d.status === s).length
      const adopsi = { aktif: jumlah('Aktif'), ujiCoba: jumlah('Uji coba'), persiapan: jumlah('Persiapan'), ditangguhkan: jumlah('Ditangguhkan') }
      // Tagihan bukan urusan kabupaten (SPEC-V0.2 §5.1): butir tagihan tidak pernah dihitung.
      const perhatian: PerhatianKabupaten[] = hitungPerhatian(
        desa.map(({ d, a }) => ({ status: d.status, aktivitasTerakhir: a.aktivitasTerakhir, langkahBerikut: langkahBerikut(a.persiapan) })),
        null,
        sekarang,
      ).flatMap((p) => (p.jenis === 'tagihan-lewat' ? [] : [p]))
      const tertinggal = danaDesaKabupaten(db, kab.kode, sekarang).total.tertinggal
      if (tertinggal > 0) perhatian.push({ jenis: 'realisasi-tertinggal', jumlah: tertinggal })
      const belumMembaca = desaBelumMembacaSiaran(db, kab.kode, sekarang)
      if (belumMembaca > 0) perhatian.push({ jenis: 'siaran-belum-dibaca', jumlah: belumMembaca })
      const hasil: RingkasanKabupaten = {
        kabupaten: { kode: kab.kode, nama: kab.nama },
        perhatian,
        adopsi: {
          bergabung: adopsi.aktif + adopsi.ujiCoba,
          // Kabupaten mitra baru di demo memakai jumlah desa pelanggannya sampai angka resminya dicatat.
          jumlahDesa: JUMLAH_DESA_KABUPATEN[kab.kode] ?? desa.length,
          ...adopsi,
        },
      }
      return HttpResponse.json(hasil)
    }),
  ),
  http.get(
    `${API}/kabupaten/pemantauan`,
    denganJaringan(({ request }) => {
      const akun = butuhPembaca(request)
      if (akun instanceof Response) return akun
      const db = ambilDb()
      const kab = db.kabupatenMitra.find((k) => k.kode === akun.kabupatenKode)
      if (!kab) return balasGalat('SERVER', 'Data kabupaten tidak ditemukan.', 500)
      const sekarang = new Date()
      const perKecamatan = new Map<string, { kecamatan: Desa['kecamatan']; desa: BarisPemantauanDesa[] }>()
      for (const d of desaKabupaten(db, akun)) {
        const k = perKecamatan.get(d.kecamatan.kode) ?? { kecamatan: d.kecamatan, desa: [] }
        k.desa.push(barisPemantauan(d, angkaKonsolDesa(db, d, sekarang)))
        perKecamatan.set(d.kecamatan.kode, k)
      }
      const kecamatan = [...perKecamatan.values()].sort((a, b) => urutNama(a.kecamatan, b.kecamatan))
      const hasil: Pemantauan = {
        wilayah: { kode: kab.kode, nama: kab.nama },
        bulan: tanggalIsoWib(sekarang).slice(0, 7),
        total: ringkasWilayah(kecamatan.flatMap((k) => k.desa)),
        kecamatan: kecamatan.map((k) => ({ kecamatan: k.kecamatan, ...ringkasWilayah(k.desa), desa: [...k.desa].sort(urutNama) })),
      }
      return HttpResponse.json(hasil)
    }),
  ),
]
