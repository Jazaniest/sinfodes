import { hasilCariSchema, type HasilCari } from '@sinfodes/kontrak/cari/schema'
import { cocokPenduduk, kataCukup } from '@sinfodes/kontrak/penduduk/cari'
import { boleh, cakupanDusun } from '@sinfodes/kontrak/pengguna/hak-akses'
import { ruang } from '../../kripto/ruang'
import { daftarKeluarga } from '../keluarga/layanan'
import type { KonteksLayanan } from '../penduduk/layanan'
import { bacaKeluargaDesa, bacaPendudukDesa } from '../penduduk/repositori'
import { cariSurat } from './cari-surat'

const MAKS_PER_JENIS = 5
const KOSONG: HasilCari = { penduduk: [], keluarga: [], surat: [] }

const urutId = (a: { id: string }, b: { id: string }): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/**
 * Pencarian cepat lintas jenis (SPEC-V0.2 §5.4): penduduk (semua status dasar) dan KK paling banyak lima per jenis, dengan
 * fungsi pencocokan kontrak yang sama dengan API tiruan. Kata yang belum cukup atau peran tanpa `penduduk.lihat` mendapat tiga
 * larik kosong, bukan galat. Kepala Dusun hanya mencari di dusunnya. NIK dibuka dari sandi hanya untuk mencocokkan, telepon tidak.
 */
export async function cariGlobal(k: KonteksLayanan, kata: string): Promise<HasilCari> {
  if (!kataCukup(kata) || !boleh(k.pelaku.peran, 'penduduk.lihat')) return KOSONG
  const dusunSaja = cakupanDusun(k.pelaku)
  const [rekam, rekamKk] = await Promise.all([bacaPendudukDesa(k.db, dusunSaja), bacaKeluargaDesa(k.db, dusunSaja)])
  const nomorKk = new Map(rekamKk.map((r) => [r.id, k.penyandi.bukaSandi(r.nomorKkSandi, ruang.nomorKk(r.desaId))] as const))

  const penduduk = [...rekam]
    .sort(urutId)
    .map((r) => ({ r, nik: r.nikSandi === null ? null : k.penyandi.bukaSandi(r.nikSandi, ruang.nik(r.desaId)) }))
    .filter(({ r, nik }) => cocokPenduduk({ nama: r.nama, nik }, kata, nomorKk.get(r.keluargaId) ?? ''))
    .sort((a, b) => a.r.nama.localeCompare(b.r.nama, 'id'))
    .slice(0, MAKS_PER_JENIS)
    .map(({ r, nik }) => ({
      id: r.id, nama: r.nama, nik, jenisKelamin: r.jenisKelamin, tanggalLahir: r.tanggalLahir, dusunId: r.dusunId, rw: r.rw, rt: r.rt,
      statusDasar: r.statusDasar,
    }))

  // Daftar KK sudah menyaring nomor dan nama kepala, membuang KK tanpa anggota Hidup, dan mengurutkan menurut nama kepala.
  const kk = await daftarKeluarga(k, { page: 1, pageSize: 25 }, kata)
  const keluarga = kk.data
    .slice(0, MAKS_PER_JENIS)
    .map((b) => ({ id: b.id, nomorKk: b.nomorKk, namaKepala: b.namaKepala, dusunId: b.dusunId, rw: b.rw, rt: b.rt }))

  return hasilCariSchema.parse({ penduduk, keluarga, surat: await cariSurat(k, kata) })
}
