import type { IsiLaporan } from '@sinfodes/kontrak/laporan/schema'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'

/**
 * Field laporan perbaikan yang nilainya data pribadi (SPEC-V0.3 §7.6). NIK memang tidak boleh dilaporkan warga
 * (`FIELD_LAPORAN`), tetapi CHECK migrasi 0008 mencakupnya juga sebagai sabuk kedua.
 */
const FIELD_LAPORAN_SENSITIF: ReadonlySet<string> = new Set(['nik', 'telepon'])

/** Isi untuk disimpan: nilai telepon disandikan di ruang laporan desa; isi lain apa adanya. */
export function sandikanIsiLaporan(penyandi: Penyandi, desaId: string, isi: IsiLaporan): IsiLaporan {
  if (isi.jenis !== 'perbaikan' || !FIELD_LAPORAN_SENSITIF.has(isi.field)) return isi
  return { ...isi, nilaiBaru: penyandi.sandikan(isi.nilaiBaru, ruang.laporan(desaId)) }
}

/** Kebalikan `sandikanIsiLaporan`, untuk isi yang dibaca dari basis data. */
export function bukaIsiLaporan(penyandi: Penyandi, desaId: string, isi: IsiLaporan): IsiLaporan {
  if (isi.jenis !== 'perbaikan' || !FIELD_LAPORAN_SENSITIF.has(isi.field)) return isi
  return { ...isi, nilaiBaru: penyandi.bukaSandi(isi.nilaiBaru, ruang.laporan(desaId)) }
}
