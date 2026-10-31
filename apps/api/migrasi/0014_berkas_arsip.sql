-- 0014 berkas surat dan arsip surat masuk (rencana 8F3). Dijalankan oleh sinfodes_migrasi.
-- Isi: register surat masuk, isi berkas (foto syarat warga dan pindaian surat masuk) sebagai sandi di PostgreSQL, rujukan
-- permohonan pada kunci idempotensi, dan indeks arsip surat keluar. Kedua tabel baru hanya bertambah: peran desa tidak punya
-- UPDATE maupun DELETE.

-- ------------------------------------------------------------------------------------------ surat masuk
-- Satu baris per surat yang dicatat petugas. Nomor agenda berjalan per desa dan tahun terima; aplikasi menjaganya dengan kunci
-- penasihat, UNIQUE di bawah menjadi sabuk kedua. Metadata pindaian (nama dan ukuran) ada di sini; isinya di berkas_surat.
CREATE TABLE surat_masuk (
  id text PRIMARY KEY,
  desa_id text NOT NULL REFERENCES desa (id),
  -- Tahun tanggal terima, dasar penomoran agenda.
  tahun integer NOT NULL,
  no_agenda integer NOT NULL CHECK (no_agenda >= 1),
  diterima date NOT NULL,
  nomor text NOT NULL CHECK (char_length(nomor) BETWEEN 1 AND 100),
  tanggal_surat date NOT NULL,
  pengirim text NOT NULL CHECK (char_length(pengirim) BETWEEN 1 AND 150),
  perihal text NOT NULL CHECK (char_length(perihal) BETWEEN 1 AND 300),
  -- Daftar tujuan sama dengan TUJUAN_DISPOSISI di kontrak.
  disposisi_kepada text CHECK (disposisi_kepada IS NULL OR disposisi_kepada IN (
    'Kepala Desa', 'Sekretaris Desa', 'Kaur Keuangan', 'Kaur Umum dan Perencanaan', 'Kasi Pemerintahan', 'Kasi Kesejahteraan',
    'Kasi Pelayanan', 'Kepala Dusun'
  )),
  disposisi_instruksi text NOT NULL DEFAULT '' CHECK (char_length(disposisi_instruksi) <= 500),
  scan_nama text CHECK (scan_nama IS NULL OR char_length(scan_nama) BETWEEN 1 AND 100),
  scan_ukuran_kb integer CHECK (scan_ukuran_kb IS NULL OR scan_ukuran_kb >= 1),
  -- Potret pelaku {id, nama}: nama pengguna bisa berubah sesudahnya, catatan lama tidak ikut berubah.
  dicatat_oleh jsonb NOT NULL CHECK (jsonb_typeof(dicatat_oleh) = 'object'),
  dicatat_pada timestamptz NOT NULL,
  UNIQUE (desa_id, tahun, no_agenda),
  CONSTRAINT surat_masuk_tahun_sesuai CHECK (tahun = extract(year FROM diterima)::integer),
  CONSTRAINT surat_masuk_tanggal_berurut CHECK (tanggal_surat <= diterima),
  CONSTRAINT surat_masuk_disposisi_sesuai CHECK (disposisi_kepada IS NOT NULL OR disposisi_instruksi = ''),
  CONSTRAINT surat_masuk_scan_utuh CHECK ((scan_nama IS NULL) = (scan_ukuran_kb IS NULL)),
  -- Jaring pengaman salah ketik, bukan pencegah kebocoran: pola yang sama dengan PESAN_CATATAN_NIK di kontrak.
  CONSTRAINT surat_masuk_tanpa_nik CHECK (
    nomor !~ '(^|[^0-9])[0-9]{16}([^0-9]|$)'
    AND pengirim !~ '(^|[^0-9])[0-9]{16}([^0-9]|$)'
    AND perihal !~ '(^|[^0-9])[0-9]{16}([^0-9]|$)'
    AND disposisi_instruksi !~ '(^|[^0-9])[0-9]{16}([^0-9]|$)'
    AND coalesce(scan_nama, '') !~ '(^|[^0-9])[0-9]{16}([^0-9]|$)'
  )
);
CREATE INDEX surat_masuk_desa_diterima ON surat_masuk (desa_id, diterima, no_agenda);

-- ------------------------------------------------------------------------------------------ isi berkas
-- Foto syarat permohonan dan pindaian surat masuk. `isi` adalah sandi AES-256-GCM (biner), jadi tidak pernah polos di tabel;
-- `tipe` dan `ukuran_byte` hasil pemeriksaan server atas isi aslinya (bukan kiriman klien). Satu baris berpemilik tepat satu
-- permohonan (lampiran) atau satu surat masuk (scan).
CREATE TABLE berkas_surat (
  -- Untuk lampiran, sama dengan id lampiran pada permohonan.lampiran.
  id text PRIMARY KEY,
  desa_id text NOT NULL REFERENCES desa (id),
  jenis text NOT NULL CHECK (jenis IN ('lampiran', 'scan')),
  permohonan_id text REFERENCES permohonan (id),
  surat_masuk_id text REFERENCES surat_masuk (id),
  tipe text NOT NULL CHECK (tipe IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  -- Ukuran isi asli (sebelum disandikan); batas atas 5 MB sama dengan MAKS_SCAN_MB di kontrak.
  ukuran_byte integer NOT NULL CHECK (ukuran_byte BETWEEN 1 AND 5242880),
  isi bytea NOT NULL CHECK (octet_length(isi) > 0),
  dibuat timestamptz NOT NULL,
  CONSTRAINT berkas_surat_rujukan_sesuai CHECK (
    (jenis = 'lampiran' AND permohonan_id IS NOT NULL AND surat_masuk_id IS NULL)
    OR (jenis = 'scan' AND surat_masuk_id IS NOT NULL AND permohonan_id IS NULL)
  )
);
CREATE INDEX berkas_surat_permohonan ON berkas_surat (desa_id, permohonan_id) WHERE permohonan_id IS NOT NULL;
CREATE INDEX berkas_surat_surat_masuk ON berkas_surat (desa_id, surat_masuk_id) WHERE surat_masuk_id IS NOT NULL;
COMMENT ON COLUMN berkas_surat.isi IS 'Sandi biner (versi 0x01, kid, IV, tag, sandi) atas isi berkas; ruang berkas_surat.isi:<desa>:<id>.';

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['surat_masuk', 'berkas_surat'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY desa_sendiri ON %I FOR ALL TO sinfodes_desa '
      || 'USING (desa_id = (SELECT nullif(current_setting(''sinfodes.desa_id'', true), ''''))) '
      || 'WITH CHECK (desa_id = (SELECT nullif(current_setting(''sinfodes.desa_id'', true), '''')))', t);
    EXECUTE format('CREATE POLICY pemilik_skema ON %I FOR ALL TO sinfodes_migrasi USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

GRANT SELECT, INSERT ON surat_masuk TO sinfodes_desa;
GRANT SELECT, INSERT ON berkas_surat TO sinfodes_desa;

-- ------------------------------------------------------------------------------------------ idempotensi permohonan
-- Pengajuan warga memakai kunci kirim dari HP: rujukan hasilnya adalah permohonan, bukan mutasi (rencana 8F3 Ruling 6).
ALTER TABLE kunci_idempotensi ADD COLUMN permohonan_id text REFERENCES permohonan (id);
ALTER TABLE kunci_idempotensi ADD CONSTRAINT kunci_idempotensi_satu_rujukan CHECK (num_nonnulls(mutasi_id, permohonan_id) <= 1);
GRANT UPDATE (permohonan_id) ON kunci_idempotensi TO sinfodes_desa;

-- ------------------------------------------------------------------------------------------ arsip surat keluar
-- Surat keluar dibaca dari permohonan yang sudah terbit, disaring bulan terbit dan diurut waktu.
CREATE INDEX permohonan_desa_terbit ON permohonan (desa_id, terbit_pada) WHERE terbit_pada IS NOT NULL;
