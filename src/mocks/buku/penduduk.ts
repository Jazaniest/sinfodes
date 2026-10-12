import { formatAngka } from '@/domain/format/angka'
import { formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { hitungMutasiBulan, rincianMutasi } from '@/domain/mutasi/buku'
import { LABEL_MUTASI, type Mutasi } from '@/domain/mutasi/schema'
import { barisBukuInduk, KOLOM_BUKU_INDUK } from '@/domain/penduduk/buku-induk'
import { HUBUNGAN_KELUARGA } from '@/domain/penduduk/enum'
import type { BarisPenduduk, Penduduk } from '@/domain/penduduk/schema'
import { alamatLengkap, namaDusun } from '@/domain/wilayah/alamat'
import type { DbDemo } from '../tipe-db'
import { konteksWilayah, waktuTerakhir, type PenyusunBuku } from './tipe'

const jenisKelamin = (p: Pick<Penduduk, 'jenisKelamin'>) => (p.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan')
const ttl = (p: Pick<Penduduk, 'tempatLahir' | 'tanggalLahir'>) => `${p.tempatLahir}, ${formatTanggal(p.tanggalLahir)}`

/** Penduduk hidup desa beserta nomor KK; urut dusun, RW, RT, KK, lalu kedudukan dalam keluarga. */
function pendudukUrut(db: DbDemo, desaId: string): BarisPenduduk[] {
  const nomorKk = new Map(db.keluarga.map((k) => [k.id, k.nomorKk]))
  const nomorDusun = new Map(db.dusun.map((d) => [d.id, d.nomor]))
  const hubungan = (p: Penduduk) => HUBUNGAN_KELUARGA.indexOf(p.hubunganKeluarga)
  return db.penduduk
    .filter((p) => p.desaId === desaId && p.statusDasar === 'Hidup')
    .map((p) => ({ ...p, nomorKk: nomorKk.get(p.keluargaId) ?? '' }))
    .sort(
      (a, b) =>
        (nomorDusun.get(a.dusunId) ?? 0) - (nomorDusun.get(b.dusunId) ?? 0) || a.rw.localeCompare(b.rw) || a.rt.localeCompare(b.rt) ||
        a.nomorKk.localeCompare(b.nomorKk) || hubungan(a) - hubungan(b) || a.tanggalLahir.localeCompare(b.tanggalLahir),
    )
}

/** Buku Induk Penduduk (contoh lengkap, SPEC §8): kolom resmi yang sama dengan Unduh di daftar penduduk. */
export const bukuIndukPenduduk: PenyusunBuku = (db, desaId) => {
  const { dusun, istilah } = konteksWilayah(db, desaId)
  const penduduk = pendudukUrut(db, desaId)
  return {
    kolom: KOLOM_BUKU_INDUK,
    baris: penduduk.map((p, i) => barisBukuInduk(p, i + 1, { dusun, istilah })),
    diperbarui: waktuTerakhir(penduduk.map((p) => p.diubahPada)),
  }
}

/** Buku Mutasi Penduduk Desa: satu baris per orang per kejadian, mulai dari yang terlama. */
export const bukuMutasi: PenyusunBuku = (db, desaId) => {
  const orang = new Map(db.penduduk.map((p) => [p.id, p]))
  const mutasi = db.mutasi
    .filter((m) => m.desaId === desaId)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.dicatatPada.localeCompare(b.dicatatPada))
  const baris = mutasi.flatMap((m) =>
    m.pendudukIds.map((id) => {
      const p = orang.get(id)
      return [formatTanggal(m.tanggal), LABEL_MUTASI[m.jenis], p?.nama ?? '', p?.nik ?? '', rincianMutasi(m), m.dicatatOleh.nama]
    }),
  )
  return {
    kolom: ['No', 'Tanggal', 'Jenis mutasi', 'Nama', 'NIK', 'Rincian', 'Dicatat oleh'],
    baris: baris.map((b, i) => [String(i + 1), ...b]),
    diperbarui: waktuTerakhir(mutasi.map((m) => m.dicatatPada)),
  }
}

/** Buku Rekapitulasi Jumlah Penduduk: per dusun dan baris Jumlah, dengan mutasi bulan berjalan. */
export const bukuRekapitulasi: PenyusunBuku = (db, desaId) => {
  const { dusun, istilah } = konteksWilayah(db, desaId)
  const bulan = tanggalIsoWib(new Date()).slice(0, 7)
  const hidup = db.penduduk.filter((p) => p.desaId === desaId && p.statusDasar === 'Hidup')
  const kk = db.keluarga.filter((k) => k.desaId === desaId && k.anggotaIds.length > 0)
  const dusunOrang = new Map(db.penduduk.map((p) => [p.id, p.dusunId]))
  const mutasi = db.mutasi.filter((m) => m.desaId === desaId)
  const baris = (label: string, h: readonly Penduduk[], jumlahKk: number, m: readonly Mutasi[]) => {
    const b = hitungMutasiBulan(m, bulan)
    const laki = h.filter((p) => p.jenisKelamin === 'L').length
    return [
      label, formatAngka(laki), formatAngka(h.length - laki), formatAngka(h.length), formatAngka(jumlahKk),
      String(b.lahir), String(b.meninggal), String(b.datang), String(b.pindah),
    ]
  }
  return {
    kolom: [
      'Wilayah', 'Laki-laki', 'Perempuan', 'Jumlah jiwa', 'Jumlah KK', 'Lahir bulan ini', 'Meninggal bulan ini', 'Datang bulan ini', 'Pindah bulan ini',
    ],
    baris: [
      ...dusun.map((d) =>
        baris(
          namaDusun(d, istilah),
          hidup.filter((p) => p.dusunId === d.id),
          kk.filter((k) => k.dusunId === d.id).length,
          mutasi.filter((m) => m.pendudukIds.some((id) => dusunOrang.get(id) === d.id)),
        ),
      ),
      baris('Jumlah', hidup, kk.length, mutasi),
    ],
    diperbarui: waktuTerakhir(mutasi.map((m) => m.dicatatPada)),
  }
}

/** Buku Penduduk Sementara, dari penduduk berstatus Sementara. */
export const bukuPendudukSementara: PenyusunBuku = (db, desaId) => {
  const { dusun, istilah } = konteksWilayah(db, desaId)
  const sementara = pendudukUrut(db, desaId).filter((p) => p.statusPenduduk === 'Sementara')
  return {
    kolom: ['No', 'Nama', 'Jenis kelamin', 'NIK', 'Tempat, tanggal lahir', 'Pekerjaan', 'Kewarganegaraan', 'Alamat', 'Keterangan'],
    baris: sementara.map((p, i) => [
      String(i + 1), p.nama, jenisKelamin(p), p.nik ?? 'Belum ada NIK', ttl(p), p.pekerjaan ?? '', p.kewarganegaraan,
      alamatLengkap(p, dusun, istilah), p.catatan ?? '',
    ]),
    diperbarui: waktuTerakhir(sementara.map((p) => p.diubahPada)),
  }
}

/** Buku KTP dan Kartu Keluarga: penduduk hidup per KK, dengan status perekaman KTP-el. */
export const bukuKtpKk: PenyusunBuku = (db, desaId) => {
  const { dusun, istilah } = konteksWilayah(db, desaId)
  const penduduk = pendudukUrut(db, desaId)
  return {
    kolom: [
      'No', 'Nomor KK', 'NIK', 'Nama', 'Jenis kelamin', 'Tempat, tanggal lahir', 'Agama', 'Pendidikan', 'Pekerjaan', 'Status perkawinan',
      'Kedudukan dalam keluarga', 'Kewarganegaraan', 'KTP-el', 'Alamat',
    ],
    baris: penduduk.map((p, i) => [
      String(i + 1), p.nomorKk, p.nik ?? 'Belum ada NIK', p.nama, jenisKelamin(p), ttl(p), p.agama, p.pendidikan ?? '', p.pekerjaan ?? '',
      p.statusPerkawinan ?? '', p.hubunganKeluarga, p.kewarganegaraan, p.ktpEl, alamatLengkap(p, dusun, istilah),
    ]),
    diperbarui: waktuTerakhir(penduduk.map((p) => p.diubahPada)),
  }
}
