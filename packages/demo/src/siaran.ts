import { formatTanggal } from '@sinfodes/kontrak/format/tanggal'
import { JENDELA_PERHATIAN_SIARAN_HARI, statusSiaranDesa, type DesaSiaran, type RingkasSiaran, type SasaranSiaran } from '@sinfodes/kontrak/kabupaten/siaran'
import type { Notifikasi } from '@sinfodes/kontrak/notifikasi/schema'
import { boleh } from '@sinfodes/kontrak/pengguna/hak-akses'
import type { Pengguna } from '@sinfodes/kontrak/pengguna/schema'
import type { Desa } from '@sinfodes/kontrak/wilayah/schema'
import { desaSasaranKabupaten } from './kabupaten-angka'
import type { BacaSiaran, DbDemo, SiaranKabupaten } from './tipe-db'

const urutDesa = (a: Desa, b: Desa) => a.kecamatan.nama.localeCompare(b.kecamatan.nama, 'id') || a.nama.localeCompare(b.nama, 'id')
const urutNama = (a: string, b: string) => a.localeCompare(b, 'id')

/**
 * Desa penerima dari sasaran yang dipilih Admin, diambil dari desa sasaran kabupaten itu (Aktif dan Uji coba), urut kecamatan
 * lalu nama. `'luar'` bila ada kode kecamatan atau ID desa yang bukan sasaran kabupaten itu: keberadaannya tidak dibocorkan.
 */
export function pilihDesaSasaran(sasaran: readonly Desa[], s: SasaranSiaran): Desa[] | 'luar' {
  if (s.jenis === 'semua') return [...sasaran].sort(urutDesa)
  if (s.jenis === 'kecamatan') {
    const kode = new Set(s.kode)
    if ([...kode].some((k) => !sasaran.some((d) => d.kecamatan.kode === k))) return 'luar'
    return sasaran.filter((d) => kode.has(d.kecamatan.kode)).sort(urutDesa)
  }
  const id = new Set(s.id)
  if ([...id].some((x) => !sasaran.some((d) => d.id === x))) return 'luar'
  return sasaran.filter((d) => id.has(d.id)).sort(urutDesa)
}

export const terjemahkanSasaran = (db: DbDemo, kabupatenKode: string, s: SasaranSiaran): Desa[] | 'luar' =>
  pilihDesaSasaran(desaSasaranKabupaten(db, kabupatenKode), s)

const bacaUntuk = (db: DbDemo, s: SiaranKabupaten): Map<string, BacaSiaran> =>
  new Map(db.bacaSiaran.filter((b) => b.siaranId === s.id && s.desaIds.includes(b.desaId)).map((b) => [b.desaId, b]))

/** Nama kecamatan atau desa yang dipilih, untuk kalimat sasaran; kosong untuk semua desa. */
function namaSasaran(db: DbDemo, s: SiaranKabupaten): string[] {
  if (s.sasaran.jenis === 'semua') return []
  const desa = db.desa.filter((d) => d.kabupaten.kode === s.kabupatenKode)
  if (s.sasaran.jenis === 'kecamatan') {
    const kode = new Set(s.sasaran.kode)
    return [...new Set(desa.filter((d) => kode.has(d.kecamatan.kode)).map((d) => d.kecamatan.nama))].sort(urutNama)
  }
  const id = new Set(s.sasaran.id)
  return desa.filter((d) => id.has(d.id)).map((d) => d.nama).sort(urutNama)
}

export function ringkasSiaran(db: DbDemo, s: SiaranKabupaten): RingkasSiaran {
  const baca = [...bacaUntuk(db, s).values()]
  return {
    id: s.id, judul: s.judul, dikirimPada: s.dikirimPada, dikirimOleh: s.dikirimOleh.nama,
    sasaran: { jenis: s.sasaran.jenis, nama: namaSasaran(db, s) },
    jumlahDesa: s.desaIds.length, dibaca: baca.length, ditindaklanjuti: baca.filter((b) => b.tindakLanjut).length,
    tindakLanjut: s.tindakLanjut, ditarik: s.ditarik ? { pada: s.ditarik.pada, olehNama: s.ditarik.oleh.nama } : null,
  }
}

/** Status per desa sasaran yang dibekukan saat kirim, urut kecamatan lalu nama. */
export function statusDesaSiaran(db: DbDemo, s: SiaranKabupaten): DesaSiaran[] {
  const baca = bacaUntuk(db, s)
  const id = new Set(s.desaIds)
  return db.desa
    .filter((d) => id.has(d.id))
    .sort(urutDesa)
    .map((d) => {
      const b = baca.get(d.id)
      return {
        id: d.id, nama: d.nama, kecamatan: d.kecamatan.nama, status: statusSiaranDesa(b), dibacaPada: b?.dibaca.pada ?? null,
        tindakLanjut: b?.tindakLanjut ? { pada: b.tindakLanjut.pada, catatan: b.tindakLanjut.catatan } : null,
      }
    })
}

/**
 * Butir Ringkasan (keputusan rencana 7B-3): desa sasaran yang belum membuka paling sedikit satu siaran yang tidak ditarik dan
 * dikirim dalam 30 hari terakhir. Satu desa dihitung sekali.
 */
export function desaBelumMembacaSiaran(db: DbDemo, kabupatenKode: string, sekarang: Date): number {
  const mulai = sekarang.getTime() - JENDELA_PERHATIAN_SIARAN_HARI * 86_400_000
  const desa = new Set<string>()
  for (const s of db.siaran) {
    if (s.kabupatenKode !== kabupatenKode || s.ditarik || Date.parse(s.dikirimPada) < mulai) continue
    const baca = bacaUntuk(db, s)
    for (const id of s.desaIds) if (!baca.has(id)) desa.add(id)
  }
  return desa.size
}

/** Siaran yang diterima satu desa (desa ada di sasaran beku), terbaru dulu. */
export const siaranUntukDesa = (db: DbDemo, desaId: string): SiaranKabupaten[] =>
  db.siaran.filter((s) => s.desaIds.includes(desaId)).sort((a, b) => b.dikirimPada.localeCompare(a.dikirimPada))

/** Notifikasi siaran untuk setiap pengguna aktif pemegang `siaran.lihat` di desa sasaran (SPEC-V0.2 §8.4 Di panel desa). */
export function notifikasiSiaran(
  pengguna: readonly Pengguna[],
  s: SiaranKabupaten,
  kabupaten: string,
  dibaca: (p: Pengguna) => boolean = () => false,
): Notifikasi[] {
  const isi = `Dari Kabupaten ${kabupaten}.${s.tindakLanjut ? ` Perlu tindak lanjut sampai ${formatTanggal(s.tindakLanjut.tenggat)}.` : ''}`
  return pengguna
    .filter((p) => p.aktif && s.desaIds.includes(p.desaId) && boleh(p.peran, 'siaran.lihat'))
    .map((p): Notifikasi => ({
      id: `ntf_srn_${s.id}_${p.id}`, desaId: p.desaId, penggunaId: p.id, jenis: 'siaran-kabupaten', judul: s.judul, isi, waktu: s.dikirimPada,
      dibaca: dibaca(p), rujukan: { jenis: 'siaran', id: s.id },
    }))
}
