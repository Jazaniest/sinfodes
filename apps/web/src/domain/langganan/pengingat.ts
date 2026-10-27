import { z } from 'zod'
import { formatRupiah } from '../format/angka'
import { formatTanggal } from '../format/tanggal'
import { kalimatSisa } from '../kabupaten/tenggat'

/** Pengingat tagihan mulai H-14 sebelum jatuh tempo (keputusan 7D-1 butir 12). */
export const MULAI_PENGINGAT_TAGIHAN_HARI = 14
/** Ambang notifikasi: H-14, H-7, H-1, dan hari jatuh tempo. */
export const AMBANG_NOTIFIKASI_TAGIHAN = [14, 7, 1, 0] as const

export const KEADAAN_PENGINGAT_TAGIHAN = ['mendekati', 'hari-ini', 'lewat', 'diperiksa'] as const

/** Pita tagihan di Beranda untuk pemegang `langganan.lihat`; null bila tidak ada yang perlu diingatkan. */
export const pengingatTagihanSchema = z.object({
  tagihanId: z.string(),
  /** Label periode, mis. "Triwulan IV 2026". */
  periode: z.string(),
  nominal: z.number().int().positive(),
  jatuhTempo: z.iso.date(),
  keadaan: z.enum(KEADAAN_PENGINGAT_TAGIHAN),
  sisaHari: z.number().int(),
})
export type PengingatTagihan = z.infer<typeof pengingatTagihanSchema>

type Kalimat = Pick<PengingatTagihan, 'periode' | 'nominal' | 'jatuhTempo' | 'sisaHari'>

/** Kalimat pita di Beranda dan isi notifikasi (persis menurut rencana 7D-1). */
export function kalimatPengingatTagihan(keadaan: PengingatTagihan['keadaan'], p: Kalimat): string {
  const dasar = `Tagihan ${p.periode} sebesar ${formatRupiah(p.nominal)}`
  if (keadaan === 'diperiksa') return `Bukti pembayaran tagihan ${p.periode} sedang diperiksa Tim Sinfodes.`
  if (keadaan === 'lewat') return `${dasar} lewat jatuh tempo sejak ${formatTanggal(p.jatuhTempo)}.`
  if (keadaan === 'hari-ini') return `${dasar} jatuh tempo hari ini.`
  return `${dasar} jatuh tempo ${kalimatSisa(p.sisaHari)}, ${formatTanggal(p.jatuhTempo)}.`
}
