-- 0003 audit platform: jejak masuk Konsol dan kabupaten (tidak terikat satu desa). Hanya tambah: peran aplikasi tidak punya
-- UPDATE, DELETE, maupun SELECT (SPEC-V0.3 §7.9). Tanpa NIK, email polos, atau rahasia.
CREATE TABLE jejak_audit_platform (
  id text PRIMARY KEY,
  jenis text NOT NULL,
  pelaku text,
  waktu timestamptz NOT NULL,
  ringkasan jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX jejak_audit_platform_waktu ON jejak_audit_platform (waktu);

GRANT INSERT ON jejak_audit_platform TO sinfodes_konsol, sinfodes_kabupaten;
