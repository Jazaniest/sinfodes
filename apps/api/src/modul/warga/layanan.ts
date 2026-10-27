import { sesiWargaSchema, type SesiWarga } from '@sinfodes/kontrak/warga/sesi'
import type { DesaRekam } from '../../basisdata/desa'
import type { Db } from '../../basisdata/klien'
import { GalatApp } from '../../galat'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'
import { ambilRekamWarga } from './repositori'

export const PESAN_DATA_TIDAK_UTUH = 'Data warga tidak lengkap.'

/**
 * Isi sesi warga (kepala halaman dan Akun): penduduk, desanya, dan nomor WhatsApp yang dibuka dari sandinya. Diperiksa skema
 * kontrak sebelum dikirim. NIK tidak ada (data tidak utuh) berarti galat server, seperti API tiruan.
 */
export async function susunSesiWarga(db: Db, penyandi: Penyandi, desa: DesaRekam, pendudukId: string): Promise<SesiWarga> {
  const w = await ambilRekamWarga(db, pendudukId)
  if (!w || w.nikSandi === null) throw new GalatApp('SERVER', PESAN_DATA_TIDAK_UTUH, 500)
  return sesiWargaSchema.parse({
    jenis: 'warga',
    penduduk: { id: w.id, nama: w.nama, nik: penyandi.bukaSandi(w.nikSandi, ruang.nik(w.desaId)), keluargaId: w.keluargaId },
    desa: desa.desa,
    whatsapp: penyandi.bukaSandi(w.whatsappSandi, ruang.whatsapp(w.desaId)),
  })
}
