-- 0012 permohonan surat dan riwayatnya (rencana 8F2a): satu baris per permohonan dengan seluruh keadaan alurnya, dan riwayat
-- kejadiannya yang hanya bertambah. Dijalankan oleh sinfodes_migrasi.
-- Kolom surat terbit (terbit_*, hash_dokumen, tanda_tangan, pembatalan, diambil) sudah ada, tetapi peran desa belum boleh
-- menulisnya: aksi tanda tangan, batal, dan serah terima datang di 8F2b bersama hak dan pemicu bekunya (migrasi 0013). Kolom
-- itu disiapkan sekarang karena penyemaian tambah-saja tidak bisa mengisi ulang baris yang sudah ada.

CREATE TABLE permohonan (
  id text PRIMARY KEY,
  desa_id text NOT NULL REFERENCES desa (id),
  -- Mengikuti dusun pemohon saat permohonan dibuat dan tidak pernah berubah; dasar cakupan Kepala Dusun.
  dusun_id text NOT NULL REFERENCES dusun (id),
  -- Tahun masuk menurut WIB; nomor urut permohonan berjalan per desa dan tahun (kolom "No. urut" di daftar).
  tahun integer NOT NULL,
  no_urut integer NOT NULL CHECK (no_urut >= 1),
  -- RESTRICT: jenis yang pernah dipakai tidak bisa dihapus, hanya diarsipkan.
  jenis_id text NOT NULL REFERENCES jenis_surat (id) ON DELETE RESTRICT,
  kanal text NOT NULL CHECK (kanal IN ('online', 'loket')),
  pemohon_id text NOT NULL REFERENCES penduduk (id),
  -- Bayi (kelahiran) atau almarhum (kematian) bila bukan pemohon.
  subjek_id text REFERENCES penduduk (id),
  mutasi_id text REFERENCES mutasi (id),
  -- Peta isian surat sebagai satu sandi (JSON). Isian jenis buatan desa bisa memuat nomor apa pun, jadi tidak pernah polos.
  isian_sandi text NOT NULL CHECK (isian_sandi LIKE 'v1.%'),
  status text NOT NULL CHECK (status IN ('menunggu', 'diproses', 'perlu-ttd', 'selesai', 'ditolak', 'dibatalkan')),
  tahap text CHECK (tahap IN ('paraf', 'tanda-tangan')),
  -- Catatan petugas {oleh, pada, catatan}: bentuknya dijaga `permohonanSchema` kontrak di aplikasi (ditulis dan dibaca, gagal tertutup).
  dikembalikan jsonb CHECK (dikembalikan IS NULL OR jsonb_typeof(dikembalikan) = 'object'),
  penolakan jsonb CHECK (penolakan IS NULL OR jsonb_typeof(penolakan) = 'object'),
  pembatalan jsonb CHECK (pembatalan IS NULL OR jsonb_typeof(pembatalan) = 'object'),
  diambil jsonb CHECK (diambil IS NULL OR jsonb_typeof(diambil) = 'object'),
  masuk_pada timestamptz NOT NULL,
  -- Waktu selesai ditandatangani atau ditolak; tetap terisi bila surat kemudian dibatalkan.
  ditutup_pada timestamptz,
  lampiran jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(lampiran) = 'array'),
  catatan_internal text,
  -- Surat terbit, dibekukan saat ditandatangani (8F2b).
  terbit_nomor text,
  terbit_tahun integer,
  terbit_urut integer CHECK (terbit_urut IS NULL OR terbit_urut >= 1),
  terbit_kode text,
  terbit_pada timestamptz,
  terbit_penandatangan jsonb CHECK (terbit_penandatangan IS NULL OR jsonb_typeof(terbit_penandatangan) = 'object'),
  terbit_mode text CHECK (terbit_mode IS NULL OR terbit_mode IN ('tte', 'basah')),
  terbit_berlaku_sampai date,
  -- Lembar surat beku memuat NIK, jadi disandikan seperti isian.
  terbit_lembar_sandi text CHECK (terbit_lembar_sandi IS NULL OR terbit_lembar_sandi LIKE 'v1.%'),
  terbit_tata_letak jsonb CHECK (terbit_tata_letak IS NULL OR jsonb_typeof(terbit_tata_letak) = 'object'),
  terbit_kop jsonb CHECK (terbit_kop IS NULL OR jsonb_typeof(terbit_kop) = 'object'),
  -- Untuk colokan Penandatangan (8F2b); kosong pada surat tersemai.
  hash_dokumen text,
  tanda_tangan text,
  UNIQUE (desa_id, tahun, no_urut),
  CONSTRAINT permohonan_tahap_sesuai CHECK ((status = 'perlu-ttd') = (tahap IS NOT NULL)),
  -- Surat terbit bila dan hanya bila Selesai atau Dibatalkan (surat yang dibatalkan tetap membawa surat terbitnya).
  CONSTRAINT permohonan_terbit_sesuai CHECK (
    num_nonnulls(terbit_nomor, terbit_tahun, terbit_urut, terbit_kode, terbit_pada, terbit_penandatangan, terbit_mode,
                 terbit_lembar_sandi, terbit_tata_letak, terbit_kop)
      = CASE WHEN status IN ('selesai', 'dibatalkan') THEN 10 ELSE 0 END
    AND (terbit_berlaku_sampai IS NULL OR status IN ('selesai', 'dibatalkan'))
    AND (diambil IS NULL OR status IN ('selesai', 'dibatalkan'))
  ),
  CONSTRAINT permohonan_penolakan_sesuai CHECK ((status = 'ditolak') = (penolakan IS NOT NULL)),
  CONSTRAINT permohonan_pembatalan_sesuai CHECK ((status = 'dibatalkan') = (pembatalan IS NOT NULL)),
  CONSTRAINT permohonan_tutup_sesuai CHECK ((status IN ('selesai', 'ditolak', 'dibatalkan')) = (ditutup_pada IS NOT NULL)),
  -- Jaring pengaman salah ketik, bukan pencegah kebocoran: 16 angka berurutan di teks bebas ditolak. Pola yang sama dengan
  -- PESAN_CATATAN_NIK di kontrak (angka bersela spasi lolos; sesi bantuan menyamarkan berdasarkan isi).
  CONSTRAINT permohonan_catatan_tanpa_nik CHECK (
    coalesce(catatan_internal, '') !~ '(^|[^0-9])[0-9]{16}([^0-9]|$)'
    AND coalesce(dikembalikan ->> 'catatan', '') !~ '(^|[^0-9])[0-9]{16}([^0-9]|$)'
    AND coalesce(penolakan ->> 'catatan', '') !~ '(^|[^0-9])[0-9]{16}([^0-9]|$)'
    AND coalesce(pembatalan ->> 'catatan', '') !~ '(^|[^0-9])[0-9]{16}([^0-9]|$)'
  )
);
-- Nomor surat tidak ganda per jenis dan tahun; kode verifikasi tidak ganda per desa (pencarian publik memakai kode).
CREATE UNIQUE INDEX permohonan_nomor_terbit ON permohonan (desa_id, jenis_id, terbit_tahun, terbit_urut) WHERE terbit_urut IS NOT NULL;
CREATE UNIQUE INDEX permohonan_kode_terbit ON permohonan (desa_id, terbit_kode) WHERE terbit_kode IS NOT NULL;
CREATE INDEX permohonan_desa_status ON permohonan (desa_id, status, masuk_pada);
CREATE INDEX permohonan_desa_pemohon ON permohonan (desa_id, pemohon_id);
CREATE INDEX permohonan_desa_subjek ON permohonan (desa_id, subjek_id);
CREATE INDEX permohonan_desa_dusun ON permohonan (desa_id, dusun_id);
COMMENT ON COLUMN permohonan.isian_sandi IS 'Peta isian surat, satu sandi (v1.). Tidak pernah dicari lewat SQL.';
COMMENT ON COLUMN permohonan.terbit_lembar_sandi IS 'Lembar surat beku (memuat NIK), satu sandi (v1.). Diisi 8F2b.';

-- Riwayat kejadian satu permohonan. Hanya bertambah; `urutan` menjaga urutan kejadian walau waktunya sama.
CREATE TABLE riwayat_surat (
  urutan bigint GENERATED ALWAYS AS IDENTITY,
  id text PRIMARY KEY,
  desa_id text NOT NULL REFERENCES desa (id),
  permohonan_id text NOT NULL REFERENCES permohonan (id),
  kejadian text NOT NULL CHECK (kejadian IN (
    'diajukan', 'dibuat', 'disimpan', 'proses', 'tolak', 'ajukan-ttd', 'paraf', 'kembalikan', 'tandatangani', 'batalkan', 'tandai-diambil', 'kirim-wa'
  )),
  waktu timestamptz NOT NULL,
  -- Potret pelaku {id, nama, peran}: nama pengguna bisa berubah sesudahnya, catatan lama tidak ikut berubah.
  oleh jsonb NOT NULL CHECK (jsonb_typeof(oleh) = 'object'),
  catatan text CHECK (catatan IS NULL OR catatan !~ '(^|[^0-9])[0-9]{16}([^0-9]|$)')
);
CREATE INDEX riwayat_surat_permohonan ON riwayat_surat (desa_id, permohonan_id, urutan);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['permohonan', 'riwayat_surat'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY desa_sendiri ON %I FOR ALL TO sinfodes_desa '
      || 'USING (desa_id = (SELECT nullif(current_setting(''sinfodes.desa_id'', true), ''''))) '
      || 'WITH CHECK (desa_id = (SELECT nullif(current_setting(''sinfodes.desa_id'', true), '''')))', t);
    EXECUTE format('CREATE POLICY pemilik_skema ON %I FOR ALL TO sinfodes_migrasi USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

GRANT SELECT ON permohonan TO sinfodes_desa;
-- Kolom surat terbit, pembatalan, dan serah terima belum ditulis peran desa (8F2b).
GRANT INSERT (id, desa_id, dusun_id, tahun, no_urut, jenis_id, kanal, pemohon_id, subjek_id, mutasi_id, isian_sandi, status, tahap,
              dikembalikan, penolakan, masuk_pada, ditutup_pada, lampiran, catatan_internal)
  ON permohonan TO sinfodes_desa;
-- Hanya keadaan alur dan isiannya yang berubah; dusun, jenis, pemohon, kanal, nomor urut, dan waktu masuk tetap seumur permohonan.
GRANT UPDATE (isian_sandi, status, tahap, dikembalikan, penolakan, ditutup_pada, catatan_internal) ON permohonan TO sinfodes_desa;

GRANT SELECT, INSERT ON riwayat_surat TO sinfodes_desa;
