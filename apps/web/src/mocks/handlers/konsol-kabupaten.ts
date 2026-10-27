import { http, HttpResponse } from 'msw'
import { labelKabupaten } from '@/domain/alamat/alamat'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { periksaAturanPenggunaKabupaten, urutAkunKabupaten } from '@/domain/kabupaten/pengguna'
import type { KabupatenMitra, PenggunaKabupaten } from '@/domain/kabupaten/schema'
import {
  kodeKabupatenSah, MAKS_SURAT_PENUNJUKAN_MB, tambahKabupatenSchema, ubahAkunKabupatenKonsolSchema, type BarisKabupatenKonsol,
  type DetailKabupatenKonsol,
} from '@/domain/konsol/kabupaten'
import { KABUPATEN, PROVINSI } from '@/domain/wilayah/kode-wilayah'
import { ambilDb, ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { butuhPenggunaKonsol } from '../sesi-mock'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { bacaJson, balasField, balasIsianTidakValid, dataJson, emailTerpakai, idBaru } from '../tulis'

const desaBergabung = (db: DbDemo, kode: string): number =>
  db.desa.filter((d) => d.kabupaten.kode === kode && (d.status === 'Aktif' || d.status === 'Uji coba')).length

const akunKabupaten = (db: DbDemo, kode: string): PenggunaKabupaten[] =>
  db.penggunaKabupaten.filter((p) => p.kabupatenKode === kode).sort(urutAkunKabupaten)

function barisKabupaten(db: DbDemo, k: KabupatenMitra): BarisKabupatenKonsol {
  const admin = akunKabupaten(db, k.kode).find((p) => p.aktif && p.peran === 'admin')
  return {
    kode: k.kode, nama: k.nama, label: k.label, admin: admin ? { nama: admin.nama, email: admin.email } : null,
    desaBergabung: desaBergabung(db, k.kode), bergabung: k.bergabung,
  }
}

/** Konsol › Kabupaten (SPEC-V0.2 §7): kabupaten mitra, surat penunjukannya, dan akun kabupatennya. */
export const handlerKonsolKabupaten = [
  http.get(
    `${API}/konsol/kabupaten`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      const db = ambilDb()
      const daftar = [...db.kabupatenMitra].sort((a, b) => a.nama.localeCompare(b.nama, 'id')).map((k) => barisKabupaten(db, k))
      return HttpResponse.json(daftar)
    }),
  ),
  http.get(
    `${API}/konsol/kabupaten/:kode`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      const db = ambilDb()
      const k = db.kabupatenMitra.find((x) => x.kode === String(params.kode))
      if (!k) return balasGalat('NOT_FOUND', 'Kabupaten mitra tidak ditemukan.', 404)
      const hasil: DetailKabupatenKonsol = { ...k, desaBergabung: desaBergabung(db, k.kode), pengguna: akunKabupaten(db, k.kode) }
      return HttpResponse.json(hasil)
    }),
  ),
  http.post(
    `${API}/konsol/kabupaten`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      const form = await request.formData().catch(() => null)
      const isian = tambahKabupatenSchema.safeParse(dataJson(form))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const x = isian.data
      if (!kodeKabupatenSah(x.kabupaten)) return balasField('kabupaten', 'Kabupaten tidak dikenal.')
      const db = ambilDb()
      const nama = KABUPATEN[x.kabupaten.replace('.', '')]
      if (db.kabupatenMitra.some((k) => k.kode === x.kabupaten)) return balasField('kabupaten', `Kabupaten ${nama} sudah bermitra.`, 'CONFLICT')
      if (emailTerpakai(db, x.emailAdmin)) return balasField('emailAdmin', 'Email ini sudah dipakai akun lain.', 'CONFLICT')
      const surat = form?.get('suratPenunjukan')
      if (!(surat instanceof File)) return balasField('suratPenunjukan', 'Unggah surat penunjukan (PDF).')
      if (!surat.name.toLowerCase().endsWith('.pdf')) return balasField('suratPenunjukan', 'Surat penunjukan harus berkas PDF.')
      if (surat.size > MAKS_SURAT_PENUNJUKAN_MB * 1024 * 1024) {
        return balasField('suratPenunjukan', `Ukuran surat penunjukan maksimal ${MAKS_SURAT_PENUNJUKAN_MB} MB.`)
      }
      const provinsi = x.kabupaten.slice(0, 2)
      const kabupaten: KabupatenMitra = {
        kode: x.kabupaten, nama, label: labelKabupaten(nama), provinsi: { kode: provinsi, nama: PROVINSI[provinsi] ?? '' },
        bergabung: tanggalIsoWib(new Date()),
        // Demo tidak menyimpan isi PDF-nya, hanya nama berkas dan ukurannya (pola lampiran surat).
        suratPenunjukan: { nomor: x.nomorSurat, tanggal: x.tanggalSurat, berkas: surat.name, ukuranKb: Math.max(1, Math.ceil(surat.size / 1024)) },
      }
      // Admin pertama dari surat penunjukan (SPEC-V0.2 §8.1). Di demo undangannya langsung aktif dengan kata sandi demo.
      const admin: PenggunaKabupaten = {
        id: idBaru(db, 'kab'), kabupatenKode: x.kabupaten, nama: x.namaAdmin, jabatan: 'Admin Kabupaten', peran: 'admin',
        email: x.emailAdmin, aktif: true,
      }
      ubahDb((d) => {
        d.kabupatenMitra.push(kabupaten)
        d.penggunaKabupaten.push(admin)
      })
      return HttpResponse.json({ kode: kabupaten.kode, nama, label: kabupaten.label, emailAdmin: admin.email }, { status: 201 })
    }),
  ),
  http.patch(
    `${API}/konsol/kabupaten/:kode/pengguna/:id`,
    denganJaringan(async ({ request, params }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      const isian = ubahAkunKabupatenKonsolSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const db = ambilDb()
      const sasaran = db.penggunaKabupaten.find((p) => p.id === String(params.id) && p.kabupatenKode === String(params.kode))
      if (!sasaran) return balasGalat('NOT_FOUND', 'Akun kabupaten tidak ditemukan.', 404)
      const sesudah: PenggunaKabupaten = { ...sasaran, aktif: isian.data.aktif }
      const langgar = periksaAturanPenggunaKabupaten(db.penggunaKabupaten, null, sasaran, sesudah)
      if (langgar) return balasGalat(langgar.kode, langgar.pesan, langgar.kode === 'CONFLICT' ? 409 : 422)
      ubahDb(() => {
        Object.assign(sasaran, sesudah)
      })
      return HttpResponse.json(sasaran)
    }),
  ),
]
