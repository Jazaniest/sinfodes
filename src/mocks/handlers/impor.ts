import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { pad2, tahunDariDuaDigit, tanggalValid } from '@/domain/format/kalender'
import { tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import { cocokkanKolom, periksaPemetaan } from '@/domain/impor/kolom'
import { periksaImpor, type BarisSiap } from '@/domain/impor/periksa'
import { konfirmasiImporSchema, type LaporanImpor } from '@/domain/impor/schema'
import type { Keluarga } from '@/domain/keluarga/schema'
import type { Penduduk } from '@/domain/penduduk/schema'
import { dataMilik } from '../cakupan'
import { berkasContoh, NAMA_BERKAS_CONTOH } from '../data/impor-contoh'
import { ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import type { DbDemo } from '../tipe-db'
import { bacaJson, balasIsianTidakValid, butuhPengubah, catatAktivitas, idBaru, pelakuDari } from '../tulis'

const MAKS_BAIT = 10 * 1024 * 1024

/** Nama berkas dari unggahan multipart, atau berkas contoh untuk `{ contoh: true }`; Response bila tidak sah. */
async function namaBerkasDari(request: Request): Promise<string | Response> {
  if ((request.headers.get('Content-Type') ?? '').includes('application/json')) {
    const isi = z.object({ contoh: z.literal(true) }).safeParse(await bacaJson(request))
    return isi.success ? NAMA_BERKAS_CONTOH : balasGalat('VALIDATION', 'Pilih berkas Excel atau CSV.', 422)
  }
  try {
    const berkas = (await request.formData()).get('berkas')
    if (berkas instanceof File) {
      if (!/\.(xlsx|csv)$/i.test(berkas.name)) {
        return balasGalat('VALIDATION', 'Berkas harus .xlsx atau .csv.', 422, { berkas: 'Berkas harus .xlsx atau .csv' })
      }
      if (berkas.size > MAKS_BAIT) {
        return balasGalat('VALIDATION', 'Ukuran berkas maksimal 10 MB.', 422, { berkas: 'Ukuran berkas maksimal 10 MB' })
      }
      return berkas.name
    }
  } catch {
    // Bukan multipart yang sah: ditangani di bawah.
  }
  return balasGalat('VALIDATION', 'Berkas tidak terbaca. Pilih berkas .xlsx atau .csv.', 422, { berkas: 'Berkas tidak terbaca' })
}

/** NIK dan nomor KK di berkas yang sudah terdaftar di seluruh data (keduanya berlaku nasional). */
function angkaTerdaftar(db: DbDemo, baris: LaporanImpor['baris']): Pick<LaporanImpor, 'nikTerdaftar' | 'nomorKkTerdaftar'> {
  const angka = new Set(baris.flatMap((b) => b.sel.map((s) => s.replace(/[\s.-]/g, ''))).filter((s) => /^\d{16}$/.test(s)))
  const nik = new Set(db.penduduk.flatMap((p) => (p.nik ? [p.nik] : [])))
  const kk = new Set(db.keluarga.map((k) => k.nomorKk))
  return { nikTerdaftar: [...angka].filter((a) => nik.has(a)), nomorKkTerdaftar: [...angka].filter((a) => kk.has(a)) }
}

/** Tanggal terbit dari nomor KK (DDMMYY di digit 7–12); bila tidak masuk akal, hari ini. */
function tanggalTerbitDari(nomorKk: string, sekarang: Date): string {
  const [hari, bulan, yy] = [nomorKk.slice(6, 8), nomorKk.slice(8, 10), nomorKk.slice(10, 12)].map(Number)
  const tahun = tahunDariDuaDigit(yy, bulan, hari, sekarang)
  return tanggalValid(tahun, bulan, hari) ? `${tahun}-${pad2(bulan)}-${pad2(hari)}` : tanggalIsoWib(sekarang)
}

export const handlerImpor = [
  http.post(
    `${API}/impor/penduduk`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPengubah(request)
      if (pengguna instanceof Response) return pengguna
      const namaBerkas = await namaBerkasDari(request)
      if (namaBerkas instanceof Response) return namaBerkas
      const { db } = dataMilik(pengguna)
      const contoh = berkasContoh()
      const laporan: LaporanImpor = {
        id: idBaru(db, 'imp'),
        namaBerkas,
        dibuatPada: waktuIsoWib(new Date()),
        kolom: contoh.kolom.map((judul) => ({ judul, field: cocokkanKolom(judul) })),
        baris: contoh.baris,
        ...angkaTerdaftar(db, contoh.baris),
      }
      ubahDb((d) => {
        d.impor.push({ id: laporan.id, desaId: pengguna.desaId, olehId: pengguna.id, laporan, selesai: false })
      })
      return HttpResponse.json(laporan, { status: 201 })
    }),
  ),
  http.post(
    `${API}/impor/penduduk/:id/konfirmasi`,
    denganJaringan(async ({ request, params }) => {
      const pengguna = butuhPengubah(request)
      if (pengguna instanceof Response) return pengguna
      const milik = dataMilik(pengguna)
      const { db } = milik
      const sesi = db.impor.find((s) => s.id === String(params.id) && s.desaId === pengguna.desaId)
      if (!sesi) return balasGalat('NOT_FOUND', 'Data impor tidak ditemukan. Unggah ulang berkasnya.', 404)
      if (sesi.selesai) return balasGalat('CONFLICT', 'Impor ini sudah dijalankan.', 409)
      const isian = konfirmasiImporSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const { pemetaan, perbaikan, lewati } = isian.data
      const salahPemetaan = periksaPemetaan(pemetaan)
      if (pemetaan.length !== sesi.laporan.kolom.length || salahPemetaan.kurang.length > 0 || salahPemetaan.ganda.length > 0) {
        return balasGalat('VALIDATION', 'Pemetaan kolom belum lengkap.', 422)
      }
      const desa = db.desa.find((d) => d.id === pengguna.desaId)
      if (!desa) return balasGalat('SERVER', 'Data desa tidak ditemukan.', 500)
      const sekarang = new Date()
      const ctx = { hariIni: sekarang, dusun: milik.dusun, istilah: desa.istilahWilayah }
      // Diperiksa ulang dengan data terbaru: NIK atau nomor KK bisa saja terdaftar sejak berkas diunggah.
      const laporan = { ...sesi.laporan, ...angkaTerdaftar(db, sesi.laporan.baris) }
      const hasil = periksaImpor(laporan, { pemetaan, perbaikan, lewati }, ctx)
      const salah = hasil.baris.filter((b) => !b.dilewati && b.masalah.length > 0)
      if (salah.length > 0) {
        return balasGalat(
          'VALIDATION', `${salah.length} baris masih bermasalah.`, 422,
          Object.fromEntries(salah.map((b) => [`baris.${b.nomor}`, b.masalah[0].pesan])),
        )
      }
      const siap = hasil.baris.flatMap((b) => (b.siap ? [b.siap] : []))
      if (siap.length === 0) return balasGalat('VALIDATION', 'Tidak ada baris yang siap diimpor.', 422)

      const perKk = new Map<string, BarisSiap[]>()
      for (const b of siap) perKk.set(b.nomorKk, [...(perKk.get(b.nomorKk) ?? []), b])
      const waktu = waktuIsoWib(sekarang)
      ubahDb((d) => {
        for (const [nomorKk, anggota] of perKk) {
          const urut = [...anggota].sort(
            (a, b) => Number(b.biodata.hubunganKeluarga === 'Kepala Keluarga') - Number(a.biodata.hubunganKeluarga === 'Kepala Keluarga'),
          )
          const { wilayah } = urut[0]
          const kk: Keluarga = {
            id: idBaru(d, 'kk'), desaId: pengguna.desaId, nomorKk, kepalaKeluargaId: '', dusunId: wilayah.dusunId, rw: wilayah.rw,
            rt: wilayah.rt, tanggalTerbit: tanggalTerbitDari(nomorKk, sekarang), anggotaIds: [],
          }
          d.keluarga.push(kk)
          for (const b of urut) {
            const p: Penduduk = {
              ...b.biodata, id: idBaru(d, 'pdk'), desaId: pengguna.desaId, keluargaId: kk.id, dusunId: kk.dusunId, rw: kk.rw, rt: kk.rt,
              statusDasar: 'Hidup', dibuatPada: waktu, diubahPada: waktu,
            }
            d.penduduk.push(p)
            kk.anggotaIds.push(p.id)
          }
          kk.kepalaKeluargaId = kk.anggotaIds[0]
        }
        sesi.selesai = true
        catatAktivitas(d, {
          desaId: pengguna.desaId, dusunId: null, waktu, jenis: 'penduduk-impor',
          ringkasan: `Impor penduduk · ${siap.length} penduduk, ${perKk.size} KK (${sesi.laporan.namaBerkas})`,
          oleh: pelakuDari(pengguna), rujukan: null,
        })
      })
      // Alasan baris yang dilewati diambil dari pemeriksaan tanpa daftar lewati, untuk "Unduh laporan".
      const tanpaLewati = periksaImpor(laporan, { pemetaan, perbaikan, lewati: [] }, ctx)
      const alasan = (nomor: number) => tanpaLewati.baris.find((b) => b.nomor === nomor)?.masalah[0]?.pesan ?? 'Dilewati pengguna'
      return HttpResponse.json(
        {
          penduduk: siap.length,
          keluarga: perKk.size,
          dilewati: hasil.dilewati,
          laporan: hasil.baris.map((b) =>
            b.siap
              ? { nomor: b.nomor, status: 'ditambahkan' as const, keterangan: b.siap.biodata.nama }
              : { nomor: b.nomor, status: 'dilewati' as const, keterangan: alasan(b.nomor) },
          ),
        },
        { status: 201 },
      )
    }),
  ),
]
