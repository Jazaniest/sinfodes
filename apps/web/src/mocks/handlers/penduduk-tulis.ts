import { http, HttpResponse } from 'msw'
import { tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import type { Keluarga } from '@/domain/keluarga/schema'
import { cekNikSchema, masukanPendudukSchema, ubahPendudukSchema } from '@/domain/penduduk/masukan'
import { daftarPerubahan } from '@/domain/penduduk/perubahan'
import { LABEL_FIELD } from '@/domain/penduduk/riwayat'
import type { Penduduk } from '@/domain/penduduk/schema'
import { kodeWilayahNik } from '@/domain/wilayah/alamat'
import { dataMilik } from '../cakupan'
import { ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { nomorKkBaru } from '../operasi-kk'
import {
  bacaJson, balasField, balasIsianTidakValid, butuhPengubah, catatAktivitas, catatRiwayat, idBaru, pelakuDari, pemilikNik,
  pesanNikGanda, wilayahSah,
} from '../tulis'

const LEWAT_HARI_INI = 'Tanggal lahir tidak boleh setelah hari ini'

export const handlerPendudukTulis = [
  http.post(
    `${API}/penduduk/cek-nik`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPengubah(request)
      if (pengguna instanceof Response) return pengguna
      const isian = cekNikSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const pemilik = pemilikNik(dataMilik(pengguna).db, isian.data.nik, isian.data.kecualiId)
      return HttpResponse.json({
        terdaftar: pemilik !== undefined,
        penduduk: pemilik && pemilik.desaId === pengguna.desaId ? { id: pemilik.id, nama: pemilik.nama } : null,
      })
    }),
  ),
  http.post(
    `${API}/penduduk`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPengubah(request)
      if (pengguna instanceof Response) return pengguna
      const isian = masukanPendudukSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const { keluarga: tempat, ...bio } = isian.data
      const milik = dataMilik(pengguna)
      const { db } = milik
      const sekarang = new Date()
      if (bio.tanggalLahir > tanggalIsoWib(sekarang)) return balasField('tanggalLahir', LEWAT_HARI_INI)
      if (bio.nik) {
        const pemilik = pemilikNik(db, bio.nik)
        if (pemilik) return balasField('nik', pesanNikGanda(pemilik, pengguna.desaId), 'CONFLICT')
      }
      const desa = db.desa.find((d) => d.id === pengguna.desaId)
      if (!desa) return balasGalat('SERVER', 'Data desa tidak ditemukan.', 500)

      let kk: Keluarga
      if (tempat.jenis === 'ada') {
        const ada = milik.keluarga.find((k) => k.id === tempat.id)
        if (!ada) return balasField('keluarga', 'KK tidak ditemukan')
        if (bio.hubunganKeluarga === 'Kepala Keluarga') {
          return balasField('hubunganKeluarga', 'KK ini sudah punya kepala keluarga. Gantilah lewat halaman KK.')
        }
        kk = ada
      } else {
        if (bio.hubunganKeluarga !== 'Kepala Keluarga') {
          return balasField('hubunganKeluarga', 'Penduduk pertama di KK baru adalah kepala keluarga')
        }
        if (!wilayahSah(milik.dusun, tempat.dusunId, tempat.rw, tempat.rt)) return balasField('dusunId', 'Wilayah tidak dikenal')
        kk = {
          id: idBaru(db, 'kk'), desaId: pengguna.desaId, nomorKk: nomorKkBaru(db, kodeWilayahNik(desa), sekarang),
          kepalaKeluargaId: '', dusunId: tempat.dusunId, rw: tempat.rw, rt: tempat.rt, tanggalTerbit: tanggalIsoWib(sekarang),
          anggotaIds: [],
        }
      }

      const waktu = waktuIsoWib(sekarang)
      const p: Penduduk = {
        ...bio, id: idBaru(db, 'pdk'), desaId: pengguna.desaId, keluargaId: kk.id, dusunId: kk.dusunId, rw: kk.rw, rt: kk.rt,
        statusDasar: 'Hidup', dibuatPada: waktu, diubahPada: waktu,
      }
      ubahDb((d) => {
        if (tempat.jenis === 'baru') {
          kk.kepalaKeluargaId = p.id
          d.keluarga.push(kk)
        }
        kk.anggotaIds.push(p.id)
        d.penduduk.push(p)
        catatAktivitas(d, {
          desaId: p.desaId, dusunId: p.dusunId, waktu, jenis: 'penduduk-tambah', ringkasan: `Penduduk ditambahkan · ${p.nama}`,
          oleh: pelakuDari(pengguna), rujukan: { jenis: 'penduduk', id: p.id },
        })
      })
      return HttpResponse.json(p, { status: 201 })
    }),
  ),
  http.patch(
    `${API}/penduduk/:id`,
    denganJaringan(async ({ request, params }) => {
      const pengguna = butuhPengubah(request)
      if (pengguna instanceof Response) return pengguna
      const milik = dataMilik(pengguna)
      const p = milik.penduduk.find((x) => x.id === String(params.id))
      if (!p) return balasGalat('NOT_FOUND', 'Data penduduk tidak ditemukan.', 404)
      const isian = ubahPendudukSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const ubah = isian.data
      const sekarang = new Date()
      if (ubah.tanggalLahir !== undefined && ubah.tanggalLahir > tanggalIsoWib(sekarang)) {
        return balasField('tanggalLahir', LEWAT_HARI_INI)
      }
      if (ubah.nik) {
        const pemilik = pemilikNik(milik.db, ubah.nik, p.id)
        if (pemilik) return balasField('nik', pesanNikGanda(pemilik, pengguna.desaId), 'CONFLICT')
      }
      const gantiKepala =
        ubah.hubunganKeluarga !== undefined &&
        ubah.hubunganKeluarga !== p.hubunganKeluarga &&
        (ubah.hubunganKeluarga === 'Kepala Keluarga' || p.hubunganKeluarga === 'Kepala Keluarga')
      if (gantiKepala) {
        return balasField('hubunganKeluarga', 'Kepala keluarga diubah lewat halaman KK (Ganti kepala keluarga)')
      }
      const perubahan = daftarPerubahan(p, ubah)
      if (perubahan.length === 0) return HttpResponse.json(p)
      const waktu = waktuIsoWib(sekarang)
      const oleh = pelakuDari(pengguna)
      ubahDb((d) => {
        Object.assign(p, ubah, { diubahPada: waktu })
        catatRiwayat(d, p, perubahan, oleh, waktu)
        catatAktivitas(d, {
          desaId: p.desaId, dusunId: p.dusunId, waktu, jenis: 'penduduk-ubah',
          ringkasan: `Data penduduk diubah · ${p.nama} (${perubahan.map((u) => LABEL_FIELD[u.field]).join(', ')})`,
          oleh, rujukan: { jenis: 'penduduk', id: p.id },
        })
      })
      return HttpResponse.json(p)
    }),
  ),
]
