import { formatAngka } from '../format/angka'
import { formatTanggal, tanggalIsoWib } from '../format/tanggal'
import { hitungMutasiBulan, rincianMutasi } from '../mutasi/buku'
import { LABEL_MUTASI, type Mutasi } from '../mutasi/schema'
import { barisBukuInduk, KOLOM_BUKU_INDUK } from '../penduduk/buku-induk'
import { HUBUNGAN_KELUARGA } from '../penduduk/enum'
import type { BarisPenduduk, Penduduk } from '../penduduk/schema'
import { alamatLengkap, namaDusun } from '../wilayah/alamat'
import type { Desa, Dusun } from '../wilayah/schema'

/** Isi satu buku: kolom format Permendagri 47/2016 dan barisnya, semuanya teks siap cetak. */
export type IsiSusunan = { kolom: readonly string[]; baris: string[][]; diperbarui: string | null }

/** Lima buku Administrasi Penduduk yang sumbernya Kependudukan, Mutasi, dan Statistik (SPEC Lampiran B). */
export const KODE_BUKU_PENDUDUK = ['induk-penduduk', 'mutasi-penduduk', 'rekapitulasi-penduduk', 'penduduk-sementara', 'ktp-kk'] as const
export type KodeBukuPenduduk = (typeof KODE_BUKU_PENDUDUK)[number]

/**
 * Bahan susunan buku penduduk, sama untuk API tiruan dan server. `penduduk` memuat semua status dasar dengan nomor KK terisi;
 * `jumlahAnggota` per KK adalah anggota Hidup (KK tanpa anggota Hidup tidak dihitung).
 */
export type BahanBukuPenduduk = {
  hariIni: Date
  dusun: readonly Dusun[]
  istilah: Desa['istilahWilayah']
  penduduk: readonly BarisPenduduk[]
  mutasi: readonly Mutasi[]
  keluarga: readonly { dusunId: string; jumlahAnggota: number }[]
}

/** Waktu ISO paling akhir; tanggal saja dianggap pukul 00.00 WIB. Null bila daftar kosong. */
export function waktuTerakhir(daftar: readonly string[]): string | null {
  const waktu = daftar.map((w) => (w.length === 10 ? `${w}T00:00:00+07:00` : w))
  return waktu.length === 0 ? null : waktu.reduce((a, b) => (b > a ? b : a))
}

const jenisKelamin = (p: Pick<Penduduk, 'jenisKelamin'>) => (p.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan')
const ttl = (p: Pick<Penduduk, 'tempatLahir' | 'tanggalLahir'>) => `${p.tempatLahir}, ${formatTanggal(p.tanggalLahir)}`

/** Penduduk hidup desa; urut dusun, RW, RT, KK, lalu kedudukan dalam keluarga. */
function pendudukUrut(b: BahanBukuPenduduk): BarisPenduduk[] {
  const nomorDusun = new Map(b.dusun.map((d) => [d.id, d.nomor]))
  const hubungan = (p: Penduduk) => HUBUNGAN_KELUARGA.indexOf(p.hubunganKeluarga)
  return b.penduduk
    .filter((p) => p.statusDasar === 'Hidup')
    .sort(
      (a, c) =>
        (nomorDusun.get(a.dusunId) ?? 0) - (nomorDusun.get(c.dusunId) ?? 0) || a.rw.localeCompare(c.rw) || a.rt.localeCompare(c.rt) ||
        a.nomorKk.localeCompare(c.nomorKk) || hubungan(a) - hubungan(c) || a.tanggalLahir.localeCompare(c.tanggalLahir),
    )
}

/** Buku Induk Penduduk: kolom resmi yang sama dengan Unduh di daftar penduduk. */
function bukuInduk(b: BahanBukuPenduduk): IsiSusunan {
  const penduduk = pendudukUrut(b)
  return {
    kolom: KOLOM_BUKU_INDUK,
    baris: penduduk.map((p, i) => barisBukuInduk(p, i + 1, { dusun: b.dusun, istilah: b.istilah })),
    diperbarui: waktuTerakhir(penduduk.map((p) => p.diubahPada)),
  }
}

/** Buku Mutasi Penduduk Desa: satu baris per orang per kejadian, mulai dari yang terlama. */
function bukuMutasi(b: BahanBukuPenduduk): IsiSusunan {
  const orang = new Map(b.penduduk.map((p) => [p.id, p]))
  const mutasi = [...b.mutasi].sort((x, y) => x.tanggal.localeCompare(y.tanggal) || x.dicatatPada.localeCompare(y.dicatatPada))
  const baris = mutasi.flatMap((m) =>
    m.pendudukIds.map((id) => {
      const p = orang.get(id)
      return [formatTanggal(m.tanggal), LABEL_MUTASI[m.jenis], p?.nama ?? '', p?.nik ?? '', rincianMutasi(m), m.dicatatOleh.nama]
    }),
  )
  return {
    kolom: ['No', 'Tanggal', 'Jenis mutasi', 'Nama', 'NIK', 'Rincian', 'Dicatat oleh'],
    baris: baris.map((r, i) => [String(i + 1), ...r]),
    diperbarui: waktuTerakhir(mutasi.map((m) => m.dicatatPada)),
  }
}

/** Buku Rekapitulasi Jumlah Penduduk: per dusun dan baris Jumlah, dengan mutasi bulan berjalan (WIB). */
function bukuRekapitulasi(b: BahanBukuPenduduk): IsiSusunan {
  const bulan = tanggalIsoWib(b.hariIni).slice(0, 7)
  const hidup = b.penduduk.filter((p) => p.statusDasar === 'Hidup')
  const kk = b.keluarga.filter((k) => k.jumlahAnggota > 0)
  const dusunOrang = new Map(b.penduduk.map((p) => [p.id, p.dusunId]))
  const baris = (label: string, h: readonly Penduduk[], jumlahKk: number, m: readonly Mutasi[]) => {
    const hitung = hitungMutasiBulan(m, bulan)
    const laki = h.filter((p) => p.jenisKelamin === 'L').length
    return [
      label, formatAngka(laki), formatAngka(h.length - laki), formatAngka(h.length), formatAngka(jumlahKk),
      String(hitung.lahir), String(hitung.meninggal), String(hitung.datang), String(hitung.pindah),
    ]
  }
  return {
    kolom: [
      'Wilayah', 'Laki-laki', 'Perempuan', 'Jumlah jiwa', 'Jumlah KK', 'Lahir bulan ini', 'Meninggal bulan ini', 'Datang bulan ini', 'Pindah bulan ini',
    ],
    baris: [
      ...[...b.dusun].sort((x, y) => x.nomor - y.nomor).map((d) =>
        baris(
          namaDusun(d, b.istilah),
          hidup.filter((p) => p.dusunId === d.id),
          kk.filter((k) => k.dusunId === d.id).length,
          b.mutasi.filter((m) => m.pendudukIds.some((id) => dusunOrang.get(id) === d.id)),
        ),
      ),
      baris('Jumlah', hidup, kk.length, b.mutasi),
    ],
    diperbarui: waktuTerakhir(b.mutasi.map((m) => m.dicatatPada)),
  }
}

/** Buku Penduduk Sementara, dari penduduk berstatus Sementara. */
function bukuPendudukSementara(b: BahanBukuPenduduk): IsiSusunan {
  const sementara = pendudukUrut(b).filter((p) => p.statusPenduduk === 'Sementara')
  return {
    kolom: ['No', 'Nama', 'Jenis kelamin', 'NIK', 'Tempat, tanggal lahir', 'Pekerjaan', 'Kewarganegaraan', 'Alamat', 'Keterangan'],
    baris: sementara.map((p, i) => [
      String(i + 1), p.nama, jenisKelamin(p), p.nik ?? 'Belum ada NIK', ttl(p), p.pekerjaan ?? '', p.kewarganegaraan,
      alamatLengkap(p, b.dusun, b.istilah), p.catatan ?? '',
    ]),
    diperbarui: waktuTerakhir(sementara.map((p) => p.diubahPada)),
  }
}

/** Buku KTP dan Kartu Keluarga: penduduk hidup per KK, dengan status perekaman KTP-el. */
function bukuKtpKk(b: BahanBukuPenduduk): IsiSusunan {
  const penduduk = pendudukUrut(b)
  return {
    kolom: [
      'No', 'Nomor KK', 'NIK', 'Nama', 'Jenis kelamin', 'Tempat, tanggal lahir', 'Agama', 'Pendidikan', 'Pekerjaan', 'Status perkawinan',
      'Kedudukan dalam keluarga', 'Kewarganegaraan', 'KTP-el', 'Alamat',
    ],
    baris: penduduk.map((p, i) => [
      String(i + 1), p.nomorKk, p.nik ?? 'Belum ada NIK', p.nama, jenisKelamin(p), ttl(p), p.agama, p.pendidikan ?? '', p.pekerjaan ?? '',
      p.statusPerkawinan ?? '', p.hubunganKeluarga, p.kewarganegaraan, p.ktpEl, alamatLengkap(p, b.dusun, b.istilah),
    ]),
    diperbarui: waktuTerakhir(penduduk.map((p) => p.diubahPada)),
  }
}

const PENYUSUN: Readonly<Record<KodeBukuPenduduk, (b: BahanBukuPenduduk) => IsiSusunan>> = {
  'induk-penduduk': bukuInduk,
  'mutasi-penduduk': bukuMutasi,
  'rekapitulasi-penduduk': bukuRekapitulasi,
  'penduduk-sementara': bukuPendudukSementara,
  'ktp-kk': bukuKtpKk,
}

/** Menyusun satu buku penduduk dari bahannya. Fungsi murni, tanpa membaca basis data. */
export const susunBukuPenduduk = (kode: KodeBukuPenduduk, bahan: BahanBukuPenduduk): IsiSusunan => PENYUSUN[kode](bahan)
