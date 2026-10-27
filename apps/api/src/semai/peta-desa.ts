import { MODUL_BAWAAN_DESA_BARU } from '@sinfodes/kontrak/pengaturan/modul'
import { situsBawaan } from '@sinfodes/demo/generator/website'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import type postgres from 'postgres'

/** Baris siap sisip: kunci = nama kolom SQL. Nilai bersarang dibungkus `sql.json`. */
export type BarisSisip = Record<string, string | number | boolean | Date | null | postgres.Parameter>

export type PembuatJson = Pick<postgres.Sql, 'json'>
const json = (sql: PembuatJson, nilai: unknown): postgres.Parameter => sql.json(nilai as postgres.JSONValue)

const versiTerbit = (db: DbDemo, desaId: string) => (db.situs.find((s) => s.desaId === desaId) ?? situsBawaan(desaId, db.tanggalAcuan)).terbit

export function petaDesa(sql: PembuatJson, db: DbDemo, dibuat: Date): BarisSisip[] {
  return db.desa.map((d) => {
    const tema = versiTerbit(db, d.id).tema
    const modul = db.modulDesa.find((m) => m.desaId === d.id)
    // Salinan terbatas dari tampilan warga di API tiruan; uji konformansi (Tugas 9) membuktikan keduanya sama.
    const tampilanWarga =
      d.status === 'Persiapan'
        ? null
        : { warnaUtama: tema.warnaUtama, logo: tema.logo ?? d.lambang ?? null, fotoLatar: tema.warga.fotoLatar, sambutan: tema.warga.sambutan, huruf: tema.huruf }
    return {
      id: d.id,
      slug: d.slug,
      nama: d.nama,
      kode_desa: d.kodeDesa,
      kecamatan_kode: d.kecamatan.kode,
      kecamatan_nama: d.kecamatan.nama,
      kabupaten_kode: d.kabupaten.kode,
      kabupaten_nama: d.kabupaten.nama,
      provinsi_kode: d.provinsi.kode,
      provinsi_nama: d.provinsi.nama,
      kode_pos: d.kodePos,
      alamat_kantor: d.alamatKantor,
      surel: d.surel,
      telepon: d.telepon,
      jam_layanan: json(sql, d.jamLayanan),
      luas_km2: d.luasKm2,
      batas: d.batas === null ? null : json(sql, d.batas),
      istilah_wilayah: json(sql, d.istilahWilayah),
      kode_surat: d.kodeSurat,
      lambang: d.lambang ?? null,
      lambang_kabupaten: d.lambangKabupaten ?? null,
      status: d.status,
      modul: json(sql, modul ? { kesehatan: modul.kesehatan } : MODUL_BAWAAN_DESA_BARU),
      warna_aksen: tema.warnaAksen,
      tampilan_warga: tampilanWarga === null ? null : json(sql, tampilanWarga),
      dibuat,
    }
  })
}

export const petaAlias = (db: DbDemo, dibuat: Date): BarisSisip[] => db.aliasAlamat.map((a) => ({ label: a.label, desa_id: a.desaId, dibuat }))

export const petaDusun = (sql: PembuatJson, db: DbDemo): BarisSisip[] =>
  db.dusun.map((d) => ({
    id: d.id,
    desa_id: d.desaId,
    nomor: d.nomor,
    nama: d.nama,
    kepala_dusun: d.kepalaDusun,
    posyandu: d.posyandu,
    rw: json(sql, d.rw),
  }))

/** `hashKataSandi[i]` milik `db.pengguna[i]`: setiap akun mendapat garam sendiri. */
export const petaPengguna = (db: DbDemo, hashKataSandi: readonly string[], dibuat: Date): BarisSisip[] =>
  db.pengguna.map((p, i) => ({
    id: p.id,
    desa_id: p.desaId,
    nama: p.nama,
    jabatan: p.jabatan,
    peran: p.peran,
    dusun_id: p.dusunId,
    email: p.email.toLowerCase(),
    nip: p.nip,
    aktif: p.aktif,
    kata_sandi_hash: hashKataSandi[i],
    dibuat,
  }))
