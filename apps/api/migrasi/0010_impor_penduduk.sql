-- 0010 impor penduduk (rencana 8E3 Tugas 6, SPEC-V0.2 §6.8): POST /impor/penduduk membaca berkas Excel atau CSV, dan konfirmasinya
-- (POST /impor/penduduk/:id/konfirmasi) hanya membawa pemetaan kolom, perbaikan, dan baris yang dilewati. Server harus mengingat
-- baris-barisnya di antara dua permintaan itu. Isinya memuat NIK dan telepon polos dari berkas, jadi seluruh tabel berkas disimpan
-- sebagai satu sandi (ruang `impor_penduduk.isi:<desa>`), tidak pernah polos di tabel mana pun. Sesi berlaku 24 jam dan dihapus
-- malas pada unggahan berikutnya desa itu (antrean kerja baru ada di tahap 8I). Setelah konfirmasi berhasil `isi` dikosongkan.

CREATE TABLE impor_penduduk (
  id text PRIMARY KEY,
  desa_id text NOT NULL REFERENCES desa (id),
  dicatat_oleh_id text NOT NULL,
  nama_berkas text NOT NULL,
  dibuat_pada timestamptz NOT NULL,
  jumlah_baris integer NOT NULL CHECK (jumlah_baris >= 0),
  -- Sandi `v1.<kid>.<...>` (kripto/penyandi.ts) dari JSON {kolom, baris}; kosong sesudah impor selesai.
  isi text,
  selesai_pada timestamptz,
  CHECK ((selesai_pada IS NULL) = (isi IS NOT NULL)),
  CONSTRAINT impor_isi_tersandi CHECK (isi IS NULL OR isi LIKE 'v1.%')
);
CREATE INDEX impor_penduduk_desa_dibuat ON impor_penduduk (desa_id, dibuat_pada);
COMMENT ON COLUMN impor_penduduk.isi IS 'Seluruh tabel berkas (kepala kolom dan baris) tersandi; NIK dan telepon polos hanya ada di dalam sandi.';

ALTER TABLE impor_penduduk ENABLE ROW LEVEL SECURITY;
ALTER TABLE impor_penduduk FORCE ROW LEVEL SECURITY;
CREATE POLICY desa_sendiri ON impor_penduduk FOR ALL TO sinfodes_desa
  USING (desa_id = (SELECT nullif(current_setting('sinfodes.desa_id', true), '')))
  WITH CHECK (desa_id = (SELECT nullif(current_setting('sinfodes.desa_id', true), '')));
CREATE POLICY pemilik_skema ON impor_penduduk FOR ALL TO sinfodes_migrasi USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, DELETE ON impor_penduduk TO sinfodes_desa;
GRANT UPDATE (isi, selesai_pada) ON impor_penduduk TO sinfodes_desa;
