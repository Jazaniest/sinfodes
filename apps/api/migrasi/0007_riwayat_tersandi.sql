-- 0007 nilai NIK dan telepon di Riwayat wajib tersandi (SPEC-V0.3 §7.6). Aplikasi menyandikan nilai kedua field itu sebelum
-- menulis; CHECK ini sabuk keduanya, supaya NIK atau nomor telepon polos tidak pernah masuk `riwayat_penduduk` (dan salinan
-- atau cadangannya) walau kode kelak keliru. Format sandi `v1.<kid>.<...>` ditetapkan `kripto/penyandi.ts`. Gagal bila sudah
-- ada baris polos: bersihkan lebih dulu, jangan dilonggarkan.

ALTER TABLE riwayat_penduduk ADD CONSTRAINT riwayat_nilai_sensitif_tersandi CHECK (
  field NOT IN ('nik', 'telepon')
  OR ((nilai_lama IS NULL OR nilai_lama LIKE 'v1.%') AND (nilai_baru IS NULL OR nilai_baru LIKE 'v1.%'))
);

COMMENT ON COLUMN riwayat_penduduk.nilai_lama IS 'Polos untuk field biasa; tersandi (v1.) untuk field nik dan telepon.';
COMMENT ON COLUMN riwayat_penduduk.nilai_baru IS 'Polos untuk field biasa; tersandi (v1.) untuk field nik dan telepon.';
