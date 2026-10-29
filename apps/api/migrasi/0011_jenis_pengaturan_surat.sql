-- 0011 jenis surat dan pengaturan surat (rencana 8F1): katalog jenis surat tiap desa dan satu baris pengaturan surat per desa.
-- Dijalankan oleh sinfodes_migrasi. Jenis bawaan Sinfodes tidak pernah bisa dihapus atau diarsipkan, bahkan bila aplikasi lupa
-- memeriksanya; kolom yang tak boleh berubah sesudah dibuat (kode, subjek, asal) ditutup dengan hak kolom.

CREATE TABLE jenis_surat (
  -- Urutan sisip; menjaga urutan katalog. Tidak masuk jawaban API.
  urutan bigint GENERATED ALWAYS AS IDENTITY,
  id text PRIMARY KEY,
  desa_id text NOT NULL REFERENCES desa (id),
  kode text NOT NULL CHECK (kode ~ '^[A-Z]{2,5}$'),
  nama text NOT NULL,
  klasifikasi text NOT NULL CHECK (klasifikasi ~ '^[0-9]{3}([.][0-9]+)?$'),
  subjek text NOT NULL CHECK (subjek IN ('pemohon', 'kelahiran', 'kematian')),
  -- Isian tambahan, syarat, dan tata letak per jenis: bentuknya dijaga `jenisSuratSchema` kontrak di aplikasi (ditulis dan dibaca, gagal tertutup).
  isian jsonb NOT NULL CHECK (jsonb_typeof(isian) = 'array'),
  boleh_atas_nama boolean NOT NULL,
  wajib_paraf boolean NOT NULL,
  masa_berlaku_bulan integer CHECK (masa_berlaku_bulan IS NULL OR masa_berlaku_bulan >= 1),
  online boolean NOT NULL,
  syarat jsonb NOT NULL CHECK (jsonb_typeof(syarat) = 'array'),
  teks text NOT NULL,
  aktif boolean NOT NULL,
  asal text NOT NULL CHECK (asal IN ('bawaan', 'desa')),
  diarsipkan timestamptz,
  tata_letak jsonb CHECK (tata_letak IS NULL OR jsonb_typeof(tata_letak) = 'object'),
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  -- Kode unik per desa, termasuk terhadap jenis arsip (kode tidak dipakai ulang).
  UNIQUE (desa_id, kode),
  CHECK (diarsipkan IS NULL OR NOT aktif),
  CHECK (asal = 'desa' OR diarsipkan IS NULL)
);
CREATE INDEX jenis_surat_desa_urutan ON jenis_surat (desa_id, urutan);
COMMENT ON COLUMN jenis_surat.diarsipkan IS 'Waktu diarsipkan; jenis arsip tidak aktif dan tidak bisa diubah. Jenis bawaan tidak pernah diarsipkan.';

-- Satu baris per desa. Setiap PUT menulis kolomnya sendiri (tata letak, atau format nomor dan urutan), jadi dua PUT serentak tidak saling menimpa.
CREATE TABLE pengaturan_surat (
  desa_id text PRIMARY KEY REFERENCES desa (id),
  tata_letak jsonb NOT NULL CHECK (jsonb_typeof(tata_letak) = 'object'),
  -- Tidak punya rute pengubah di panel desa: tersemai 'tte' dan hanya pemilik skema yang bisa mengubahnya.
  mode_tanda_tangan text NOT NULL CHECK (mode_tanda_tangan IN ('tte', 'basah')),
  format_nomor text NOT NULL,
  urutan text NOT NULL CHECK (urutan IN ('per-tahun', 'per-jenis'))
);

ALTER TABLE jenis_surat ENABLE ROW LEVEL SECURITY;
ALTER TABLE jenis_surat FORCE ROW LEVEL SECURITY;
-- Kebijakan per perintah (bukan FOR ALL) supaya DELETE bisa memuat syarat tambahan: kebijakan permisif digabung dengan OR.
CREATE POLICY desa_baca ON jenis_surat FOR SELECT TO sinfodes_desa
  USING (desa_id = (SELECT nullif(current_setting('sinfodes.desa_id', true), '')));
CREATE POLICY desa_tambah ON jenis_surat FOR INSERT TO sinfodes_desa
  WITH CHECK (desa_id = (SELECT nullif(current_setting('sinfodes.desa_id', true), '')));
CREATE POLICY desa_ubah ON jenis_surat FOR UPDATE TO sinfodes_desa
  USING (desa_id = (SELECT nullif(current_setting('sinfodes.desa_id', true), '')))
  WITH CHECK (desa_id = (SELECT nullif(current_setting('sinfodes.desa_id', true), '')));
CREATE POLICY desa_hapus_buatan_sendiri ON jenis_surat FOR DELETE TO sinfodes_desa
  USING (asal = 'desa' AND desa_id = (SELECT nullif(current_setting('sinfodes.desa_id', true), '')));
CREATE POLICY pemilik_skema ON jenis_surat FOR ALL TO sinfodes_migrasi USING (true) WITH CHECK (true);

ALTER TABLE pengaturan_surat ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengaturan_surat FORCE ROW LEVEL SECURITY;
CREATE POLICY desa_sendiri ON pengaturan_surat FOR ALL TO sinfodes_desa
  USING (desa_id = (SELECT nullif(current_setting('sinfodes.desa_id', true), '')))
  WITH CHECK (desa_id = (SELECT nullif(current_setting('sinfodes.desa_id', true), '')));
CREATE POLICY pemilik_skema ON pengaturan_surat FOR ALL TO sinfodes_migrasi USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, DELETE ON jenis_surat TO sinfodes_desa;
-- Kolom yang bisa diubah rute (ubahJenisSuratSchema ditambah `diarsipkan` untuk arsip dan aktifkan lagi). Tidak termasuk
-- desa_id, kode, subjek, asal, dan dibuat_pada.
GRANT UPDATE (nama, klasifikasi, isian, boleh_atas_nama, wajib_paraf, masa_berlaku_bulan, online, syarat, teks, aktif, diarsipkan, tata_letak)
  ON jenis_surat TO sinfodes_desa;

GRANT SELECT, INSERT ON pengaturan_surat TO sinfodes_desa;
GRANT UPDATE (tata_letak, format_nomor, urutan) ON pengaturan_surat TO sinfodes_desa;

-- Kode desa di nomor surat diatur di halaman Penomoran. Kebijakan UPDATE desa dari 0006 sudah membatasi ke barisnya sendiri.
GRANT UPDATE (kode_surat) ON desa TO sinfodes_desa;
