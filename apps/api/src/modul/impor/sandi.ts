import { z } from 'zod'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'
import type { TabelBerkas } from './baca-berkas'

const tabelSchema = z.object({
  kolom: z.array(z.string()),
  baris: z.array(z.object({ nomor: z.number().int().min(2), sel: z.array(z.string()) })),
})

/**
 * Seluruh tabel berkas impor menjadi satu sandi di ruang desa pemilik (rencana 8E3 Ruling 5). Berkas memuat NIK dan telepon
 * polos; tidak satu pun boleh sampai ke kolom tabel tanpa sandi.
 */
export const sandikanIsiImpor = (penyandi: Penyandi, desaId: string, tabel: TabelBerkas): string =>
  penyandi.sandikan(JSON.stringify(tabel), ruang.impor(desaId))

/** Membuka sandi sesi impor. Bentuk yang menyimpang gagal tertutup, bukan diteruskan ke pemeriksaan. */
export const bukaIsiImpor = (penyandi: Penyandi, desaId: string, sandi: string): TabelBerkas =>
  tabelSchema.parse(JSON.parse(penyandi.bukaSandi(sandi, ruang.impor(desaId))))
