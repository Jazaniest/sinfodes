-- 0009 kunci idempotensi (rencana 8E2 Tugas 8, SPEC-V0.3 §5.4 butir 4): POST yang membuat mutasi menerima header `Idempotency-Key`;
-- permintaan ulang dengan kunci yang sama mengembalikan hasil pertama dan tidak membuat ganda. Tabel ini hanya menyimpan sidik
-- isi (SHA-256) dan rujukan ke mutasi yang tercipta, bukan salinan jawaban: jawaban ulang dibentuk dari mutasi itu, jadi NIK dan
-- telepon pendatang tidak pernah tersalin ke sini. Dipesan dan diperbarui dalam transaksi permintaan yang sama dengan penulisan
-- mutasi, jadi permintaan yang gagal tidak meninggalkan kunci. Pembersihan kunci lama menunggu antrean kerja.

CREATE TABLE kunci_idempotensi (
  desa_id text NOT NULL REFERENCES desa (id),
  pengguna_id text NOT NULL,
  kunci text NOT NULL CHECK (kunci ~ '^[A-Za-z0-9_-]{8,64}$'),
  jalur text NOT NULL,
  sidik_isi text NOT NULL,
  mutasi_id text REFERENCES mutasi (id),
  dibuat timestamptz NOT NULL,
  PRIMARY KEY (desa_id, pengguna_id, kunci)
);

ALTER TABLE kunci_idempotensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE kunci_idempotensi FORCE ROW LEVEL SECURITY;
CREATE POLICY desa_sendiri ON kunci_idempotensi FOR ALL TO sinfodes_desa
  USING (desa_id = (SELECT nullif(current_setting('sinfodes.desa_id', true), '')))
  WITH CHECK (desa_id = (SELECT nullif(current_setting('sinfodes.desa_id', true), '')));
CREATE POLICY pemilik_skema ON kunci_idempotensi FOR ALL TO sinfodes_migrasi USING (true) WITH CHECK (true);

GRANT SELECT, INSERT ON kunci_idempotensi TO sinfodes_desa;
GRANT UPDATE (mutasi_id) ON kunci_idempotensi TO sinfodes_desa;
