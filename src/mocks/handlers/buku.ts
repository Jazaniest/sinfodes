import { http, HttpResponse } from 'msw'
import { bukuBoleh, cariBuku, DAFTAR_BUKU, filterIsiBukuSchema, type IsiBuku, type RingkasBuku } from '@/domain/buku/schema'
import { boleh } from '@/domain/pengguna/hak-akses'
import { penyusunUntuk } from '../buku'
import type { IsiPenyusun } from '../buku/tipe'
import { ambilDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { butuhPengguna } from '../sesi-mock'
import { balasIsianTidakValid } from '../tulis'

type DefinisiBuku = Pick<RingkasBuku, 'kode' | 'nama' | 'kelompok' | 'sumber'>

const ringkas = (b: DefinisiBuku, isi: IsiPenyusun | null): RingkasBuku => ({
  kode: b.kode,
  nama: b.nama,
  kelompok: b.kelompok,
  sumber: b.sumber,
  jumlah: isi?.baris.length ?? null,
  diperbarui: isi?.diperbarui ?? null,
})

/** Buku Administrasi (SPEC §8): disusun dari data modul sumbernya setiap kali diminta. */
export const handlerBuku = [
  http.get(
    `${API}/buku-administrasi`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengguna(request)
      if (pengguna instanceof Response) return pengguna
      if (!boleh(pengguna.peran, 'buku.lihat')) return balasGalat('FORBIDDEN', 'Peran Anda tidak berhak membuka Buku Administrasi.', 403)
      const db = ambilDb()
      const daftar = DAFTAR_BUKU.filter((b) => bukuBoleh(pengguna.peran, b.kelompok)).map((b) => {
        const penyusun = penyusunUntuk(b.kode)
        return ringkas(b, penyusun ? penyusun(db, pengguna.desaId) : null)
      })
      return HttpResponse.json(daftar)
    }),
  ),
  http.get(
    `${API}/buku-administrasi/:kode`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhPengguna(request)
      if (pengguna instanceof Response) return pengguna
      const buku = cariBuku(String(params.kode))
      if (!buku) return balasGalat('NOT_FOUND', 'Buku tidak ditemukan.', 404)
      if (!bukuBoleh(pengguna.peran, buku.kelompok)) return balasGalat('FORBIDDEN', 'Peran Anda tidak berhak membuka buku ini.', 403)
      const penyusun = penyusunUntuk(buku.kode)
      if (!penyusun) return balasGalat('NOT_FOUND', 'Buku ini diisi manual dan belum tersedia di Sinfodes.', 404)
      const filter = filterIsiBukuSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
      if (!filter.success) return balasIsianTidakValid(filter.error)
      const { page, pageSize } = filter.data
      const isi = penyusun(ambilDb(), pengguna.desaId)
      const hasil: IsiBuku = {
        buku: ringkas(buku, isi),
        kolom: [...isi.kolom],
        baris: isi.baris.slice((page - 1) * pageSize, page * pageSize),
        meta: { page, pageSize, total: isi.baris.length },
      }
      return HttpResponse.json(hasil)
    }),
  ),
]
