import { randomUUID } from 'node:crypto'
import type { Db } from '../basisdata/klien'
import type { Penyandi } from '../kripto/penyandi'
import { ruang } from '../kripto/ruang'
import type { TipeBerkas } from './periksa'
import { bacaBarisBerkas, sisipBerkas, type KriteriaBerkas } from './repositori'

/** Batas atas satu berkas yang boleh sampai ke penyimpanan (sama dengan CHECK `berkas_surat.ukuran_byte`); batas per jenis ditegakkan pemanggil. */
const MAKS_BYTE_TERSIMPAN = 5 * 1024 * 1024

export type SimpanBerkas = {
  desaId: string
  tipe: TipeBerkas
  /** Isi sesudah `periksaBerkas` dan `bersihkanMetadata`. */
  bita: Buffer
  sekarang: Date
  /** Id lampiran dibuat sebelum permohonan disisipkan (masuk ke `permohonan.lampiran`); tanpa id, dibuatkan. */
  id?: string
} & ({ jenis: 'lampiran'; permohonanId: string } | { jenis: 'scan'; suratMasukId: string })

/**
 * Satu-satunya jalan isi berkas masuk ke penyimpanan (8F3 Ruling 1): isinya disandikan dengan kunci data aktif, dengan id
 * baris ikut diautentikasi. Pindah ke disk atau S3 kelak hanya mengganti fungsi ini dan `bacaBerkas`.
 */
export async function simpanBerkas(db: Db, penyandi: Penyandi, b: SimpanBerkas): Promise<{ id: string }> {
  if (b.bita.length < 1 || b.bita.length > MAKS_BYTE_TERSIMPAN) throw new RangeError('Ukuran berkas di luar batas penyimpanan.')
  const id = b.id ?? `bks_${randomUUID()}`
  await sisipBerkas(db, {
    id,
    desaId: b.desaId,
    jenis: b.jenis,
    permohonanId: b.jenis === 'lampiran' ? b.permohonanId : null,
    suratMasukId: b.jenis === 'scan' ? b.suratMasukId : null,
    tipe: b.tipe,
    ukuranByte: b.bita.length,
    isi: penyandi.sandikanBita(b.bita, ruang.berkas(b.desaId, id)),
    dibuat: b.sekarang,
  })
  return { id }
}

/** Membuka isi berkas milik permohonan atau surat masuk tertentu; undefined bila tidak ada atau bukan milik rujukan itu. */
export async function bacaBerkas(db: Db, penyandi: Penyandi, kriteria: KriteriaBerkas): Promise<{ tipe: TipeBerkas; bita: Buffer } | undefined> {
  const baris = await bacaBarisBerkas(db, kriteria)
  if (!baris) return undefined
  return { tipe: baris.tipe as TipeBerkas, bita: penyandi.bukaBita(baris.isi, ruang.berkas(baris.desaId, baris.id)) }
}
