import { LABEL_KONDISI } from '@/domain/aset/schema'
import { formatAngka } from '@/domain/format/angka'
import { formatTanggal } from '@/domain/format/tanggal'
import { teksMasaBakti } from '@/domain/lembaga/schema'
import { namaDusun } from '@/domain/wilayah/alamat'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { konteksWilayah, waktuTerakhir, type PenyusunBuku } from './tipe'

const asetDesa = (db: DbDemo, desaId: string) => db.aset.filter((a) => a.desaId === desaId).sort((a, b) => a.kode.localeCompare(b.kode))

/** Buku Inventaris dan Kekayaan Desa, dari Aset Desa. Aset belum mencatat waktu ubah, jadi dipakai tanggal data. */
export const bukuInventaris: PenyusunBuku = (db, desaId) => ({
  kolom: ['No', 'Kode', 'Jenis barang/bangunan', 'Kategori', 'Asal perolehan', 'Tahun perolehan', 'Nilai perolehan (Rp)', 'Keadaan', 'Keterangan'],
  baris: asetDesa(db, desaId).map((a, i) => [
    String(i + 1), a.kode, a.nama, a.kategori, a.asal, String(a.tahunPerolehan), formatAngka(a.nilaiPerolehan), LABEL_KONDISI[a.kondisi],
    a.keterangan ?? '',
  ]),
  diperbarui: db.tanggalAcuan,
})

/** Buku Tanah Kas Desa, dari Aset Desa kategori Tanah. */
export const bukuTanahKas: PenyusunBuku = (db, desaId) => ({
  kolom: ['No', 'Kode', 'Bidang tanah', 'Asal perolehan', 'Tahun perolehan', 'Luas dan letak', 'Nilai perolehan (Rp)', 'Keadaan'],
  baris: asetDesa(db, desaId)
    .filter((a) => a.kategori === 'Tanah')
    .map((a, i) => [
      String(i + 1), a.kode, a.nama, a.asal, String(a.tahunPerolehan), a.keterangan ?? '', formatAngka(a.nilaiPerolehan), LABEL_KONDISI[a.kondisi],
    ]),
  diperbarui: db.tanggalAcuan,
})

/** Buku Aparat Pemerintah Desa, dari pengurus Lembaga Desa kelompok perangkat. */
export const bukuAparat: PenyusunBuku = (db, desaId) => {
  const { dusun, istilah } = konteksWilayah(db, desaId)
  const perangkat = db.pengurusLembaga.filter((p) => p.desaId === desaId && p.lembaga === 'perangkat').sort((a, b) => a.urutan - b.urutan)
  return {
    kolom: ['No', 'Nama', 'Jabatan', 'Masa bakti', 'Wilayah tugas'],
    baris: perangkat.map((p, i) => {
      const d = dusun.find((x) => x.id === p.dusunId)
      return [String(i + 1), p.nama, p.jabatan, teksMasaBakti(p.masaBakti), d ? namaDusun(d, istilah) : '']
    }),
    diperbarui: db.tanggalAcuan,
  }
}

/** Buku Agenda: surat keluar yang sudah bernomor dan surat masuk, urut tanggal dicatat. */
export const bukuAgenda: PenyusunBuku = (db, desaId) => {
  const nama = new Map(db.penduduk.map((p) => [p.id, p.nama]))
  const jenis = new Map(db.jenisSurat.map((j) => [j.id, j.nama]))
  const keluar = db.permohonan.flatMap((p) =>
    p.desaId === desaId && p.terbit
      ? [{
          tanggal: p.terbit.pada.slice(0, 10),
          waktu: p.terbit.pada,
          isi: ['Keluar', p.terbit.nomor, formatTanggal(p.terbit.pada), nama.get(p.pemohonId) ?? '', jenis.get(p.jenisId) ?? ''],
        }]
      : [],
  )
  const masuk = db.suratMasuk
    .filter((s) => s.desaId === desaId)
    .map((s) => ({ tanggal: s.diterima, waktu: s.dicatat.pada, isi: ['Masuk', s.nomor, formatTanggal(s.tanggalSurat), s.pengirim, s.perihal] }))
  const semua = [...keluar, ...masuk].sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.waktu.localeCompare(b.waktu))
  return {
    kolom: ['No', 'Tanggal dicatat', 'Surat', 'Nomor surat', 'Tanggal surat', 'Kepada/Dari', 'Isi singkat'],
    baris: semua.map((b, i) => [String(i + 1), formatTanggal(b.tanggal), ...b.isi]),
    diperbarui: waktuTerakhir(semua.map((b) => b.waktu)),
  }
}
