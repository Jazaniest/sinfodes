import { susunBukuPenduduk, type BahanBukuPenduduk, type KodeBukuPenduduk } from '@/domain/buku/penduduk'
import type { BarisPenduduk } from '@/domain/penduduk/schema'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { konteksWilayah, type PenyusunBuku } from './tipe'

/** Bahan buku penduduk dari basis data tiruan; susunannya sendiri ada di kontrak, dipakai juga oleh server. */
function bahanDari(db: DbDemo, desaId: string): BahanBukuPenduduk {
  const { dusun, istilah } = konteksWilayah(db, desaId)
  const nomorKk = new Map(db.keluarga.map((k) => [k.id, k.nomorKk]))
  const penduduk: BarisPenduduk[] = db.penduduk
    .filter((p) => p.desaId === desaId)
    .map((p) => ({ ...p, nomorKk: nomorKk.get(p.keluargaId) ?? '' }))
  return {
    hariIni: new Date(),
    dusun,
    istilah,
    penduduk,
    mutasi: db.mutasi.filter((m) => m.desaId === desaId),
    keluarga: db.keluarga.filter((k) => k.desaId === desaId).map((k) => ({ dusunId: k.dusunId, jumlahAnggota: k.anggotaIds.length })),
  }
}

const penyusun = (kode: KodeBukuPenduduk): PenyusunBuku => (db, desaId) => susunBukuPenduduk(kode, bahanDari(db, desaId))

export const bukuIndukPenduduk = penyusun('induk-penduduk')
export const bukuMutasi = penyusun('mutasi-penduduk')
export const bukuRekapitulasi = penyusun('rekapitulasi-penduduk')
export const bukuPendudukSementara = penyusun('penduduk-sementara')
export const bukuKtpKk = penyusun('ktp-kk')
