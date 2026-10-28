import { formatAngka } from '@sinfodes/kontrak/format/angka'
import { waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import { filterPendudukSchema } from '@sinfodes/kontrak/penduduk/filter'
import type { BarisPenduduk } from '@sinfodes/kontrak/penduduk/schema'
import { cakupanDusun } from '@sinfodes/kontrak/pengguna/hak-akses'
import { z } from 'zod'
import { catatAudit } from '../../audit'
import { GalatApp } from '../../galat'
import { catatAktivitas, pelakuKontrak } from '../../riwayat/catat'
import { barisTersaring, type KonteksLayanan } from './layanan'

const eksporSchema = z.object({
  kata: z.string().trim().min(1).max(100).nullable(),
  filter: filterPendudukSchema,
  format: z.enum(['csv', 'cetak']),
})

/**
 * Seluruh penduduk yang lolos kata dan filter, tanpa halaman, untuk diunduh sebagai CSV atau dicetak sebagai Buku Induk.
 * Unduhan data pribadi selalu tercatat: di Buku hari ini (seperti API tiruan) dan di jejak audit dengan format serta jumlah
 * saja, tanpa NIK (SPEC-V0.3 §7.9). Pencatatan satu transaksi dengan jawaban: bila gagal ditulis, tidak ada data yang keluar.
 */
export async function eksporPenduduk(k: KonteksLayanan & { idDesa: string }, mentah: unknown): Promise<{ baris: BarisPenduduk[] }> {
  const isian = eksporSchema.safeParse(mentah)
  if (!isian.success) throw new GalatApp('VALIDATION', 'Permintaan unduhan tidak valid.', 422)
  const { kata, filter, format } = isian.data
  const baris = await barisTersaring(k, filter, kata)
  if (baris.length === 0) throw new GalatApp('VALIDATION', 'Tidak ada data penduduk untuk diunduh.', 422)
  const jumlah = formatAngka(baris.length)
  const waktu = waktuIsoWib(k.hariIni)
  await catatAktivitas(k.db, {
    desaId: k.idDesa, dusunId: cakupanDusun(k.pelaku), waktu, jenis: 'penduduk-ekspor',
    ringkasan: format === 'csv' ? `Data penduduk diunduh (${jumlah} baris)` : `Buku Induk Penduduk dicetak (${jumlah} baris)`,
    oleh: pelakuKontrak(k.pelaku), rujukan: null,
  })
  await catatAudit(k.db, { desaId: k.idDesa, jenis: 'penduduk.ekspor', pelaku: k.pelaku.id, waktu: k.hariIni, ringkasan: { format, jumlah: baris.length } })
  return { baris }
}
