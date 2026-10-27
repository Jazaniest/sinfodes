import { KATA_SANDI_DEMO } from '@sinfodes/demo/data/desa-demo'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import type postgres from 'postgres'
import type { Lingkungan } from '../konfigurasi'
import { hashKataSandi } from '../kripto/kata-sandi'
import { buatKunciDataBaru, type BarisKunciData, type Penyandi } from '../kripto/penyandi'
import { petaAlias, petaDesa, petaDusun, petaPengguna, type BarisSisip } from './peta-desa'
import { petaAkunWarga, petaKabupatenMitra, petaPenggunaKabupaten, petaPenggunaKonsol } from './peta-identitas'
import { petaKeluarga, petaPenduduk } from './peta-penduduk'

/** Semai ditolak: lingkungan nyata tanpa bendera eksplisit. Pesannya tidak memuat nilai konfigurasi. */
export class GalatSemai extends Error {
  constructor(pesan: string) {
    super(pesan)
    this.name = 'GalatSemai'
  }
}

export type OpsiSemai = {
  lingkungan: Lingkungan
  /** Wajib `true` untuk `staging` dan `produksi`: akun demo berkata sandi `demo` tidak boleh sampai ke sana tanpa sengaja. */
  izinkanLingkunganNyata?: boolean
  /** Dunia yang sudah dibangkitkan (uji menghemat waktu); bila kosong, dibangkitkan dari `acuan`. */
  dunia?: DbDemo
}

/** Hanya angka (jumlah baris tabel setelah semai): tidak memuat NIK, nomor KK, atau telepon. */
export type RingkasanSemai = {
  desa: number
  aliasAlamat: number
  dusun: number
  pengguna: number
  keluarga: number
  penduduk: number
  akunWarga: number
  kabupatenMitra: number
  penggunaKabupaten: number
  penggunaKonsol: number
}

const UKURAN_KELOMPOK = 500

/**
 * Menyisipkan kunci data aktif ke `kunci_data` bila belum ada, lalu mengembalikan semua baris kunci (bahan `buatPenyandi`).
 * Kunci yang sudah ada tidak pernah ditimpa: menimpa membuat data yang sudah tersandi tidak terbuka.
 */
export async function pastikanKunciData(sql: postgres.Sql, kunciUtama: Buffer, kid: string): Promise<BarisKunciData[]> {
  const baru = buatKunciDataBaru(kunciUtama, kid)
  await sql`insert into kunci_data (kid, dibungkus, dibuat) values (${baru.kid}, ${baru.dibungkus}, now()) on conflict (kid) do nothing`
  return [...(await sql<BarisKunciData[]>`select kid, dibungkus from kunci_data order by kid`)]
}

async function sisipkan(tx: postgres.TransactionSql, tabel: string, kolom: readonly string[], baris: readonly BarisSisip[]): Promise<void> {
  for (let i = 0; i < baris.length; i += UKURAN_KELOMPOK) {
    // Tipe pembantu `tx(baris, ...kolom)` terlalu sempit untuk kolom dinamis; bentuknya sudah dijamin pemeta.
    const kelompok = baris.slice(i, i + UKURAN_KELOMPOK) as never
    await tx`insert into ${tx(tabel)} ${tx(kelompok, ...(kolom as never[]))} on conflict do nothing`
  }
}

const KOLOM = {
  desa: [
    'id', 'slug', 'nama', 'kode_desa', 'kecamatan_kode', 'kecamatan_nama', 'kabupaten_kode', 'kabupaten_nama', 'provinsi_kode', 'provinsi_nama',
    'kode_pos', 'alamat_kantor', 'surel', 'telepon', 'jam_layanan', 'luas_km2', 'batas', 'istilah_wilayah', 'kode_surat', 'lambang',
    'lambang_kabupaten', 'status', 'modul', 'warna_aksen', 'tampilan_warga', 'dibuat',
  ],
  alias_alamat: ['label', 'desa_id', 'dibuat'],
  dusun: ['id', 'desa_id', 'nomor', 'nama', 'kepala_dusun', 'posyandu', 'rw'],
  pengguna: ['id', 'desa_id', 'nama', 'jabatan', 'peran', 'dusun_id', 'email', 'nip', 'aktif', 'kata_sandi_hash', 'dibuat'],
  keluarga: ['id', 'desa_id', 'nomor_kk_sandi', 'nomor_kk_indeks', 'kepala_keluarga_id', 'dusun_id', 'rw', 'rt', 'tanggal_terbit'],
  penduduk: [
    'id', 'desa_id', 'nik_sandi', 'nik_indeks', 'nama', 'jenis_kelamin', 'golongan_darah', 'agama', 'kewarganegaraan', 'tempat_lahir',
    'tanggal_lahir', 'nomor_akta_lahir', 'keluarga_id', 'hubungan_keluarga', 'nama_ayah', 'nama_ibu', 'dusun_id', 'rw', 'rt', 'pendidikan',
    'pekerjaan', 'status_perkawinan', 'status_dasar', 'status_penduduk', 'ktp_el', 'telepon_sandi', 'catatan', 'dibuat_pada', 'diubah_pada',
  ],
  akun_warga: ['penduduk_id', 'desa_id', 'pin_hash', 'whatsapp_sandi', 'diubah'],
  kabupaten_mitra: ['kode', 'nama', 'label', 'provinsi_kode', 'provinsi_nama', 'bergabung', 'surat_penunjukan', 'dibuat'],
  pengguna_kabupaten: ['id', 'kabupaten_kode', 'nama', 'jabatan', 'peran', 'email', 'aktif', 'kata_sandi_hash', 'dibuat'],
  pengguna_konsol: ['id', 'nama', 'jabatan', 'peran', 'email', 'aktif', 'kata_sandi_hash', 'totp_rahasia_sandi', 'totp_langkah_terakhir', 'dibuat'],
} as const

/**
 * Memindahkan dunia demo ke PostgreSQL lewat peran migrasi (pemilik skema, kebijakan `pemilik_skema`). ID demo dipertahankan;
 * NIK, nomor KK, dan telepon disandikan sebelum disisipkan. Idempoten: baris yang sudah ada dibiarkan, tidak disandikan ulang.
 * Seluruhnya dalam satu transaksi.
 */
export async function semaiDunia(sql: postgres.Sql, penyandi: Penyandi, acuan: Date, opsi: OpsiSemai): Promise<RingkasanSemai> {
  if ((opsi.lingkungan === 'staging' || opsi.lingkungan === 'produksi') && !opsi.izinkanLingkunganNyata) {
    throw new GalatSemai(`Semai ditolak di lingkungan ${opsi.lingkungan}: akun demo berkata sandi bersama tidak boleh ada di sana. Berikan bendera eksplisit bila memang disengaja.`)
  }
  const dunia = opsi.dunia ?? bangkitkanDb(acuan)
  const hashDemo = (n: number): Promise<string[]> => Promise.all(Array.from({ length: n }, () => hashKataSandi(KATA_SANDI_DEMO)))
  const hash = await hashDemo(dunia.pengguna.length)
  const hashKabupaten = await hashDemo(dunia.penggunaKabupaten.length)
  const hashKonsol = await hashDemo(dunia.penggunaKonsol.length)
  const hashPin = await Promise.all(dunia.akunWarga.map((a) => hashKataSandi(a.pin)))

  await sql.begin(async (tx) => {
    await sisipkan(tx, 'desa', KOLOM.desa, petaDesa(tx, dunia, acuan))
    await sisipkan(tx, 'alias_alamat', KOLOM.alias_alamat, petaAlias(dunia, acuan))
    await sisipkan(tx, 'dusun', KOLOM.dusun, petaDusun(tx, dunia))
    await sisipkan(tx, 'pengguna', KOLOM.pengguna, petaPengguna(dunia, hash, acuan))
    // Kunci asing kepala keluarga ditunda sampai transaksi selesai (keluarga lebih dulu daripada penduduk).
    await sisipkan(tx, 'keluarga', KOLOM.keluarga, petaKeluarga(dunia, penyandi))
    await sisipkan(tx, 'penduduk', KOLOM.penduduk, petaPenduduk(dunia, penyandi))
    await sisipkan(tx, 'akun_warga', KOLOM.akun_warga, petaAkunWarga(dunia, penyandi, hashPin, acuan))
    await sisipkan(tx, 'kabupaten_mitra', KOLOM.kabupaten_mitra, petaKabupatenMitra(tx, dunia, acuan))
    await sisipkan(tx, 'pengguna_kabupaten', KOLOM.pengguna_kabupaten, petaPenggunaKabupaten(dunia, hashKabupaten, acuan))
    await sisipkan(tx, 'pengguna_konsol', KOLOM.pengguna_konsol, petaPenggunaKonsol(dunia, hashKonsol, acuan))
  })

  const [r] = await sql<RingkasanSemai[]>`select
    (select count(*)::int from desa) as desa, (select count(*)::int from alias_alamat) as "aliasAlamat",
    (select count(*)::int from dusun) as dusun, (select count(*)::int from pengguna) as pengguna,
    (select count(*)::int from keluarga) as keluarga, (select count(*)::int from penduduk) as penduduk,
    (select count(*)::int from akun_warga) as "akunWarga", (select count(*)::int from kabupaten_mitra) as "kabupatenMitra",
    (select count(*)::int from pengguna_kabupaten) as "penggunaKabupaten", (select count(*)::int from pengguna_konsol) as "penggunaKonsol"`
  return { ...r }
}
