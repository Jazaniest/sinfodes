import { PENGGUNA_KONSOL_DEMO } from '../data/desa-konsol'
import type { DbDemo, RiwayatStatusDesa } from '../tipe-db'

const HARI_MS = 86_400_000
const tim = PENGGUNA_KONSOL_DEMO[0]

/**
 * Riwayat status contoh (rencana 7D-2 Tugas 2): setiap desa Ditangguhkan ditangguhkan sehari sesudah masa langganannya habis.
 * Tanpa PRNG, jadi data lain tidak bergeser.
 */
export function riwayatStatusContoh(db: Pick<DbDemo, 'desa' | 'langganan'>): RiwayatStatusDesa[] {
  return db.desa.flatMap((desa): RiwayatStatusDesa[] => {
    const sampai = db.langganan.find((l) => l.desaId === desa.id)?.sampai
    if (desa.status !== 'Ditangguhkan' || !sampai) return []
    const hari = new Date(Date.parse(`${sampai}T00:00:00Z`) + HARI_MS).toISOString().slice(0, 10)
    return [{ desaId: desa.id, dari: 'Aktif', ke: 'Ditangguhkan', alasan: 'Tagihan dua triwulan belum dibayar.', pada: `${hari}T09:00:00+07:00`, oleh: { id: tim.id, nama: tim.nama } }]
  })
}
