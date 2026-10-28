-- 0006 desa menulis istilah wilayahnya sendiri (rencana 8E1 Ruling 12). `desa` adalah tabel platform yang selama ini hanya dibaca
-- semua peran aplikasi. Pengaturan Wilayah desa mengubah "Dusun/RW/RT" (atau "Jorong", dst.), jadi peran desa mendapat satu hak
-- kolom. Karena `desa` tidak punya `desa_id`, pagarnya RLS per peran seperti tabel akses bantuan (0004): semua peran membaca
-- semua desa (alamat, kabupaten, dan Konsol memerlukannya), peran desa hanya boleh mengubah baris desanya sendiri, dan hanya kolom
-- `istilah_wilayah`. Identitas lain (nama, status, slug, modul) tetap hanya bisa diubah pemilik skema dan, kelak, Konsol (8J).

ALTER TABLE desa ENABLE ROW LEVEL SECURITY;
ALTER TABLE desa FORCE ROW LEVEL SECURITY;

CREATE POLICY baca_semua ON desa FOR SELECT TO sinfodes_desa, sinfodes_kabupaten, sinfodes_konsol, sinfodes_publik USING (true);
CREATE POLICY ubah_istilah_sendiri ON desa FOR UPDATE TO sinfodes_desa
  USING (id = (SELECT nullif(current_setting('sinfodes.desa_id', true), '')))
  WITH CHECK (id = (SELECT nullif(current_setting('sinfodes.desa_id', true), '')));
CREATE POLICY pemilik_skema ON desa FOR ALL TO sinfodes_migrasi USING (true) WITH CHECK (true);

GRANT UPDATE (istilah_wilayah) ON desa TO sinfodes_desa;
