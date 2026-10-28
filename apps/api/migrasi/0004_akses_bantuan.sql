-- 0004 akses bantuan (SPEC-V0.3 §8.6, §7.2, §7.9): desa memberi Tim Sinfodes akses lihat-saja sementara; Tim membuka panel lewat
-- tiket sekali pakai dari Konsol yang ditukar menjadi sesi bantuan; setiap halaman yang dibuka tercatat di jejak yang hanya
-- bisa ditambah. Dijalankan oleh sinfodes_migrasi.

-- ------------------------------------------------------------------------------------ platform (ditulis desa, dibaca Konsol)
-- Status akses. Pemberi disalin sebagai id dan nama (potret saat memberi), tanpa kunci asing ke pengguna desa.
CREATE TABLE akses_bantuan (
  id text PRIMARY KEY,
  desa_id text NOT NULL REFERENCES desa (id),
  diberi_oleh_id text NOT NULL,
  diberi_oleh_nama text NOT NULL,
  mulai timestamptz NOT NULL,
  sampai timestamptz NOT NULL,
  sembunyikan_data_pribadi boolean NOT NULL,
  dicabut timestamptz,
  CONSTRAINT akses_bantuan_rentang CHECK (sampai > mulai)
);
CREATE INDEX akses_bantuan_desa_mulai ON akses_bantuan (desa_id, mulai DESC);

-- Tiket sekali pakai: hanya hash token yang tersimpan. Pegawai Konsol penerbit disalin sebagai id dan nama.
CREATE TABLE tiket_bantuan (
  id text PRIMARY KEY,
  desa_id text NOT NULL REFERENCES desa (id),
  akses_id text NOT NULL REFERENCES akses_bantuan (id),
  token_hash text NOT NULL UNIQUE,
  oleh_id text NOT NULL,
  oleh_nama text NOT NULL,
  dibuat timestamptz NOT NULL,
  berlaku_sampai timestamptz NOT NULL,
  dipakai timestamptz
);
CREATE INDEX tiket_bantuan_akses ON tiket_bantuan (akses_id);

-- ------------------------------------------------------------------------------------ desa-privat
-- Sesi bantuan di alamat desa (cookie panel). Berakhir bila aksesnya dicabut atau habis; diperiksa di setiap permintaan.
CREATE TABLE sesi_bantuan (
  id text PRIMARY KEY,
  desa_id text NOT NULL REFERENCES desa (id),
  akses_id text NOT NULL REFERENCES akses_bantuan (id),
  token_hash text NOT NULL,
  oleh_id text NOT NULL,
  oleh_nama text NOT NULL,
  dibuat timestamptz NOT NULL,
  terakhir_aktif timestamptz NOT NULL,
  dicabut timestamptz,
  -- Unik per desa (indeks desa-privat selalu diawali desa_id); token acak 256 bit tidak mungkin bertabrakan antardesa.
  CONSTRAINT sesi_bantuan_hash UNIQUE (desa_id, token_hash)
);
CREATE INDEX sesi_bantuan_akses ON sesi_bantuan (desa_id, akses_id);

-- ------------------------------------------------------------------------------------ audit (hanya tambah)
-- Satu baris per halaman yang dibuka sesi bantuan. `urut` menjaga urutan walau waktunya sama. Tanpa NIK: jalur disamarkan di kode.
CREATE TABLE jejak_bantuan (
  urut bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  desa_id text NOT NULL REFERENCES desa (id),
  sesi_id text NOT NULL REFERENCES sesi_bantuan (id),
  jalur text NOT NULL,
  waktu timestamptz NOT NULL
);
CREATE INDEX jejak_bantuan_sesi ON jejak_bantuan (desa_id, sesi_id, waktu);

-- ------------------------------------------------------------------------------------------------ RLS
-- Keempatnya: desa hanya barisnya sendiri; pemilik skema terbuka supaya semai dan operasi tetap jalan di bawah FORCE.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['akses_bantuan', 'tiket_bantuan', 'sesi_bantuan', 'jejak_bantuan'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY desa_sendiri ON %I FOR ALL TO sinfodes_desa '
      || 'USING (desa_id = (SELECT nullif(current_setting(''sinfodes.desa_id'', true), ''''))) '
      || 'WITH CHECK (desa_id = (SELECT nullif(current_setting(''sinfodes.desa_id'', true), '''')))', t);
    EXECUTE format('CREATE POLICY pemilik_skema ON %I FOR ALL TO sinfodes_migrasi USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- Konsol membaca status akses semua desa (untuk menolak tiket bila belum ada akses) dan hanya menambah tiket.
CREATE POLICY konsol_baca ON akses_bantuan FOR SELECT TO sinfodes_konsol USING (true);
CREATE POLICY konsol_buat ON tiket_bantuan FOR INSERT TO sinfodes_konsol WITH CHECK (true);

-- ------------------------------------------------------------------------------------------------ hak
GRANT SELECT, INSERT ON akses_bantuan TO sinfodes_desa;
GRANT UPDATE (dicabut) ON akses_bantuan TO sinfodes_desa;
GRANT SELECT ON akses_bantuan TO sinfodes_konsol;

GRANT SELECT ON tiket_bantuan TO sinfodes_desa;
GRANT UPDATE (dipakai) ON tiket_bantuan TO sinfodes_desa;
GRANT INSERT ON tiket_bantuan TO sinfodes_konsol;

GRANT SELECT, INSERT, UPDATE ON sesi_bantuan TO sinfodes_desa;
GRANT SELECT, INSERT ON jejak_bantuan TO sinfodes_desa;
