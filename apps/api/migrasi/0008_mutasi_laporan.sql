-- 0008 mutasi dan laporan data (rencana 8E2): peristiwa kependudukan (lahir, meninggal, pindah, datang) dan laporan dari warga.
-- Dijalankan oleh sinfodes_migrasi. Mutasi hanya tambah (peran desa tanpa UPDATE dan DELETE). Laporan hanya berubah di lima kolom
-- penanganan; pembuatnya (portal warga) datang di 8G bersama hak INSERT-nya.

CREATE TABLE mutasi (
  id text PRIMARY KEY,
  desa_id text NOT NULL REFERENCES desa (id),
  jenis text NOT NULL CHECK (jenis IN ('lahir', 'meninggal', 'pindah', 'datang')),
  tanggal date NOT NULL,
  -- Potret pelaku: nama pengguna bisa berubah sesudahnya, catatan lama tidak ikut berubah.
  dicatat_oleh_id text NOT NULL,
  dicatat_oleh_nama text NOT NULL,
  dicatat_pada timestamptz NOT NULL,
  -- Rincian per jenis; bentuknya dijaga `mutasiSchema` kontrak di aplikasi (ditulis dan dibaca, gagal tertutup).
  rincian jsonb NOT NULL CHECK (jsonb_typeof(rincian) = 'object')
);
CREATE INDEX mutasi_desa_tanggal ON mutasi (desa_id, tanggal);

-- Penduduk yang terkena satu mutasi, berurutan menurut `urutan`. Dasar cakupan Kepala Dusun dan preset "Pendatang tahun ini".
CREATE TABLE mutasi_penduduk (
  mutasi_id text NOT NULL REFERENCES mutasi (id),
  penduduk_id text NOT NULL REFERENCES penduduk (id),
  desa_id text NOT NULL REFERENCES desa (id),
  urutan smallint NOT NULL,
  PRIMARY KEY (mutasi_id, penduduk_id)
);
CREATE INDEX mutasi_penduduk_desa_penduduk ON mutasi_penduduk (desa_id, penduduk_id);

CREATE TABLE laporan_data (
  id text PRIMARY KEY,
  desa_id text NOT NULL REFERENCES desa (id),
  -- Untuk membatasi Kepala Dusun.
  dusun_id text NOT NULL REFERENCES dusun (id),
  dibuat_pada timestamptz NOT NULL,
  pelapor_penduduk_id text NOT NULL REFERENCES penduduk (id),
  pelapor_nama text NOT NULL,
  status text NOT NULL CHECK (status IN ('baru', 'diterapkan', 'ditolak')),
  ditangani_oleh_id text,
  ditangani_oleh_nama text,
  ditangani_pada timestamptz,
  ditangani_alasan text,
  lampiran_berkas text,
  lampiran_ukuran_kb integer,
  -- Perbaikan satu field atau kelahiran, bentuknya dijaga `isiLaporanSchema`. Nilai telepon di sini tersandi (lihat CHECK).
  isi jsonb NOT NULL,
  CHECK ((ditangani_oleh_id IS NULL) = (ditangani_oleh_nama IS NULL) AND (ditangani_oleh_id IS NULL) = (ditangani_pada IS NULL)),
  CHECK ((status = 'baru') = (ditangani_pada IS NULL)),
  CHECK ((lampiran_berkas IS NULL) = (lampiran_ukuran_kb IS NULL)),
  CHECK (coalesce(isi ->> 'jenis', '') IN ('perbaikan', 'kelahiran')),
  -- NIK dan telepon tidak pernah polos di tabel mana pun (SPEC-V0.3 §7.6). Format sandi `v1.<kid>.<...>` ditetapkan kripto/penyandi.ts.
  CONSTRAINT laporan_nilai_sensitif_tersandi CHECK (
    NOT (isi ->> 'jenis' = 'perbaikan' AND isi ->> 'field' IN ('nik', 'telepon'))
    OR coalesce(isi ->> 'nilaiBaru', '') LIKE 'v1.%'
  )
);
CREATE INDEX laporan_data_desa_status ON laporan_data (desa_id, status);
COMMENT ON COLUMN laporan_data.isi IS 'Polos kecuali perbaikan field nik atau telepon: nilaiBaru tersandi (v1.).';

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['mutasi', 'mutasi_penduduk', 'laporan_data'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY desa_sendiri ON %I FOR ALL TO sinfodes_desa '
      || 'USING (desa_id = (SELECT nullif(current_setting(''sinfodes.desa_id'', true), ''''))) '
      || 'WITH CHECK (desa_id = (SELECT nullif(current_setting(''sinfodes.desa_id'', true), '''')))', t);
    EXECUTE format('CREATE POLICY pemilik_skema ON %I FOR ALL TO sinfodes_migrasi USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

GRANT SELECT, INSERT ON mutasi, mutasi_penduduk TO sinfodes_desa;
GRANT SELECT ON laporan_data TO sinfodes_desa;
GRANT UPDATE (status, ditangani_oleh_id, ditangani_oleh_nama, ditangani_pada, ditangani_alasan) ON laporan_data TO sinfodes_desa;
