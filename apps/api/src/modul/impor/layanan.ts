import { berkasContoh, NAMA_BERKAS_CONTOH } from '@sinfodes/demo/data/impor-contoh'
import { waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import { cocokkanKolom } from '@sinfodes/kontrak/impor/kolom'
import { laporanImporSchema, type LaporanImpor } from '@sinfodes/kontrak/impor/schema'
import { randomUUID } from 'node:crypto'
import { bacaIstilahWilayah, daftarDusunDesa } from '../../basisdata/desa'
import { GalatApp } from '../../galat'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'
import type { KonteksTulis } from '../penduduk/layanan-tulis'
import { bacaBerkasTabel, type TabelBerkas } from './baca-berkas'
import { bersihkanNamaBerkas } from './nama-berkas'
import { bacaIndeksTerdaftar, hapusSesiKedaluwarsa, sisipSesiImpor } from './repositori'
import { sandikanIsiImpor } from './sandi'
import type { Db } from '../../basisdata/klien'

/** Sesi impor berlaku 24 jam sejak diunggah (rencana 8E3 Ruling 5). */
export const MASA_SESI_IMPOR_MS = 24 * 3600_000

export type MasukanUnggah = { jenis: 'contoh' } | { jenis: 'berkas'; nama: string; isi: Uint8Array }

const ANGKA_16 = /^\d{16}$/
const tanpaPemisah = (s: string): string => s.replace(/[\s.-]/g, '')

/**
 * NIK dan nomor KK dari berkas yang sudah terdaftar di desa ini. Hanya angka 16 digit yang muncul di berkas yang dicocokkan,
 * lewat indeks HMAC per desa (NIK mantan penduduk ikut), lalu dipetakan kembali ke angka polos berkas. Perbedaan sengaja dari
 * API tiruan, yang mencocokkan seluruh data dan menyebutnya nasional (rencana 8E3 Ruling 6).
 */
export async function angkaTerdaftar(
  db: Db,
  penyandi: Penyandi,
  desaId: string,
  baris: readonly { sel: readonly string[] }[],
): Promise<Pick<LaporanImpor, 'nikTerdaftar' | 'nomorKkTerdaftar'>> {
  const angka = [...new Set(baris.flatMap((b) => b.sel.map(tanpaPemisah)).filter((s) => ANGKA_16.test(s)))]
  const nik = new Map(angka.map((a) => [penyandi.indeks(a, ruang.nik(desaId)), a] as const))
  const kk = new Map(angka.map((a) => [penyandi.indeks(a, ruang.nomorKk(desaId)), a] as const))
  const ada = await bacaIndeksTerdaftar(db, [...nik.keys()], [...kk.keys()])
  return {
    nikTerdaftar: [...ada.nik].map((i) => nik.get(i) as string).sort(),
    nomorKkTerdaftar: [...ada.kk].map((i) => kk.get(i) as string).sort(),
  }
}

/**
 * Membaca berkas yang diunggah dan menyimpannya sebagai sesi impor (tersandi, 24 jam) sampai dikonfirmasi. Urutan pemeriksaan
 * sama dengan API tiruan: desa harus sudah punya dusun, baru berkasnya dibaca. `bacaMasukan` dipanggil sesudah pemeriksaan
 * dusun, jadi badan permintaan tidak dibaca untuk desa yang tak mungkin mengimpor.
 */
export async function unggahImpor(k: KonteksTulis, bacaMasukan: () => Promise<MasukanUnggah>): Promise<LaporanImpor> {
  const dusun = await daftarDusunDesa(k.db)
  if (dusun.length === 0) {
    throw new GalatApp('VALIDATION', 'Desa belum punya dusun. Atur dusun, RW, dan RT di Pengaturan › Wilayah sebelum mengimpor penduduk.', 422)
  }
  const istilah = await bacaIstilahWilayah(k.db, k.desa.id)
  const masukan = await bacaMasukan()
  let nama: string
  let tabel: TabelBerkas
  if (masukan.jenis === 'contoh') {
    nama = NAMA_BERKAS_CONTOH
    tabel = berkasContoh(dusun, istilah)
  } else {
    nama = bersihkanNamaBerkas(masukan.nama)
    tabel = await bacaBerkasTabel(nama, masukan.isi)
  }

  await hapusSesiKedaluwarsa(k.db, new Date(k.sekarang.getTime() - MASA_SESI_IMPOR_MS))
  const id = `imp_${randomUUID()}`
  await sisipSesiImpor(k.db, {
    id,
    desaId: k.desa.id,
    dicatatOlehId: k.pelaku.id,
    namaBerkas: nama,
    dibuatPada: k.sekarang,
    jumlahBaris: tabel.baris.length,
    isi: sandikanIsiImpor(k.penyandi, k.desa.id, tabel),
  })
  return laporanImporSchema.parse({
    id,
    namaBerkas: nama,
    dibuatPada: waktuIsoWib(k.sekarang),
    kolom: tabel.kolom.map((judul) => ({ judul, field: cocokkanKolom(judul) })),
    baris: tabel.baris,
    ...(await angkaTerdaftar(k.db, k.penyandi, k.desa.id, tabel.baris)),
  })
}
