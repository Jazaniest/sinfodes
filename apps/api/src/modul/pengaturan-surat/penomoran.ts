import { tanggalIsoWib } from '@sinfodes/kontrak/format/tanggal'
import { penomoranSchema, ubahPenomoranSchema, type Penomoran } from '@sinfodes/kontrak/pengaturan/penomoran'
import { susunPenomoran } from '@sinfodes/kontrak/surat/penomoran'
import type { Db } from '../../basisdata/klien'
import { galatIsian } from '../../galat-isian'
import { bacaJenisDesa } from '../jenis-surat/repositori'
import { nomorTerbit } from './penomoran-terbit'
import { bacaKodeSurat, bacaPengaturanSurat, tulisKodeSurat, upsertPengaturanSurat } from './repositori'

type Konteks = { db: Db; desaId: string; sekarang: Date }

/** Pengaturan penomoran beserta contoh dari jenis yang paling sering terbit (pratinjau SPEC §7.2). Kode surat dibaca dari basis data. */
export async function ambilPenomoran(k: Konteks): Promise<Penomoran> {
  const pengaturan = await bacaPengaturanSurat(k.db, k.desaId)
  return penomoranSchema.parse(
    susunPenomoran({
      formatNomor: pengaturan.formatNomor,
      urutan: pengaturan.urutan,
      kodeSurat: await bacaKodeSurat(k.db, k.desaId),
      jenis: await bacaJenisDesa(k.db),
      terbit: await nomorTerbit(k.db, k.desaId),
      tahun: Number(tanggalIsoWib(k.sekarang).slice(0, 4)),
    }),
  )
}

/**
 * Menyimpan format, urutan, dan kode surat dalam satu transaksi permintaan. Isian divalidasi seluruhnya lebih dulu (aturan
 * `periksaFormat` kontrak), jadi format yang ditolak tidak ikut mengubah kode surat. Hanya surat yang ditandatangani sesudah
 * ini yang memakai format baru; nomor yang sudah terbit tidak berubah. Tidak menyentuh tata letak atau mode tanda tangan.
 */
export async function simpanPenomoran(k: Konteks, mentah: unknown): Promise<Penomoran> {
  const isian = ubahPenomoranSchema.safeParse(mentah)
  if (!isian.success) throw galatIsian(isian.error)
  await upsertPengaturanSurat(k.db, k.desaId, { formatNomor: isian.data.formatNomor, urutan: isian.data.urutan })
  await tulisKodeSurat(k.db, k.desaId, isian.data.kodeSurat)
  return ambilPenomoran(k)
}
