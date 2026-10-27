import { boolean, date, integer, jsonb, numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Definisi tabel untuk kueri bertipe. Bentuk sebenarnya ditetapkan migrasi SQL (`migrasi/`); uji meta membandingkan
 * nama kolom di sini dengan `information_schema` supaya keduanya tidak berpisah jalan.
 */
const waktu = (nama: string) => timestamp(nama, { withTimezone: true, mode: 'date' })

export const desa = pgTable('desa', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  nama: text('nama').notNull(),
  kodeDesa: text('kode_desa').notNull(),
  kecamatanKode: text('kecamatan_kode').notNull(),
  kecamatanNama: text('kecamatan_nama').notNull(),
  kabupatenKode: text('kabupaten_kode').notNull(),
  kabupatenNama: text('kabupaten_nama').notNull(),
  provinsiKode: text('provinsi_kode').notNull(),
  provinsiNama: text('provinsi_nama').notNull(),
  kodePos: text('kode_pos').notNull(),
  alamatKantor: text('alamat_kantor').notNull(),
  surel: text('surel').notNull(),
  telepon: text('telepon').notNull(),
  jamLayanan: jsonb('jam_layanan').notNull(),
  luasKm2: numeric('luas_km2', { mode: 'number' }),
  batas: jsonb('batas'),
  istilahWilayah: jsonb('istilah_wilayah').notNull(),
  kodeSurat: text('kode_surat').notNull(),
  lambang: text('lambang'),
  lambangKabupaten: text('lambang_kabupaten'),
  status: text('status').notNull(),
  modul: jsonb('modul').notNull(),
  warnaAksen: text('warna_aksen').notNull(),
  tampilanWarga: jsonb('tampilan_warga'),
  dibuat: waktu('dibuat').notNull(),
})

export const aliasAlamat = pgTable('alias_alamat', {
  label: text('label').primaryKey(),
  desaId: text('desa_id').notNull(),
  dibuat: waktu('dibuat').notNull(),
})

export const kunciData = pgTable('kunci_data', {
  kid: text('kid').primaryKey(),
  dibungkus: text('dibungkus').notNull(),
  dibuat: waktu('dibuat').notNull(),
})

export const dusun = pgTable('dusun', {
  id: text('id').primaryKey(),
  desaId: text('desa_id').notNull(),
  nomor: integer('nomor').notNull(),
  nama: text('nama').notNull(),
  kepalaDusun: text('kepala_dusun').notNull(),
  posyandu: text('posyandu').notNull(),
  rw: jsonb('rw').notNull(),
})

export const pengguna = pgTable('pengguna', {
  id: text('id').primaryKey(),
  desaId: text('desa_id').notNull(),
  nama: text('nama').notNull(),
  jabatan: text('jabatan').notNull(),
  peran: text('peran').notNull(),
  dusunId: text('dusun_id'),
  email: text('email').notNull(),
  nip: text('nip'),
  aktif: boolean('aktif').notNull(),
  kataSandiHash: text('kata_sandi_hash').notNull(),
  dibuat: waktu('dibuat').notNull(),
})

export const keluarga = pgTable('keluarga', {
  id: text('id').primaryKey(),
  desaId: text('desa_id').notNull(),
  nomorKkSandi: text('nomor_kk_sandi').notNull(),
  nomorKkIndeks: text('nomor_kk_indeks').notNull(),
  kepalaKeluargaId: text('kepala_keluarga_id').notNull(),
  dusunId: text('dusun_id').notNull(),
  rw: text('rw').notNull(),
  rt: text('rt').notNull(),
  tanggalTerbit: date('tanggal_terbit', { mode: 'string' }).notNull(),
})

export const penduduk = pgTable('penduduk', {
  id: text('id').primaryKey(),
  desaId: text('desa_id').notNull(),
  nikSandi: text('nik_sandi'),
  nikIndeks: text('nik_indeks'),
  nama: text('nama').notNull(),
  jenisKelamin: text('jenis_kelamin').notNull(),
  golonganDarah: text('golongan_darah').notNull(),
  agama: text('agama').notNull(),
  kewarganegaraan: text('kewarganegaraan').notNull(),
  tempatLahir: text('tempat_lahir').notNull(),
  tanggalLahir: date('tanggal_lahir', { mode: 'string' }).notNull(),
  nomorAktaLahir: text('nomor_akta_lahir'),
  keluargaId: text('keluarga_id').notNull(),
  hubunganKeluarga: text('hubungan_keluarga').notNull(),
  namaAyah: text('nama_ayah').notNull(),
  namaIbu: text('nama_ibu').notNull(),
  dusunId: text('dusun_id').notNull(),
  rw: text('rw').notNull(),
  rt: text('rt').notNull(),
  pendidikan: text('pendidikan'),
  pekerjaan: text('pekerjaan'),
  statusPerkawinan: text('status_perkawinan'),
  statusDasar: text('status_dasar').notNull(),
  statusPenduduk: text('status_penduduk').notNull(),
  ktpEl: text('ktp_el').notNull(),
  teleponSandi: text('telepon_sandi'),
  catatan: text('catatan'),
  dibuatPada: waktu('dibuat_pada').notNull(),
  diubahPada: waktu('diubah_pada').notNull(),
})

export const sesi = pgTable('sesi', {
  id: text('id').primaryKey(),
  desaId: text('desa_id').notNull(),
  penggunaId: text('pengguna_id').notNull(),
  jenis: text('jenis').notNull(),
  tokenHash: text('token_hash').notNull(),
  dibuat: waktu('dibuat').notNull(),
  terakhirAktif: waktu('terakhir_aktif').notNull(),
  kedaluwarsaMutlak: waktu('kedaluwarsa_mutlak').notNull(),
  dicabut: waktu('dicabut'),
})

export const jejakAudit = pgTable('jejak_audit', {
  id: text('id').primaryKey(),
  desaId: text('desa_id'),
  jenis: text('jenis').notNull(),
  pelaku: text('pelaku'),
  waktu: waktu('waktu').notNull(),
  ringkasan: jsonb('ringkasan').notNull(),
})

/** Tabel menurut nama SQL, dipakai uji meta. */
export const TABEL_SKEMA = {
  desa, alias_alamat: aliasAlamat, kunci_data: kunciData, dusun, pengguna, keluarga, penduduk, sesi, jejak_audit: jejakAudit,
} as const
