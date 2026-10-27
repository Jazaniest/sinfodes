-- 0002 identitas (SPEC-V0.3 §7.3, §8): akun dan sesi warga (desa-privat), akun dan sesi kabupaten dan Konsol (lintas desa,
-- dipisah dengan hak tabel per peran), serta pengunci percobaan masuk. Dijalankan oleh sinfodes_migrasi.

-- ------------------------------------------------------------------------------------ desa-privat (warga)
CREATE TABLE akun_warga (
  penduduk_id text PRIMARY KEY REFERENCES penduduk (id),
  desa_id text NOT NULL REFERENCES desa (id),
  pin_hash text NOT NULL,
  -- Nomor WhatsApp disandikan di aplikasi (ruang `akun_warga.whatsapp:<desaId>`), seperti telepon penduduk.
  whatsapp_sandi text NOT NULL,
  diubah timestamptz NOT NULL
);
CREATE INDEX akun_warga_desa ON akun_warga (desa_id);

-- Sesi warga: 30 hari menganggur (bergeser), tanpa batas mutlak (SPEC-V0.3 §8.2).
CREATE TABLE sesi_warga (
  id text PRIMARY KEY,
  desa_id text NOT NULL REFERENCES desa (id),
  penduduk_id text NOT NULL REFERENCES penduduk (id),
  token_hash text NOT NULL,
  dibuat timestamptz NOT NULL,
  terakhir_aktif timestamptz NOT NULL,
  dicabut timestamptz,
  -- Unik per desa (indeks desa-privat selalu diawali desa_id); token acak 256 bit tidak mungkin bertabrakan antardesa.
  CONSTRAINT sesi_warga_hash UNIQUE (desa_id, token_hash)
);
CREATE INDEX sesi_warga_desa_penduduk ON sesi_warga (desa_id, penduduk_id);

-- Pengunci percobaan masuk warga (kunci = indeks HMAC NIK) dan panel (kunci = indeks HMAC email), per desa.
CREATE TABLE kunci_masuk_desa (
  desa_id text NOT NULL REFERENCES desa (id),
  jenis text NOT NULL CHECK (jenis IN ('warga', 'panel')),
  kunci text NOT NULL,
  gagal integer NOT NULL DEFAULT 0,
  kali_terkunci integer NOT NULL DEFAULT 0,
  terkunci_sampai timestamptz,
  diubah timestamptz NOT NULL,
  PRIMARY KEY (desa_id, jenis, kunci)
);

-- ------------------------------------------------------------------------------------ platform: kabupaten
CREATE TABLE kabupaten_mitra (
  kode text PRIMARY KEY,
  nama text NOT NULL,
  label text NOT NULL UNIQUE,
  provinsi_kode text NOT NULL,
  provinsi_nama text NOT NULL,
  bergabung date NOT NULL,
  surat_penunjukan jsonb NOT NULL,
  dibuat timestamptz NOT NULL
);

CREATE TABLE pengguna_kabupaten (
  id text PRIMARY KEY,
  kabupaten_kode text NOT NULL REFERENCES kabupaten_mitra (kode),
  nama text NOT NULL,
  jabatan text NOT NULL,
  peran text NOT NULL CHECK (peran IN ('admin', 'peninjau')),
  email text NOT NULL CHECK (email = lower(email)),
  aktif boolean NOT NULL,
  kata_sandi_hash text NOT NULL,
  dibuat timestamptz NOT NULL
);
CREATE UNIQUE INDEX pengguna_kabupaten_email ON pengguna_kabupaten (kabupaten_kode, email);

CREATE TABLE sesi_kabupaten (
  id text PRIMARY KEY,
  pengguna_id text NOT NULL REFERENCES pengguna_kabupaten (id),
  kabupaten_kode text NOT NULL REFERENCES kabupaten_mitra (kode),
  token_hash text NOT NULL UNIQUE,
  dibuat timestamptz NOT NULL,
  terakhir_aktif timestamptz NOT NULL,
  kedaluwarsa_mutlak timestamptz NOT NULL,
  dicabut timestamptz
);
CREATE INDEX sesi_kabupaten_pengguna ON sesi_kabupaten (pengguna_id);

-- ------------------------------------------------------------------------------------ platform: Konsol
CREATE TABLE pengguna_konsol (
  id text PRIMARY KEY,
  nama text NOT NULL,
  jabatan text NOT NULL,
  peran text NOT NULL CHECK (peran IN ('tim')),
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  aktif boolean NOT NULL DEFAULT true,
  kata_sandi_hash text NOT NULL,
  -- Rahasia TOTP 20 bita, disandikan di aplikasi (ruang `pengguna_konsol.totp`); kosong = belum didaftarkan.
  totp_rahasia_sandi text,
  -- Langkah 30 detik terakhir yang diterima: kode yang sama tidak bisa dipakai dua kali.
  totp_langkah_terakhir bigint,
  dibuat timestamptz NOT NULL
);

CREATE TABLE sesi_konsol (
  id text PRIMARY KEY,
  pengguna_id text NOT NULL REFERENCES pengguna_konsol (id),
  token_hash text NOT NULL UNIQUE,
  dibuat timestamptz NOT NULL,
  terakhir_aktif timestamptz NOT NULL,
  kedaluwarsa_mutlak timestamptz NOT NULL,
  dicabut timestamptz
);
CREATE INDEX sesi_konsol_pengguna ON sesi_konsol (pengguna_id);

-- Pengunci percobaan masuk Konsol dan kabupaten (kunci = indeks HMAC email, kabupaten bersama kodenya).
CREATE TABLE kunci_masuk_platform (
  jenis text NOT NULL CHECK (jenis IN ('konsol', 'kabupaten')),
  kunci text NOT NULL,
  gagal integer NOT NULL DEFAULT 0,
  kali_terkunci integer NOT NULL DEFAULT 0,
  terkunci_sampai timestamptz,
  diubah timestamptz NOT NULL,
  PRIMARY KEY (jenis, kunci)
);

-- ------------------------------------------------------------------------------------------------ RLS
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['akun_warga', 'sesi_warga', 'kunci_masuk_desa'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY desa_sendiri ON %I FOR ALL TO sinfodes_desa '
      || 'USING (desa_id = (SELECT nullif(current_setting(''sinfodes.desa_id'', true), ''''))) '
      || 'WITH CHECK (desa_id = (SELECT nullif(current_setting(''sinfodes.desa_id'', true), '''')))', t);
    EXECUTE format('CREATE POLICY pemilik_skema ON %I FOR ALL TO sinfodes_migrasi USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- Konsol dan kabupaten berbagi satu tabel pengunci, tetapi tiap peran hanya melihat dan menulis barisnya sendiri.
ALTER TABLE kunci_masuk_platform ENABLE ROW LEVEL SECURITY;
ALTER TABLE kunci_masuk_platform FORCE ROW LEVEL SECURITY;
CREATE POLICY konsol_sendiri ON kunci_masuk_platform FOR ALL TO sinfodes_konsol USING (jenis = 'konsol') WITH CHECK (jenis = 'konsol');
CREATE POLICY kabupaten_sendiri ON kunci_masuk_platform FOR ALL TO sinfodes_kabupaten USING (jenis = 'kabupaten') WITH CHECK (jenis = 'kabupaten');
CREATE POLICY pemilik_skema ON kunci_masuk_platform FOR ALL TO sinfodes_migrasi USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------------------------ hak
GRANT SELECT, INSERT, UPDATE ON akun_warga, sesi_warga TO sinfodes_desa;
GRANT SELECT, INSERT, UPDATE, DELETE ON kunci_masuk_desa TO sinfodes_desa;

GRANT SELECT ON kabupaten_mitra TO sinfodes_kabupaten, sinfodes_publik;
GRANT SELECT ON pengguna_kabupaten TO sinfodes_kabupaten;
GRANT SELECT, INSERT, UPDATE ON sesi_kabupaten TO sinfodes_kabupaten;

GRANT SELECT ON pengguna_konsol TO sinfodes_konsol;
GRANT UPDATE (totp_langkah_terakhir) ON pengguna_konsol TO sinfodes_konsol;
GRANT SELECT, INSERT, UPDATE ON sesi_konsol TO sinfodes_konsol;

GRANT SELECT, INSERT, UPDATE, DELETE ON kunci_masuk_platform TO sinfodes_konsol, sinfodes_kabupaten;
