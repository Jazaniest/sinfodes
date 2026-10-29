import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { pengaturanBawaan } from '@sinfodes/kontrak/surat/pengaturan-bawaan'
import type { BarisSisip, PembuatJson } from './peta-desa'

const json = (sql: PembuatJson, nilai: unknown) => sql.json(nilai as never)

/** Katalog jenis surat tiap desa. Urutan sisip = urutan `db.jenisSurat`, jadi kolom `urutan` (identitas) menjaga urutan katalog. */
export const petaJenisSurat = (sql: PembuatJson, db: DbDemo): BarisSisip[] =>
  db.jenisSurat.map((j) => ({
    id: j.id,
    desa_id: j.desaId,
    kode: j.kode,
    nama: j.nama,
    klasifikasi: j.klasifikasi,
    subjek: j.subjek,
    isian: json(sql, j.isian),
    boleh_atas_nama: j.bolehAtasNama,
    wajib_paraf: j.wajibParaf,
    masa_berlaku_bulan: j.masaBerlakuBulan,
    online: j.online,
    syarat: json(sql, j.syarat),
    teks: j.teks,
    aktif: j.aktif,
    asal: j.asal,
    diarsipkan: j.diarsipkan ? new Date(j.diarsipkan) : null,
    tata_letak: j.tataLetak ? json(sql, j.tataLetak) : null,
  }))

/** Satu baris pengaturan surat per desa; desa yang belum punya di dunia demo memakai `pengaturanBawaan` (pola tiruan: dibuat saat dibutuhkan). */
export const petaPengaturanSurat = (sql: PembuatJson, db: DbDemo): BarisSisip[] =>
  db.desa.map((d) => {
    const p = db.pengaturanSurat.find((x) => x.desaId === d.id) ?? pengaturanBawaan(d.id)
    return {
      desa_id: d.id,
      tata_letak: json(sql, p.tataLetak),
      mode_tanda_tangan: p.modeTandaTangan,
      format_nomor: p.formatNomor,
      urutan: p.urutan,
    }
  })
