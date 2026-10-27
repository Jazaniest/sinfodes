-- 0001 dasar (SPEC-V0.3 §7): hak bawaan tertutup, tabel platform, tabel desa-privat dengan RLS paksa, sesi, jejak audit.
-- Dijalankan oleh sinfodes_migrasi (pemilik skema). Peran aplikasi dibuat oleh `db:siapkan`, bukan di sini.

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO sinfodes_desa, sinfodes_kabupaten, sinfodes_konsol, sinfodes_publik;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- ---------------------------------------------------------------------------------------------- platform
CREATE TABLE desa (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  nama text NOT NULL,
  kode_desa text NOT NULL,
  kecamatan_kode text NOT NULL,
  kecamatan_nama text NOT NULL,
  kabupaten_kode text NOT NULL,
  kabupaten_nama text NOT NULL,
  provinsi_kode text NOT NULL,
  provinsi_nama text NOT NULL,
  kode_pos text NOT NULL,
  alamat_kantor text NOT NULL,
  surel text NOT NULL,
  telepon text NOT NULL,
  jam_layanan jsonb NOT NULL,
  luas_km2 numeric,
  batas jsonb,
  istilah_wilayah jsonb NOT NULL,
  kode_surat text NOT NULL,
  lambang text,
  lambang_kabupaten text,
  status text NOT NULL CHECK (status IN ('Uji coba', 'Persiapan', 'Aktif', 'Ditangguhkan')),
  -- Sementara di 8C: dipindah ke tabel pengaturan modul (8G) dan tema (8H).
  modul jsonb NOT NULL DEFAULT '{"kesehatan": false}',
  warna_aksen text NOT NULL,
  tampilan_warga jsonb,
  dibuat timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE alias_alamat (
  label text PRIMARY KEY CHECK (label ~ '^[a-z0-9-]+$'),
  desa_id text NOT NULL REFERENCES desa (id),
  dibuat timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX alias_alamat_desa ON alias_alamat (desa_id);

-- Kunci data (32 bita) yang dibungkus kunci utama; kunci polos tidak pernah masuk basis data.
CREATE TABLE kunci_data (
  kid text PRIMARY KEY CHECK (kid ~ '^[a-z0-9_-]{1,16}$'),
  dibungkus text NOT NULL,
  dibuat timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------------------ desa-privat
CREATE TABLE dusun (
  id text PRIMARY KEY,
  desa_id text NOT NULL REFERENCES desa (id),
  nomor integer NOT NULL CHECK (nomor >= 1),
  nama text NOT NULL,
  kepala_dusun text NOT NULL,
  posyandu text NOT NULL,
  rw jsonb NOT NULL
);
CREATE UNIQUE INDEX dusun_desa_nomor ON dusun (desa_id, nomor);

CREATE TABLE pengguna (
  id text PRIMARY KEY,
  desa_id text NOT NULL REFERENCES desa (id),
  nama text NOT NULL,
  jabatan text NOT NULL,
  peran text NOT NULL CHECK (peran IN ('operator', 'sekdes', 'kades', 'kaur-keuangan', 'kadus')),
  dusun_id text REFERENCES dusun (id),
  email text NOT NULL CHECK (email = lower(email)),
  nip text,
  aktif boolean NOT NULL DEFAULT true,
  kata_sandi_hash text NOT NULL,
  dibuat timestamptz NOT NULL DEFAULT now(),
  CHECK (peran <> 'kadus' OR dusun_id IS NOT NULL)
);
CREATE UNIQUE INDEX pengguna_desa_email ON pengguna (desa_id, email);

CREATE TABLE keluarga (
  id text PRIMARY KEY,
  desa_id text NOT NULL REFERENCES desa (id),
  nomor_kk_sandi text NOT NULL,
  nomor_kk_indeks text NOT NULL,
  kepala_keluarga_id text NOT NULL,
  dusun_id text NOT NULL REFERENCES dusun (id),
  rw text NOT NULL,
  rt text NOT NULL,
  tanggal_terbit date NOT NULL
);
CREATE UNIQUE INDEX keluarga_desa_kk ON keluarga (desa_id, nomor_kk_indeks);
CREATE INDEX keluarga_desa_dusun ON keluarga (desa_id, dusun_id);

CREATE TABLE penduduk (
  id text PRIMARY KEY,
  desa_id text NOT NULL REFERENCES desa (id),
  nik_sandi text,
  nik_indeks text,
  nama text NOT NULL,
  jenis_kelamin text NOT NULL,
  golongan_darah text NOT NULL,
  agama text NOT NULL,
  kewarganegaraan text NOT NULL,
  tempat_lahir text NOT NULL,
  tanggal_lahir date NOT NULL,
  nomor_akta_lahir text,
  keluarga_id text NOT NULL REFERENCES keluarga (id),
  hubungan_keluarga text NOT NULL,
  nama_ayah text NOT NULL,
  nama_ibu text NOT NULL,
  dusun_id text NOT NULL REFERENCES dusun (id),
  rw text NOT NULL,
  rt text NOT NULL,
  pendidikan text,
  pekerjaan text,
  status_perkawinan text,
  status_dasar text NOT NULL,
  status_penduduk text NOT NULL,
  ktp_el text NOT NULL,
  telepon_sandi text,
  catatan text,
  dibuat_pada timestamptz NOT NULL,
  diubah_pada timestamptz NOT NULL
);
CREATE UNIQUE INDEX penduduk_desa_nik ON penduduk (desa_id, nik_indeks) WHERE nik_indeks IS NOT NULL;
CREATE INDEX penduduk_desa_keluarga ON penduduk (desa_id, keluarga_id);
CREATE INDEX penduduk_desa_dusun ON penduduk (desa_id, dusun_id);
CREATE INDEX penduduk_desa_status ON penduduk (desa_id, status_dasar);

ALTER TABLE keluarga ADD CONSTRAINT keluarga_kepala_fk
  FOREIGN KEY (kepala_keluarga_id) REFERENCES penduduk (id) DEFERRABLE INITIALLY DEFERRED;

-- ----------------------------------------------------------------------------------------------- sesi
CREATE TABLE sesi (
  id text PRIMARY KEY,
  desa_id text NOT NULL REFERENCES desa (id),
  pengguna_id text NOT NULL REFERENCES pengguna (id),
  jenis text NOT NULL CHECK (jenis IN ('panel')),
  token_hash text NOT NULL UNIQUE,
  dibuat timestamptz NOT NULL,
  terakhir_aktif timestamptz NOT NULL,
  kedaluwarsa_mutlak timestamptz NOT NULL,
  dicabut timestamptz
);
CREATE INDEX sesi_desa_pengguna ON sesi (desa_id, pengguna_id);

-- ---------------------------------------------------------------------------------------- jejak audit
-- Hanya tambah: peran aplikasi tidak punya UPDATE, DELETE, maupun SELECT (SPEC-V0.3 §7.9). Tanpa NIK atau rahasia.
CREATE TABLE jejak_audit (
  id text PRIMARY KEY,
  desa_id text REFERENCES desa (id),
  jenis text NOT NULL,
  pelaku text,
  waktu timestamptz NOT NULL,
  ringkasan jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX jejak_audit_desa_waktu ON jejak_audit (desa_id, waktu);

-- ------------------------------------------------------------------------------------------------ RLS
-- Kebijakan membandingkan desa_id dengan konteks transaksi (`sinfodes.desa_id`); tanpa konteks, nol baris (SPEC-V0.3 §7.4).
-- Pemilik skema punya kebijakan terbuka supaya semai dan operasi tetap bisa jalan di bawah FORCE ROW LEVEL SECURITY.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['dusun', 'pengguna', 'keluarga', 'penduduk', 'sesi', 'jejak_audit'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY desa_sendiri ON %I FOR ALL TO sinfodes_desa '
      || 'USING (desa_id = (SELECT nullif(current_setting(''sinfodes.desa_id'', true), ''''))) '
      || 'WITH CHECK (desa_id = (SELECT nullif(current_setting(''sinfodes.desa_id'', true), '''')))', t);
    EXECUTE format('CREATE POLICY pemilik_skema ON %I FOR ALL TO sinfodes_migrasi USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------------------------ hak
GRANT SELECT ON desa TO sinfodes_desa, sinfodes_kabupaten, sinfodes_konsol, sinfodes_publik;
GRANT SELECT ON alias_alamat TO sinfodes_desa, sinfodes_publik;
GRANT SELECT ON kunci_data TO sinfodes_desa;
GRANT SELECT, INSERT, UPDATE, DELETE ON dusun, pengguna, keluarga, penduduk TO sinfodes_desa;
GRANT SELECT, INSERT, UPDATE ON sesi TO sinfodes_desa;
GRANT INSERT ON jejak_audit TO sinfodes_desa;
