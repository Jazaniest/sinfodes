import { tanggalIsoWib } from '@sinfodes/kontrak/format/tanggal'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import type { Penyandi } from '../kripto/penyandi'
import { ruang } from '../kripto/ruang'
import type { BarisSisip, PembuatJson } from './peta-desa'

const json = (sql: PembuatJson, nilai: unknown) => sql.json(nilai as never)
const jsonAtauNull = (sql: PembuatJson, nilai: unknown) => (nilai === null || nilai === undefined ? null : json(sql, nilai))

/**
 * Permohonan surat dunia demo. Isian dan lembar beku disandikan sebagai satu sandi tiap baris (ruang per desa); `tahun` adalah
 * tahun masuk menurut WIB. Surat yang sudah terbit (Selesai dan Dibatalkan) dibawa lengkap dengan kolom `terbit_*` karena
 * penyemaian tambah-saja tidak bisa mengisinya belakangan. `hash_dokumen` dan `tanda_tangan` kosong: surat demo tidak
 * bertanda tangan elektronik sungguhan.
 */
export const petaPermohonan = (sql: PembuatJson, db: DbDemo, penyandi: Penyandi): BarisSisip[] =>
  db.permohonan.map((p) => {
    const t = p.terbit
    return {
      id: p.id,
      desa_id: p.desaId,
      dusun_id: p.dusunId,
      tahun: Number(tanggalIsoWib(new Date(p.masukPada)).slice(0, 4)),
      no_urut: p.noUrut,
      jenis_id: p.jenisId,
      kanal: p.kanal,
      pemohon_id: p.pemohonId,
      subjek_id: p.subjekId,
      mutasi_id: p.mutasiId,
      isian_sandi: penyandi.sandikan(JSON.stringify(p.isian), ruang.permohonanIsian(p.desaId)),
      status: p.status,
      tahap: p.tahap,
      dikembalikan: jsonAtauNull(sql, p.dikembalikan),
      penolakan: jsonAtauNull(sql, p.penolakan),
      pembatalan: jsonAtauNull(sql, p.pembatalan),
      diambil: jsonAtauNull(sql, p.diambil),
      masuk_pada: new Date(p.masukPada),
      ditutup_pada: p.ditutupPada ? new Date(p.ditutupPada) : null,
      lampiran: json(sql, p.lampiran),
      catatan_internal: p.catatanInternal,
      terbit_nomor: t?.nomor ?? null,
      terbit_tahun: t?.tahun ?? null,
      terbit_urut: t?.urut ?? null,
      terbit_kode: t?.kodeVerifikasi ?? null,
      terbit_pada: t ? new Date(t.pada) : null,
      terbit_penandatangan: t ? json(sql, t.penandatangan) : null,
      terbit_mode: t?.mode ?? null,
      terbit_berlaku_sampai: t?.berlakuSampai ?? null,
      terbit_lembar_sandi: t ? penyandi.sandikan(JSON.stringify(t.lembar), ruang.permohonanLembar(p.desaId)) : null,
      terbit_tata_letak: t ? json(sql, t.tataLetak) : null,
      terbit_kop: t ? json(sql, t.kop) : null,
      hash_dokumen: null,
      tanda_tangan: null,
    }
  })

/** Riwayat tiap permohonan menurut urutan di dunia demo; kolom `urutan` (identitas) menjaga urutan kejadian. */
export const petaRiwayatSurat = (sql: PembuatJson, db: DbDemo): BarisSisip[] =>
  db.permohonan.flatMap((p) =>
    p.riwayat.map((r) => ({
      id: r.id,
      desa_id: p.desaId,
      permohonan_id: p.id,
      kejadian: r.kejadian,
      waktu: new Date(r.waktu),
      oleh: json(sql, r.oleh),
      catatan: r.catatan,
    })),
  )
