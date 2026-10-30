-- 0013 tanda tangan, penerbitan, dan verifikasi surat (rencana 8F2b). Dijalankan oleh sinfodes_migrasi.
-- Isi: passphrase tanda tangan, hak kolom penerbitan pada permohonan, pemicu yang membekukan surat terbit, pencacah verifikasi
-- publik beserta fungsi SECURITY DEFINER-nya, dan jenis kunci baru untuk percobaan passphrase.

-- ------------------------------------------------------------------------------------------ passphrase tanda tangan
-- Satu passphrase per pengguna penanda tangan; hash argon2id saja. Passphrase mencegah tanda tangan lewat sesi yang dibiarkan
-- terbuka dan menjadi tanda niat; ia bukan rahasia yang berdiri sendiri (rencana 8F2b Ruling 2).
CREATE TABLE passphrase_tanda_tangan (
  pengguna_id text PRIMARY KEY REFERENCES pengguna (id),
  desa_id text NOT NULL REFERENCES desa (id),
  hash text NOT NULL CHECK (hash LIKE '$argon2id$%'),
  diatur_pada timestamptz NOT NULL
);

-- Pencacah verifikasi publik per desa (SPEC-V0.2 §3.4): kegagalan dalam jendela, dan waktu kunci. Hanya fungsi
-- verifikasi_surat (milik pemilik skema) yang menulisnya.
CREATE TABLE percobaan_verifikasi (
  desa_id text PRIMARY KEY REFERENCES desa (id),
  gagal_pada timestamptz[] NOT NULL DEFAULT '{}',
  terkunci_sampai timestamptz
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['passphrase_tanda_tangan', 'percobaan_verifikasi'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY desa_sendiri ON %I FOR ALL TO sinfodes_desa '
      || 'USING (desa_id = (SELECT nullif(current_setting(''sinfodes.desa_id'', true), ''''))) '
      || 'WITH CHECK (desa_id = (SELECT nullif(current_setting(''sinfodes.desa_id'', true), '''')))', t);
    EXECUTE format('CREATE POLICY pemilik_skema ON %I FOR ALL TO sinfodes_migrasi USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

GRANT SELECT, INSERT ON passphrase_tanda_tangan TO sinfodes_desa;
GRANT UPDATE (hash, diatur_pada) ON passphrase_tanda_tangan TO sinfodes_desa;
-- Peran desa hanya membaca pencacah (uji meta "tanpa konteks nol baris" membaca setiap tabel desa-privat); tidak ada tulis.
GRANT SELECT ON percobaan_verifikasi TO sinfodes_desa;

-- Percobaan passphrase memakai pengunci bertingkat yang sama dengan masuk (rencana 8F2b Ruling 3).
ALTER TABLE kunci_masuk_desa DROP CONSTRAINT kunci_masuk_desa_jenis_check;
ALTER TABLE kunci_masuk_desa ADD CONSTRAINT kunci_masuk_desa_jenis_check CHECK (jenis IN ('warga', 'panel', 'passphrase'));

-- ------------------------------------------------------------------------------------------ hak kolom penerbitan
-- Kolom penerbitan, pembatalan, dan serah terima kini boleh diubah peran desa; kebenarannya dijaga pemicu di bawah. Tidak ada
-- INSERT baru dan tidak ada DELETE.
GRANT UPDATE (terbit_nomor, terbit_tahun, terbit_urut, terbit_kode, terbit_pada, terbit_penandatangan, terbit_mode, terbit_berlaku_sampai,
              terbit_lembar_sandi, terbit_tata_letak, terbit_kop, hash_dokumen, tanda_tangan, pembatalan, diambil)
  ON permohonan TO sinfodes_desa;

-- ------------------------------------------------------------------------------------------ pemicu beku
-- Surat terbit tidak berubah lagi (SPEC-V0.3 §7.8). Pemicu berlaku untuk semua peran, termasuk pemilik skema: jalan pintas
-- pemeliharaan harus eksplisit (ALTER TABLE ... DISABLE TRIGGER), bukan kebetulan hak.
CREATE FUNCTION permohonan_beku() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  -- Satu-satunya kolom yang boleh berubah sesudah surat terbit: perpindahan ke Dibatalkan, tanda diambil, dan catatan petugas.
  kolom_boleh constant text[] := ARRAY['status', 'pembatalan', 'diambil', 'catatan_internal'];
BEGIN
  IF OLD.terbit_nomor IS NULL THEN
    IF NEW.terbit_nomor IS NOT NULL THEN
      IF NOT (OLD.status = 'perlu-ttd' AND OLD.tahap = 'tanda-tangan' AND NEW.status = 'selesai') THEN
        RAISE EXCEPTION 'Surat hanya bisa terbit dari tahap tanda tangan.' USING ERRCODE = 'check_violation';
      END IF;
    ELSIF NEW.hash_dokumen IS DISTINCT FROM OLD.hash_dokumen OR NEW.tanda_tangan IS DISTINCT FROM OLD.tanda_tangan THEN
      RAISE EXCEPTION 'Hash dan tanda tangan hanya bisa diisi saat surat terbit.' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - kolom_boleh) IS DISTINCT FROM (to_jsonb(OLD) - kolom_boleh) THEN
    RAISE EXCEPTION 'Surat yang sudah terbit tidak bisa diubah.' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT (NEW.status = OLD.status OR (OLD.status = 'selesai' AND NEW.status = 'dibatalkan')) THEN
    RAISE EXCEPTION 'Status surat terbit tidak bisa dikembalikan.' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.pembatalan IS DISTINCT FROM OLD.pembatalan THEN
    IF OLD.pembatalan IS NOT NULL THEN
      RAISE EXCEPTION 'Pembatalan tidak bisa diubah.' USING ERRCODE = 'check_violation';
    END IF;
    IF NOT (OLD.status = 'selesai' AND NEW.status = 'dibatalkan') THEN
      RAISE EXCEPTION 'Pembatalan hanya bisa diisi bersama perpindahan status ke Dibatalkan.' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF NEW.diambil IS DISTINCT FROM OLD.diambil AND OLD.diambil IS NOT NULL THEN
    RAISE EXCEPTION 'Surat hanya bisa ditandai diambil sekali.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER permohonan_beku BEFORE UPDATE ON permohonan FOR EACH ROW EXECUTE FUNCTION permohonan_beku();

-- ------------------------------------------------------------------------------------------ verifikasi publik
-- Peran sinfodes_publik tidak boleh membaca tabel permohonan; ia hanya boleh memanggil fungsi ini (rencana 8F2b Ruling 12-13).
-- Fungsi milik pemilik skema (kebijakan pemilik_skema meloloskan RLS) mencari kode di antara surat Selesai atau Dibatalkan desa
-- yang ditanya, mengembalikan hasil seminimal mungkin (tanpa NIP, id, lembar, alasan pembatalan, isian, atau alamat), dan
-- mengelola pencacah di dalam fungsi yang sama: sepuluh kode tidak ditemukan dalam sepuluh menit mengunci verifikasi desa itu
-- sepuluh menit. Satu kunci penasihat per desa menyerialkan pemeriksaan dan pencatatan, sehingga tebakan serentak tidak lolos
-- bersama sebelum hitungan naik. Ambang dan lama di bawah harus sama dengan BATAS_VERIFIKASI di kontrak (uji meta membandingkan).
CREATE FUNCTION verifikasi_surat(p_desa_id text, p_kode text, p_sekarang timestamptz)
RETURNS TABLE (
  hasil text, jenis_nama text, nomor text, terbit_pada timestamptz, nama text, penandatangan jsonb, status text,
  pembatalan_pada timestamptz, berlaku_sampai date
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  c_gagal constant integer := 10;
  c_jendela_detik constant integer := 600;
  c_kunci_detik constant integer := 600;
  v_cacah percobaan_verifikasi%ROWTYPE;
  v_ada boolean;
  v_baru timestamptz[];
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('verifikasi-surat:' || p_desa_id, 0));
  SELECT * INTO v_cacah FROM percobaan_verifikasi c WHERE c.desa_id = p_desa_id;
  IF FOUND AND v_cacah.terkunci_sampai IS NOT NULL AND v_cacah.terkunci_sampai > p_sekarang THEN
    hasil := 'terkunci';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT true, j.nama, p.terbit_nomor, p.terbit_pada, o.nama,
         jsonb_build_object('nama', p.terbit_penandatangan ->> 'nama', 'peran', p.terbit_penandatangan ->> 'peran'),
         p.status, (p.pembatalan ->> 'pada')::timestamptz, p.terbit_berlaku_sampai
    INTO v_ada, jenis_nama, nomor, terbit_pada, nama, penandatangan, status, pembatalan_pada, berlaku_sampai
    FROM permohonan p
    JOIN jenis_surat j ON j.id = p.jenis_id
    LEFT JOIN penduduk o ON o.id = coalesce(p.subjek_id, p.pemohon_id)
   WHERE p.desa_id = p_desa_id AND p.terbit_kode = p_kode AND p.status IN ('selesai', 'dibatalkan');
  IF v_ada THEN
    hasil := 'ditemukan';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Tidak ditemukan: catat sebagai percobaan salah desa yang ditanya (kode milik desa lain pun dihitung di sini).
  IF NOT EXISTS (SELECT 1 FROM desa d WHERE d.id = p_desa_id) THEN
    hasil := 'tidak-ada';
    RETURN NEXT;
    RETURN;
  END IF;
  v_baru := coalesce(
    (SELECT array_agg(t ORDER BY t) FROM unnest(v_cacah.gagal_pada) AS t WHERE t > p_sekarang - make_interval(secs => c_jendela_detik)),
    '{}'
  ) || p_sekarang;
  IF cardinality(v_baru) >= c_gagal THEN
    INSERT INTO percobaan_verifikasi AS c (desa_id, gagal_pada, terkunci_sampai)
      VALUES (p_desa_id, '{}', p_sekarang + make_interval(secs => c_kunci_detik))
      ON CONFLICT (desa_id) DO UPDATE SET gagal_pada = EXCLUDED.gagal_pada, terkunci_sampai = EXCLUDED.terkunci_sampai;
    hasil := 'terkunci';
  ELSE
    INSERT INTO percobaan_verifikasi AS c (desa_id, gagal_pada, terkunci_sampai)
      VALUES (p_desa_id, v_baru, NULL)
      ON CONFLICT (desa_id) DO UPDATE SET gagal_pada = EXCLUDED.gagal_pada, terkunci_sampai = EXCLUDED.terkunci_sampai;
    hasil := 'tidak-ada';
  END IF;
  RETURN NEXT;
END $$;

REVOKE ALL ON FUNCTION verifikasi_surat(text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verifikasi_surat(text, text, timestamptz) TO sinfodes_publik;
