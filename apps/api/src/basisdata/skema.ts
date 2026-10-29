import { bigint, boolean, date, integer, jsonb, numeric, pgTable, primaryKey, smallint, text, timestamp } from 'drizzle-orm/pg-core'

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
  /** Urutan anggota dalam KK: kepala di depan, anggota baru di belakang (rencana 8E1 Ruling 4). */
  urutanKk: smallint('urutan_kk').notNull().default(0),
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

export const akunWarga = pgTable('akun_warga', {
  pendudukId: text('penduduk_id').primaryKey(),
  desaId: text('desa_id').notNull(),
  pinHash: text('pin_hash').notNull(),
  whatsappSandi: text('whatsapp_sandi').notNull(),
  diubah: waktu('diubah').notNull(),
})

export const sesiWarga = pgTable('sesi_warga', {
  id: text('id').primaryKey(),
  desaId: text('desa_id').notNull(),
  pendudukId: text('penduduk_id').notNull(),
  tokenHash: text('token_hash').notNull(),
  dibuat: waktu('dibuat').notNull(),
  terakhirAktif: waktu('terakhir_aktif').notNull(),
  dicabut: waktu('dicabut'),
})

export const kunciMasukDesa = pgTable(
  'kunci_masuk_desa',
  {
    desaId: text('desa_id').notNull(),
    jenis: text('jenis').notNull(),
    kunci: text('kunci').notNull(),
    gagal: integer('gagal').notNull(),
    kaliTerkunci: integer('kali_terkunci').notNull(),
    terkunciSampai: waktu('terkunci_sampai'),
    diubah: waktu('diubah').notNull(),
  },
  (t) => [primaryKey({ columns: [t.desaId, t.jenis, t.kunci] })],
)

export const kabupatenMitra = pgTable('kabupaten_mitra', {
  kode: text('kode').primaryKey(),
  nama: text('nama').notNull(),
  label: text('label').notNull(),
  provinsiKode: text('provinsi_kode').notNull(),
  provinsiNama: text('provinsi_nama').notNull(),
  bergabung: date('bergabung', { mode: 'string' }).notNull(),
  suratPenunjukan: jsonb('surat_penunjukan').notNull(),
  dibuat: waktu('dibuat').notNull(),
})

export const penggunaKabupaten = pgTable('pengguna_kabupaten', {
  id: text('id').primaryKey(),
  kabupatenKode: text('kabupaten_kode').notNull(),
  nama: text('nama').notNull(),
  jabatan: text('jabatan').notNull(),
  peran: text('peran').notNull(),
  email: text('email').notNull(),
  aktif: boolean('aktif').notNull(),
  kataSandiHash: text('kata_sandi_hash').notNull(),
  dibuat: waktu('dibuat').notNull(),
})

export const sesiKabupaten = pgTable('sesi_kabupaten', {
  id: text('id').primaryKey(),
  penggunaId: text('pengguna_id').notNull(),
  kabupatenKode: text('kabupaten_kode').notNull(),
  tokenHash: text('token_hash').notNull(),
  dibuat: waktu('dibuat').notNull(),
  terakhirAktif: waktu('terakhir_aktif').notNull(),
  kedaluwarsaMutlak: waktu('kedaluwarsa_mutlak').notNull(),
  dicabut: waktu('dicabut'),
})

export const penggunaKonsol = pgTable('pengguna_konsol', {
  id: text('id').primaryKey(),
  nama: text('nama').notNull(),
  jabatan: text('jabatan').notNull(),
  peran: text('peran').notNull(),
  email: text('email').notNull(),
  aktif: boolean('aktif').notNull(),
  kataSandiHash: text('kata_sandi_hash').notNull(),
  totpRahasiaSandi: text('totp_rahasia_sandi'),
  totpLangkahTerakhir: bigint('totp_langkah_terakhir', { mode: 'number' }),
  dibuat: waktu('dibuat').notNull(),
})

export const sesiKonsol = pgTable('sesi_konsol', {
  id: text('id').primaryKey(),
  penggunaId: text('pengguna_id').notNull(),
  tokenHash: text('token_hash').notNull(),
  dibuat: waktu('dibuat').notNull(),
  terakhirAktif: waktu('terakhir_aktif').notNull(),
  kedaluwarsaMutlak: waktu('kedaluwarsa_mutlak').notNull(),
  dicabut: waktu('dicabut'),
})

export const kunciMasukPlatform = pgTable(
  'kunci_masuk_platform',
  {
    jenis: text('jenis').notNull(),
    kunci: text('kunci').notNull(),
    gagal: integer('gagal').notNull(),
    kaliTerkunci: integer('kali_terkunci').notNull(),
    terkunciSampai: waktu('terkunci_sampai'),
    diubah: waktu('diubah').notNull(),
  },
  (t) => [primaryKey({ columns: [t.jenis, t.kunci] })],
)

export const jejakAuditPlatform = pgTable('jejak_audit_platform', {
  id: text('id').primaryKey(),
  jenis: text('jenis').notNull(),
  pelaku: text('pelaku'),
  waktu: waktu('waktu').notNull(),
  ringkasan: jsonb('ringkasan').notNull(),
})

/** Status akses bantuan Tim Sinfodes (SPEC-V0.3 §8.6). Platform: ditulis desa, dibaca Konsol. */
export const aksesBantuan = pgTable('akses_bantuan', {
  id: text('id').primaryKey(),
  desaId: text('desa_id').notNull(),
  diberiOlehId: text('diberi_oleh_id').notNull(),
  diberiOlehNama: text('diberi_oleh_nama').notNull(),
  mulai: waktu('mulai').notNull(),
  sampai: waktu('sampai').notNull(),
  sembunyikanDataPribadi: boolean('sembunyikan_data_pribadi').notNull(),
  dicabut: waktu('dicabut'),
})

export const tiketBantuan = pgTable('tiket_bantuan', {
  id: text('id').primaryKey(),
  desaId: text('desa_id').notNull(),
  aksesId: text('akses_id').notNull(),
  tokenHash: text('token_hash').notNull(),
  olehId: text('oleh_id').notNull(),
  olehNama: text('oleh_nama').notNull(),
  dibuat: waktu('dibuat').notNull(),
  berlakuSampai: waktu('berlaku_sampai').notNull(),
  dipakai: waktu('dipakai'),
})

export const sesiBantuan = pgTable('sesi_bantuan', {
  id: text('id').primaryKey(),
  desaId: text('desa_id').notNull(),
  aksesId: text('akses_id').notNull(),
  tokenHash: text('token_hash').notNull(),
  olehId: text('oleh_id').notNull(),
  olehNama: text('oleh_nama').notNull(),
  dibuat: waktu('dibuat').notNull(),
  terakhirAktif: waktu('terakhir_aktif').notNull(),
  dicabut: waktu('dicabut'),
})

export const jejakBantuan = pgTable('jejak_bantuan', {
  urut: bigint('urut', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  desaId: text('desa_id').notNull(),
  sesiId: text('sesi_id').notNull(),
  jalur: text('jalur').notNull(),
  waktu: waktu('waktu').notNull(),
})

/** Tabel menurut nama SQL, dipakai uji meta. */
export const riwayatPenduduk = pgTable('riwayat_penduduk', {
  id: text('id').primaryKey(),
  desaId: text('desa_id').notNull(),
  pendudukId: text('penduduk_id').notNull(),
  field: text('field').notNull(),
  nilaiLama: text('nilai_lama'),
  nilaiBaru: text('nilai_baru'),
  olehId: text('oleh_id').notNull(),
  olehNama: text('oleh_nama').notNull(),
  waktu: waktu('waktu').notNull(),
})

export const aktivitas = pgTable('aktivitas', {
  id: text('id').primaryKey(),
  desaId: text('desa_id').notNull(),
  dusunId: text('dusun_id'),
  waktu: waktu('waktu').notNull(),
  jenis: text('jenis').notNull(),
  ringkasan: text('ringkasan').notNull(),
  olehId: text('oleh_id'),
  olehNama: text('oleh_nama'),
  rujukanJenis: text('rujukan_jenis'),
  rujukanId: text('rujukan_id'),
})

/** Peristiwa kependudukan (8E2); hanya tambah. `rincian` dijaga `mutasiSchema` kontrak di aplikasi. */
export const mutasi = pgTable('mutasi', {
  id: text('id').primaryKey(),
  desaId: text('desa_id').notNull(),
  jenis: text('jenis').notNull(),
  tanggal: date('tanggal', { mode: 'string' }).notNull(),
  dicatatOlehId: text('dicatat_oleh_id').notNull(),
  dicatatOlehNama: text('dicatat_oleh_nama').notNull(),
  dicatatPada: waktu('dicatat_pada').notNull(),
  rincian: jsonb('rincian').notNull().$type<Record<string, unknown>>(),
})

export const mutasiPenduduk = pgTable(
  'mutasi_penduduk',
  {
    mutasiId: text('mutasi_id').notNull(),
    pendudukId: text('penduduk_id').notNull(),
    desaId: text('desa_id').notNull(),
    urutan: smallint('urutan').notNull(),
  },
  (t) => [primaryKey({ columns: [t.mutasiId, t.pendudukId] })],
)

/** Laporan dari warga. `isi` dijaga `isiLaporanSchema`; nilai telepon di dalamnya tersandi (migrasi 0008). */
export const laporanData = pgTable('laporan_data', {
  id: text('id').primaryKey(),
  desaId: text('desa_id').notNull(),
  dusunId: text('dusun_id').notNull(),
  dibuatPada: waktu('dibuat_pada').notNull(),
  pelaporPendudukId: text('pelapor_penduduk_id').notNull(),
  pelaporNama: text('pelapor_nama').notNull(),
  status: text('status').notNull(),
  ditanganiOlehId: text('ditangani_oleh_id'),
  ditanganiOlehNama: text('ditangani_oleh_nama'),
  ditanganiPada: waktu('ditangani_pada'),
  ditanganiAlasan: text('ditangani_alasan'),
  lampiranBerkas: text('lampiran_berkas'),
  lampiranUkuranKb: integer('lampiran_ukuran_kb'),
  isi: jsonb('isi').notNull().$type<Record<string, unknown>>(),
})

/** Kunci idempotensi POST mutasi (8E2 Tugas 8): hanya sidik isi dan rujukan ke mutasi, tanpa salinan jawaban. */
export const kunciIdempotensi = pgTable(
  'kunci_idempotensi',
  {
    desaId: text('desa_id').notNull(),
    penggunaId: text('pengguna_id').notNull(),
    kunci: text('kunci').notNull(),
    jalur: text('jalur').notNull(),
    sidikIsi: text('sidik_isi').notNull(),
    mutasiId: text('mutasi_id'),
    dibuat: waktu('dibuat').notNull(),
  },
  (t) => [primaryKey({ columns: [t.desaId, t.penggunaId, t.kunci] })],
)

/** Sesi impor penduduk (8E3 Tugas 6): isi berkas yang diunggah, tersandi seluruhnya, antara unggah dan konfirmasi. */
export const imporPenduduk = pgTable('impor_penduduk', {
  id: text('id').primaryKey(),
  desaId: text('desa_id').notNull(),
  dicatatOlehId: text('dicatat_oleh_id').notNull(),
  namaBerkas: text('nama_berkas').notNull(),
  dibuatPada: waktu('dibuat_pada').notNull(),
  jumlahBaris: integer('jumlah_baris').notNull(),
  isi: text('isi'),
  selesaiPada: waktu('selesai_pada'),
})

/**
 * Katalog jenis surat tiap desa (8F1). `isian`, `syarat`, dan `tataLetak` dijaga `jenisSuratSchema` kontrak di aplikasi (ditulis dan
 * dibaca, gagal tertutup). `urutan` (identitas) menjaga urutan katalog dan tidak masuk jawaban. Peran desa tidak bisa mengubah
 * `kode`, `subjek`, `asal`, dan tidak bisa menghapus jenis bawaan (migrasi 0011).
 */
export const jenisSurat = pgTable('jenis_surat', {
  urutan: bigint('urutan', { mode: 'number' }).generatedAlwaysAsIdentity(),
  id: text('id').primaryKey(),
  desaId: text('desa_id').notNull(),
  kode: text('kode').notNull(),
  nama: text('nama').notNull(),
  klasifikasi: text('klasifikasi').notNull(),
  subjek: text('subjek').notNull(),
  isian: jsonb('isian').notNull().$type<unknown[]>(),
  bolehAtasNama: boolean('boleh_atas_nama').notNull(),
  wajibParaf: boolean('wajib_paraf').notNull(),
  masaBerlakuBulan: integer('masa_berlaku_bulan'),
  online: boolean('online').notNull(),
  syarat: jsonb('syarat').notNull().$type<unknown[]>(),
  teks: text('teks').notNull(),
  aktif: boolean('aktif').notNull(),
  asal: text('asal').notNull(),
  diarsipkan: waktu('diarsipkan'),
  tataLetak: jsonb('tata_letak').$type<Record<string, unknown> | null>(),
  dibuatPada: waktu('dibuat_pada').notNull().defaultNow(),
})

/** Satu baris per desa (8F1). Tata letak dan penomoran masing-masing menulis kolomnya sendiri; `mode_tanda_tangan` tidak bisa diubah desa. */
export const pengaturanSurat = pgTable('pengaturan_surat', {
  desaId: text('desa_id').primaryKey(),
  tataLetak: jsonb('tata_letak').notNull().$type<Record<string, unknown>>(),
  modeTandaTangan: text('mode_tanda_tangan').notNull(),
  formatNomor: text('format_nomor').notNull(),
  urutan: text('urutan').notNull(),
})

/**
 * Permohonan surat (8F2a). Isian dan lembar beku disimpan sebagai satu sandi tiap baris; catatan petugas (`dikembalikan`,
 * `penolakan`, `pembatalan`, `diambil`, `lampiran`) dijaga `permohonanSchema` kontrak di aplikasi. Kolom `terbit_*`,
 * `pembatalan`, dan `diambil` belum ditulis peran desa sampai 8F2b (migrasi 0012).
 */
export const permohonan = pgTable('permohonan', {
  id: text('id').primaryKey(),
  desaId: text('desa_id').notNull(),
  dusunId: text('dusun_id').notNull(),
  tahun: integer('tahun').notNull(),
  noUrut: integer('no_urut').notNull(),
  jenisId: text('jenis_id').notNull(),
  kanal: text('kanal').notNull(),
  pemohonId: text('pemohon_id').notNull(),
  subjekId: text('subjek_id'),
  mutasiId: text('mutasi_id'),
  isianSandi: text('isian_sandi').notNull(),
  status: text('status').notNull(),
  tahap: text('tahap'),
  dikembalikan: jsonb('dikembalikan').$type<Record<string, unknown> | null>(),
  penolakan: jsonb('penolakan').$type<Record<string, unknown> | null>(),
  pembatalan: jsonb('pembatalan').$type<Record<string, unknown> | null>(),
  diambil: jsonb('diambil').$type<Record<string, unknown> | null>(),
  masukPada: waktu('masuk_pada').notNull(),
  ditutupPada: waktu('ditutup_pada'),
  lampiran: jsonb('lampiran').notNull().$type<unknown[]>(),
  catatanInternal: text('catatan_internal'),
  terbitNomor: text('terbit_nomor'),
  terbitTahun: integer('terbit_tahun'),
  terbitUrut: integer('terbit_urut'),
  terbitKode: text('terbit_kode'),
  terbitPada: waktu('terbit_pada'),
  terbitPenandatangan: jsonb('terbit_penandatangan').$type<Record<string, unknown> | null>(),
  terbitMode: text('terbit_mode'),
  terbitBerlakuSampai: date('terbit_berlaku_sampai', { mode: 'string' }),
  terbitLembarSandi: text('terbit_lembar_sandi'),
  terbitTataLetak: jsonb('terbit_tata_letak').$type<Record<string, unknown> | null>(),
  terbitKop: jsonb('terbit_kop').$type<Record<string, unknown> | null>(),
  hashDokumen: text('hash_dokumen'),
  tandaTangan: text('tanda_tangan'),
})

/**
 * Kolom `permohonan` yang boleh diisi peran desa saat sisip (hak kolom migrasi 0012). Khusus INSERT: Drizzle menyebut semua kolom
 * tabel dalam perintah sisip (yang tak diisi diberi DEFAULT), dan PostgreSQL menolak seluruh perintah bila satu kolom yang disebut
 * tak punya hak, walau nilainya DEFAULT. Tidak masuk `TABEL_SKEMA`: tabelnya sama dengan `permohonan`.
 */
export const permohonanSisip = pgTable('permohonan', {
  id: text('id').primaryKey(),
  desaId: text('desa_id').notNull(),
  dusunId: text('dusun_id').notNull(),
  tahun: integer('tahun').notNull(),
  noUrut: integer('no_urut').notNull(),
  jenisId: text('jenis_id').notNull(),
  kanal: text('kanal').notNull(),
  pemohonId: text('pemohon_id').notNull(),
  subjekId: text('subjek_id'),
  mutasiId: text('mutasi_id'),
  isianSandi: text('isian_sandi').notNull(),
  status: text('status').notNull(),
  tahap: text('tahap'),
  dikembalikan: jsonb('dikembalikan').$type<Record<string, unknown> | null>(),
  penolakan: jsonb('penolakan').$type<Record<string, unknown> | null>(),
  masukPada: waktu('masuk_pada').notNull(),
  ditutupPada: waktu('ditutup_pada'),
  lampiran: jsonb('lampiran').notNull().$type<unknown[]>(),
  catatanInternal: text('catatan_internal'),
})

/** Riwayat kejadian permohonan (8F2a); hanya tambah. `urutan` (identitas) menjaga urutan kejadian dan tidak masuk jawaban. */
export const riwayatSurat = pgTable('riwayat_surat', {
  urutan: bigint('urutan', { mode: 'number' }).generatedAlwaysAsIdentity(),
  id: text('id').primaryKey(),
  desaId: text('desa_id').notNull(),
  permohonanId: text('permohonan_id').notNull(),
  kejadian: text('kejadian').notNull(),
  waktu: waktu('waktu').notNull(),
  oleh: jsonb('oleh').notNull().$type<Record<string, unknown>>(),
  catatan: text('catatan'),
})

export const TABEL_SKEMA = {
  desa, alias_alamat: aliasAlamat, kunci_data: kunciData, dusun, pengguna, keluarga, penduduk, sesi, jejak_audit: jejakAudit,
  akun_warga: akunWarga, sesi_warga: sesiWarga, kunci_masuk_desa: kunciMasukDesa, kabupaten_mitra: kabupatenMitra,
  pengguna_kabupaten: penggunaKabupaten, sesi_kabupaten: sesiKabupaten, pengguna_konsol: penggunaKonsol, sesi_konsol: sesiKonsol,
  kunci_masuk_platform: kunciMasukPlatform, jejak_audit_platform: jejakAuditPlatform,
  akses_bantuan: aksesBantuan, tiket_bantuan: tiketBantuan, sesi_bantuan: sesiBantuan, jejak_bantuan: jejakBantuan,
  riwayat_penduduk: riwayatPenduduk, aktivitas, mutasi, mutasi_penduduk: mutasiPenduduk, laporan_data: laporanData,
  kunci_idempotensi: kunciIdempotensi, impor_penduduk: imporPenduduk, jenis_surat: jenisSurat, pengaturan_surat: pengaturanSurat,
  permohonan, riwayat_surat: riwayatSurat,
} as const
