import { tanggalIsoWib, waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import { LABEL_PERAN } from '@sinfodes/kontrak/pengguna/schema'
import { hasilVerifikasiSchema, verifikasiMasukanSchema, type HasilVerifikasi } from '@sinfodes/kontrak/publik/schema'
import {
  hitungBerlaku, kodeSah, PESAN_KODE_FORMAT, PESAN_KODE_TIDAK_DITEMUKAN, PESAN_VERIFIKASI_TERKUNCI, rapikanKode, samarkanNama,
} from '@sinfodes/kontrak/publik/verifikasi'
import type { Db } from '../../basisdata/klien'
import { GalatApp, GalatDisimpan } from '../../galat'
import { galatField, galatIsian } from '../../galat-isian'
import { verifikasiSurat } from './repositori'

type Peran = keyof typeof LABEL_PERAN

/**
 * Verifikasi kode surat (SPEC-V0.2 §3.4, §4.5; rencana 8F2b Ruling 12-13). Urutan: skema, rapikan, format (422, tidak dihitung),
 * lalu fungsi SQL yang mencari dan mencatat percobaan. "Tidak ditemukan" dan "terkunci" dilempar sebagai `GalatDisimpan` supaya
 * pencacah yang baru ditulis fungsi itu tetap tersimpan walau jawabannya 404 atau 429. Nama disamarkan di sini (satu aturan
 * kontrak), jadi nama polos hanya lewat memori server.
 */
export async function verifikasiKode(k: { db: Db; desaId: string; sekarang: Date }, mentah: unknown): Promise<HasilVerifikasi> {
  const masukan = verifikasiMasukanSchema.safeParse(mentah)
  if (!masukan.success) throw galatIsian(masukan.error)
  const kode = rapikanKode(masukan.data.kode)
  if (!kodeSah(kode)) throw galatField('kode', PESAN_KODE_FORMAT)

  const h = await verifikasiSurat(k.db, k.desaId, kode, k.sekarang)
  if (h.hasil === 'terkunci') throw new GalatDisimpan('RATE_LIMITED', PESAN_VERIFIKASI_TERKUNCI, 429)
  if (h.hasil === 'tidak-ada') throw new GalatDisimpan('NOT_FOUND', PESAN_KODE_TIDAK_DITEMUKAN, 404)

  const peran = h.penandatangan.peran
  if (!(peran in LABEL_PERAN)) throw new GalatApp('SERVER', 'Data surat tidak utuh.', 500)
  const hasil = hasilVerifikasiSchema.safeParse({
    jenis: h.jenisNama,
    nomor: h.nomor,
    terbit: waktuIsoWib(h.terbitPada),
    nama: samarkanNama(h.nama ?? '-'),
    penandatangan: { jabatan: LABEL_PERAN[peran as Peran], nama: h.penandatangan.nama },
    berlaku: hitungBerlaku(
      { status: h.status, pembatalan: h.pembatalanPada === null ? null : { pada: waktuIsoWib(h.pembatalanPada) }, berlakuSampai: h.berlakuSampai },
      tanggalIsoWib(k.sekarang),
    ),
  })
  if (!hasil.success) throw new GalatApp('SERVER', 'Data surat tidak utuh.', 500)
  return hasil.data
}
