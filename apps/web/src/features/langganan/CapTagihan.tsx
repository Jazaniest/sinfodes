import { labelStatusTagihan, lewatJatuhTempo, type Tagihan } from '@/domain/langganan/tagihan'
import { Cap } from '@/ui/cap/Cap'
import type { VarianCap } from '@/ui/cap/varian'

const VARIAN: Readonly<Record<Tagihan['status'], VarianCap>> = {
  terbit: 'menunggu',
  'menunggu-verifikasi': 'diproses',
  lunas: 'selesai',
  dibatalkan: 'dibatalkan',
}

/** Cap status tagihan; "Lewat jatuh tempo" dihitung dari tanggal hari ini. */
export function CapTagihan({ tagihan, hariIni }: { tagihan: Pick<Tagihan, 'status' | 'jatuhTempo'>; hariIni: string }) {
  return <Cap varian={lewatJatuhTempo(tagihan, hariIni) ? 'ditolak' : VARIAN[tagihan.status]} label={labelStatusTagihan(tagihan, hariIni)} />
}
