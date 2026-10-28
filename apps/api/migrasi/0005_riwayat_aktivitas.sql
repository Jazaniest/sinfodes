-- 0005 riwayat dan aktivitas (rencana 8E1): riwayat perubahan data penduduk, Buku hari ini, dan urutan anggota dalam KK.
-- Dijalankan oleh sinfodes_migrasi. Kedua tabel hanya tambah: peran desa tidak punya UPDATE maupun DELETE.

-- Urutan anggota dalam KK: kepala di depan, anggota baru di belakang. Semai mengisinya dari urutan demo (SPEC-V0.3 §8E1 Ruling 4).
ALTER TABLE penduduk ADD COLUMN urutan_kk smallint NOT NULL DEFAULT 0;

CREATE TABLE riwayat_penduduk (
  id text PRIMARY KEY,
  desa_id text NOT NULL REFERENCES desa (id),
  penduduk_id text NOT NULL REFERENCES penduduk (id),
  field text NOT NULL CHECK (field IN (
    'nik', 'nama', 'jenisKelamin', 'golonganDarah', 'agama', 'kewarganegaraan', 'tempatLahir', 'tanggalLahir',
    'nomorAktaLahir', 'hubunganKeluarga', 'namaAyah', 'namaIbu', 'pendidikan', 'pekerjaan', 'statusPerkawinan',
    'statusPenduduk', 'ktpEl', 'telepon', 'catatan'
  )),
  -- Nilai NIK dan telepon disalin apa adanya seperti pada API tiruan; sesi bantuan menyamarkannya di serializer (§8.6).
  nilai_lama text,
  nilai_baru text,
  oleh_id text NOT NULL,
  oleh_nama text NOT NULL,
  waktu timestamptz NOT NULL
);
CREATE INDEX riwayat_penduduk_desa_penduduk ON riwayat_penduduk (desa_id, penduduk_id, waktu);

CREATE TABLE aktivitas (
  id text PRIMARY KEY,
  desa_id text NOT NULL REFERENCES desa (id),
  -- Untuk membatasi Kepala Dusun; null berarti kejadian tingkat desa.
  dusun_id text REFERENCES dusun (id),
  waktu timestamptz NOT NULL,
  jenis text NOT NULL CHECK (jenis IN (
    'mutasi-lahir', 'mutasi-meninggal', 'mutasi-pindah', 'mutasi-datang', 'penduduk-ubah', 'penduduk-tambah',
    'keluarga-pecah', 'keluarga-ganti-kepala', 'penduduk-ekspor', 'penduduk-impor', 'laporan-diterapkan', 'laporan-ditolak',
    'permohonan-masuk', 'surat-terbit', 'surat-ditolak', 'surat-dibatalkan',
    'pengaduan-masuk', 'pengaduan-dibalas', 'pengaduan-selesai', 'pengaduan-dibuka'
  )),
  ringkasan text NOT NULL CHECK (ringkasan <> ''),
  oleh_id text,
  oleh_nama text,
  rujukan_jenis text CHECK (rujukan_jenis IN ('penduduk', 'keluarga', 'permohonan', 'pengaduan')),
  rujukan_id text,
  CHECK ((oleh_id IS NULL) = (oleh_nama IS NULL)),
  CHECK ((rujukan_jenis IS NULL) = (rujukan_id IS NULL))
);
CREATE INDEX aktivitas_desa_waktu ON aktivitas (desa_id, waktu);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['riwayat_penduduk', 'aktivitas'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY desa_sendiri ON %I FOR ALL TO sinfodes_desa '
      || 'USING (desa_id = (SELECT nullif(current_setting(''sinfodes.desa_id'', true), ''''))) '
      || 'WITH CHECK (desa_id = (SELECT nullif(current_setting(''sinfodes.desa_id'', true), '''')))', t);
    EXECUTE format('CREATE POLICY pemilik_skema ON %I FOR ALL TO sinfodes_migrasi USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

GRANT SELECT, INSERT ON riwayat_penduduk, aktivitas TO sinfodes_desa;
