import { pesanLayananDitutup } from '@/domain/warga/ajukan'
import type { StatusDesa } from '@/domain/wilayah/schema'
import { ambilDb } from './db'
import { balasGalat } from './http'

/** Pesan API untuk tulis di panel desa yang Ditangguhkan (SPEC-V0.2 §10.5). */
export const PESAN_PANEL_DITANGGUHKAN = 'Langganan desa ditangguhkan. Panel hanya bisa dilihat.'

export const statusDesaDi = (desaId: string): StatusDesa => ambilDb().desa.find((d) => d.id === desaId)?.status ?? 'Aktif'

/** Request yang hanya membaca tidak pernah ditolak karena penangguhan: panel masih bisa dilihat, diunduh, dan diekspor. */
export const hanyaMembaca = (request: Request): boolean => request.method === 'GET' || request.method === 'HEAD'

/**
 * Response 403 bila desa pengguna panel Ditangguhkan, kalau tidak null. Untuk endpoint tulis yang tidak lewat `butuhKemampuan`
 * karena kemampuannya bergantung pada aksi (mis. aksi surat).
 */
export function tolakBilaDitangguhkan(desaId: string): Response | null {
  return statusDesaDi(desaId) === 'Ditangguhkan' ? balasGalat('FORBIDDEN', PESAN_PANEL_DITANGGUHKAN, 403) : null
}

/** Response 403 bila desa warga Ditangguhkan, kalau tidak null. Dipakai endpoint pengajuan baru dari layanan warga. */
export function tolakBilaLayananDitutup(desaId: string): Response | null {
  const desa = ambilDb().desa.find((d) => d.id === desaId)
  return desa?.status === 'Ditangguhkan' ? balasGalat('FORBIDDEN', pesanLayananDitutup(desa.nama), 403) : null
}
