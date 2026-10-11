import { http, HttpResponse } from 'msw'
import { formatTanggal, tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import type { Keluarga } from '@/domain/keluarga/schema'
import { filterMutasiSchema, hitungMutasiBulan } from '@/domain/mutasi/buku'
import {
  hubunganBayi, masukanDatangSchema, masukanLahirSchema, masukanMeninggalSchema, masukanPindahSchema,
} from '@/domain/mutasi/masukan'
import type { Mutasi } from '@/domain/mutasi/schema'
import { periksaNik } from '@/domain/penduduk/nik'
import type { Penduduk } from '@/domain/penduduk/schema'
import { kodeWilayahNik } from '@/domain/wilayah/alamat'
import { tandaiPenerimaDitinjau } from '../bansos'
import { dataMilik } from '../cakupan'
import { ubahDb } from '../db'
import { API, balasDaftar, balasGalat, denganJaringan } from '../http'
import { keluarkanDariKk, nomorKkBaru, periksaPengganti } from '../operasi-kk'
import {
  bacaJson, balasField, balasIsianTidakValid, butuhKemampuan, butuhPengubah, catatAktivitas, idBaru, pelakuDari, pemilikNik,
  pesanNikGanda, wilayahSah,
} from '../tulis'

const butuhPembaca = (request: Request) => butuhKemampuan(request, 'penduduk.lihat', 'Peran Anda tidak berhak melihat data mutasi.')
const BULAN = /^\d{4}-(0[1-9]|1[0-2])$/

export const handlerMutasi = [
  http.get(
    `${API}/mutasi/ringkasan`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const bulan = new URL(request.url).searchParams.get('bulan') ?? tanggalIsoWib(new Date()).slice(0, 7)
      if (!BULAN.test(bulan)) return balasGalat('VALIDATION', 'Bulan tidak valid.', 422)
      return HttpResponse.json({ bulan, ...hitungMutasiBulan(dataMilik(pengguna).mutasi, bulan) })
    }),
  ),
  http.get(
    `${API}/mutasi`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const filter = filterMutasiSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
      if (!filter.success) return balasGalat('VALIDATION', 'Filter tidak valid.', 422)
      const { jenis, bulan, page, pageSize } = filter.data
      const milik = dataMilik(pengguna)
      const perId = new Map(milik.penduduk.map((p) => [p.id, p] as const))
      const daftar = milik.mutasi
        .filter((m) => (jenis === undefined || m.jenis === jenis) && (bulan === undefined || m.tanggal.startsWith(bulan)))
        .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.dicatatPada.localeCompare(a.dicatatPada))
      return balasDaftar(daftar, page, pageSize, (m) => ({
        mutasi: m,
        penduduk: m.pendudukIds.flatMap((id) => {
          const p = perId.get(id)
          return p ? [{ id: p.id, nama: p.nama }] : []
        }),
      }))
    }),
  ),
  http.post(
    `${API}/mutasi/lahir`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPengubah(request)
      if (pengguna instanceof Response) return pengguna
      const isian = masukanLahirSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const m = isian.data
      const milik = dataMilik(pengguna)
      const { db } = milik
      const sekarang = new Date()
      const laporan = m.laporanId ? milik.laporanData.find((l) => l.id === m.laporanId) : undefined
      if (m.laporanId && (!laporan || laporan.isi.jenis !== 'kelahiran')) return balasField('laporanId', 'Laporan kelahiran tidak ditemukan')
      if (laporan && laporan.status !== 'baru') return balasGalat('CONFLICT', 'Laporan kelahiran ini sudah ditangani.', 409)
      const ibu = milik.penduduk.find((p) => p.id === m.ibuId)
      if (!ibu || ibu.jenisKelamin !== 'P' || ibu.statusDasar !== 'Hidup') {
        return balasField('ibuId', 'Pilih ibu: penduduk perempuan yang masih hidup')
      }
      const ayah = m.ayahId === null ? null : milik.penduduk.find((p) => p.id === m.ayahId)
      if (ayah === undefined || (ayah !== null && (ayah.jenisKelamin !== 'L' || ayah.statusDasar !== 'Hidup'))) {
        return balasField('ayahId', 'Pilih ayah: penduduk laki-laki yang masih hidup')
      }
      if (m.bayi.tanggalLahir > tanggalIsoWib(sekarang)) {
        return balasField('bayi.tanggalLahir', 'Tanggal lahir tidak boleh setelah hari ini')
      }
      const kk = milik.keluarga.find((k) => k.id === ibu.keluargaId)
      if (!kk) return balasField('ibuId', 'KK ibu tidak ditemukan')

      const waktu = waktuIsoWib(sekarang)
      const oleh = pelakuDari(pengguna)
      const b = m.bayi
      const bayi: Penduduk = {
        id: idBaru(db, 'pdk'), desaId: pengguna.desaId, nik: null, nama: b.nama, jenisKelamin: b.jenisKelamin,
        golonganDarah: 'Tidak Tahu', agama: ibu.agama, kewarganegaraan: 'WNI', tempatLahir: b.tempatLahir,
        tanggalLahir: b.tanggalLahir, nomorAktaLahir: null, keluargaId: kk.id, hubunganKeluarga: hubunganBayi(ibu.hubunganKeluarga),
        namaAyah: ayah?.nama ?? '', namaIbu: ibu.nama, dusunId: kk.dusunId, rw: kk.rw, rt: kk.rt,
        pendidikan: 'Tidak/Belum Sekolah', pekerjaan: 'Belum/Tidak Bekerja', statusPerkawinan: 'Belum Kawin',
        statusDasar: 'Hidup', statusPenduduk: 'Tetap', ktpEl: 'Belum wajib', telepon: null, catatan: null,
        dibuatPada: waktu, diubahPada: waktu,
      }
      const mutasi: Mutasi = {
        id: idBaru(db, 'mts'), desaId: pengguna.desaId, jenis: 'lahir', tanggal: b.tanggalLahir, pendudukIds: [bayi.id],
        dicatatOleh: oleh, dicatatPada: waktu,
        rincian: {
          jam: b.jam, tempatDilahirkan: b.tempatDilahirkan, tempatLahir: b.tempatLahir, jenisKelahiran: b.jenisKelahiran,
          anakKe: b.anakKe, penolong: b.penolong, beratGram: b.beratGram, panjangCm: b.panjangCm, ibuId: ibu.id,
          ayahId: ayah?.id ?? null, pelapor: m.pelapor,
        },
      }
      ubahDb((d) => {
        if (laporan) {
          laporan.status = 'diterapkan'
          laporan.ditangani = { oleh, pada: waktu, alasan: null }
        }
        d.penduduk.push(bayi)
        kk.anggotaIds.push(bayi.id)
        d.mutasi.push(mutasi)
        catatAktivitas(d, {
          desaId: bayi.desaId, dusunId: bayi.dusunId, waktu, jenis: 'mutasi-lahir', ringkasan: `Kelahiran dicatat · ${bayi.nama}`,
          oleh, rujukan: { jenis: 'penduduk', id: bayi.id },
        })
      })
      return HttpResponse.json({ mutasi, penduduk: [bayi] }, { status: 201 })
    }),
  ),
  http.post(
    `${API}/mutasi/meninggal`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPengubah(request)
      if (pengguna instanceof Response) return pengguna
      const isian = masukanMeninggalSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const m = isian.data
      const milik = dataMilik(pengguna)
      const p = milik.penduduk.find((x) => x.id === m.pendudukId)
      if (!p) return balasField('pendudukId', 'Penduduk tidak ditemukan')
      if (p.statusDasar !== 'Hidup') return balasField('pendudukId', `${p.nama} sudah berstatus ${p.statusDasar}`)
      const sekarang = new Date()
      if (m.tanggal > tanggalIsoWib(sekarang) || m.tanggal < p.tanggalLahir) {
        return balasField('tanggal', 'Tanggal meninggal harus antara tanggal lahir dan hari ini')
      }
      const kk = milik.semuaKeluarga.find((k) => k.id === p.keluargaId)
      const salah = kk ? periksaPengganti(kk, [p.id], m.penggantiKepalaId) : null
      if (salah) return balasField('penggantiKepalaId', salah)

      const waktu = waktuIsoWib(sekarang)
      const oleh = pelakuDari(pengguna)
      const mutasi: Mutasi = {
        id: idBaru(milik.db, 'mts'), desaId: pengguna.desaId, jenis: 'meninggal', tanggal: m.tanggal, pendudukIds: [p.id],
        dicatatOleh: oleh, dicatatPada: waktu,
        rincian: { jam: m.jam, tempat: m.tempat, sebab: m.sebab, yangMenerangkan: m.yangMenerangkan, pelapor: m.pelapor },
      }
      ubahDb((d) => {
        p.statusDasar = 'Meninggal'
        p.diubahPada = waktu
        if (kk) keluarkanDariKk(d, kk, [p.id], m.penggantiKepalaId, oleh, waktu)
        d.mutasi.push(mutasi)
        tandaiPenerimaDitinjau(d, [p.id], `Penerima meninggal dunia pada ${formatTanggal(m.tanggal)}`, waktu)
        catatAktivitas(d, {
          desaId: p.desaId, dusunId: p.dusunId, waktu, jenis: 'mutasi-meninggal', ringkasan: `Kematian dicatat · ${p.nama}`,
          oleh, rujukan: { jenis: 'penduduk', id: p.id },
        })
      })
      return HttpResponse.json({ mutasi, penduduk: [p] }, { status: 201 })
    }),
  ),
  http.post(
    `${API}/mutasi/pindah`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPengubah(request)
      if (pengguna instanceof Response) return pengguna
      const isian = masukanPindahSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const m = isian.data
      const milik = dataMilik(pengguna)
      const ids = [...new Set(m.pendudukIds)]
      const orang = ids.flatMap((id): Penduduk[] => {
        const p = milik.penduduk.find((x) => x.id === id)
        return p ? [p] : []
      })
      if (orang.length !== ids.length) return balasField('pendudukIds', 'Penduduk tidak ditemukan')
      const bukanHidup = orang.find((p) => p.statusDasar !== 'Hidup')
      if (bukanHidup) return balasField('pendudukIds', `${bukanHidup.nama} sudah berstatus ${bukanHidup.statusDasar}`)
      if (new Set(orang.map((p) => p.keluargaId)).size > 1) {
        return balasField('pendudukIds', 'Penduduk yang pindah bersama harus dari KK yang sama')
      }
      const sekarang = new Date()
      if (m.tanggal > tanggalIsoWib(sekarang)) return balasField('tanggal', 'Tanggal pindah tidak boleh setelah hari ini')
      const kk = milik.semuaKeluarga.find((k) => k.id === orang[0].keluargaId)
      const salah = kk ? periksaPengganti(kk, ids, m.penggantiKepalaId) : null
      if (salah) return balasField('penggantiKepalaId', salah)

      const waktu = waktuIsoWib(sekarang)
      const oleh = pelakuDari(pengguna)
      const mutasi: Mutasi = {
        id: idBaru(milik.db, 'mts'), desaId: pengguna.desaId, jenis: 'pindah', tanggal: m.tanggal, pendudukIds: ids,
        dicatatOleh: oleh, dicatatPada: waktu, rincian: { tujuan: m.tujuan, alasan: m.alasan },
      }
      const [pertama] = orang
      ubahDb((d) => {
        for (const p of orang) {
          p.statusDasar = 'Pindah'
          p.diubahPada = waktu
        }
        if (kk) keluarkanDariKk(d, kk, ids, m.penggantiKepalaId, oleh, waktu)
        d.mutasi.push(mutasi)
        tandaiPenerimaDitinjau(d, ids, `Penerima pindah keluar desa pada ${formatTanggal(m.tanggal)}`, waktu)
        catatAktivitas(d, {
          desaId: pertama.desaId, dusunId: pertama.dusunId, waktu, jenis: 'mutasi-pindah',
          ringkasan: `Pindah keluar dicatat · ${pertama.nama}${orang.length > 1 ? ` (${orang.length} orang)` : ''} ke ${m.tujuan.kabupaten}`,
          oleh, rujukan: { jenis: 'penduduk', id: pertama.id },
        })
      })
      return HttpResponse.json({ mutasi, penduduk: orang }, { status: 201 })
    }),
  ),
  http.post(
    `${API}/mutasi/datang`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPengubah(request)
      if (pengguna instanceof Response) return pengguna
      const isian = masukanDatangSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const m = isian.data
      const milik = dataMilik(pengguna)
      const { db } = milik
      const sekarang = new Date()
      const hariIni = tanggalIsoWib(sekarang)
      if (m.tanggal > hariIni) return balasField('tanggal', 'Tanggal datang tidak boleh setelah hari ini')
      for (const [i, a] of m.anggota.entries()) {
        const hasil = periksaNik(a.nik, sekarang)
        if (hasil.status !== 'valid') return balasField(`anggota.${i}.nik`, hasil.status === 'kosong' ? 'NIK wajib diisi' : hasil.pesan)
        const pemilik = pemilikNik(db, a.nik)
        if (pemilik) return balasField(`anggota.${i}.nik`, pesanNikGanda(pemilik, pengguna.desaId), 'CONFLICT')
        if (m.anggota.findIndex((x) => x.nik === a.nik) !== i) {
          return balasField(`anggota.${i}.nik`, 'NIK ini sudah dipakai anggota lain di isian ini', 'CONFLICT')
        }
        if (a.tanggalLahir > hariIni) return balasField(`anggota.${i}.tanggalLahir`, 'Tanggal lahir tidak boleh setelah hari ini')
      }
      const jumlahKepala = m.anggota.filter((a) => a.hubunganKeluarga === 'Kepala Keluarga').length
      let kk: Keluarga
      if (m.keluarga.jenis === 'ada') {
        const idKk = m.keluarga.id
        const ada = milik.keluarga.find((k) => k.id === idKk)
        if (!ada) return balasField('keluarga', 'KK tidak ditemukan')
        if (jumlahKepala > 0) return balasField('anggota', 'KK tujuan sudah punya kepala keluarga')
        kk = ada
      } else {
        if (jumlahKepala !== 1) return balasField('anggota', 'KK baru harus punya tepat satu kepala keluarga')
        if (!wilayahSah(milik.dusun, m.keluarga.dusunId, m.keluarga.rw, m.keluarga.rt)) {
          return balasField('dusunId', 'Wilayah tidak dikenal')
        }
        const desa = db.desa.find((d) => d.id === pengguna.desaId)
        if (!desa) return balasGalat('SERVER', 'Data desa tidak ditemukan.', 500)
        kk = {
          id: idBaru(db, 'kk'), desaId: pengguna.desaId, nomorKk: nomorKkBaru(db, kodeWilayahNik(desa), sekarang),
          kepalaKeluargaId: '', dusunId: m.keluarga.dusunId, rw: m.keluarga.rw, rt: m.keluarga.rt, tanggalTerbit: hariIni,
          anggotaIds: [],
        }
      }

      const waktu = waktuIsoWib(sekarang)
      const oleh = pelakuDari(pengguna)
      const baru: Penduduk[] = m.anggota.map((a) => ({
        ...a, id: idBaru(db, 'pdk'), desaId: pengguna.desaId, keluargaId: kk.id, dusunId: kk.dusunId, rw: kk.rw, rt: kk.rt,
        statusDasar: 'Hidup', statusPenduduk: m.statusPenduduk, dibuatPada: waktu, diubahPada: waktu,
      }))
      const kepala = baru.find((p) => p.hubunganKeluarga === 'Kepala Keluarga') ?? baru[0]
      const urut = [kepala, ...baru.filter((p) => p !== kepala)]
      const mutasi: Mutasi = {
        id: idBaru(db, 'mts'), desaId: pengguna.desaId, jenis: 'datang', tanggal: m.tanggal, pendudukIds: urut.map((p) => p.id),
        dicatatOleh: oleh, dicatatPada: waktu, rincian: { nomorSkpwni: m.nomorSkpwni, asal: m.asal, keluargaId: kk.id },
      }
      ubahDb((d) => {
        if (m.keluarga.jenis === 'baru') {
          kk.kepalaKeluargaId = kepala.id
          d.keluarga.push(kk)
        }
        kk.anggotaIds.push(...urut.map((p) => p.id))
        d.penduduk.push(...urut)
        d.mutasi.push(mutasi)
        catatAktivitas(d, {
          desaId: kepala.desaId, dusunId: kepala.dusunId, waktu, jenis: 'mutasi-datang',
          ringkasan: `Kedatangan dicatat · ${kepala.nama} (${urut.length} orang)`, oleh, rujukan: { jenis: 'penduduk', id: kepala.id },
        })
      })
      return HttpResponse.json({ mutasi, penduduk: urut }, { status: 201 })
    }),
  ),
]
