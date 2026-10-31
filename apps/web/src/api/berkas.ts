import { BASE_API } from './client'

/**
 * Isi foto syarat dan pindaian hanya ada di server nyata; dunia demo menyimpan nama dan ukurannya saja (rencana 8F3 Ruling 10 dan 18).
 * Dibaca saat dipakai (bukan saat modul dimuat) supaya uji bisa mengganti mode.
 */
export const bisaBukaBerkas = (): boolean => import.meta.env.VITE_DEMO !== 'true'

/** Alamat foto syarat satu permohonan. Hanya memuat id: tanpa NIK dan tanpa nama berkas. */
export const urlBerkasLampiran = (permohonanId: string, lampiranId: string): string =>
  `${BASE_API}/permohonan/${encodeURIComponent(permohonanId)}/lampiran/${encodeURIComponent(lampiranId)}`

/** Alamat pindaian satu surat masuk. */
export const urlBerkasScan = (suratMasukId: string): string => `${BASE_API}/surat-masuk/${encodeURIComponent(suratMasukId)}/scan`
