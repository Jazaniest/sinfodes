import { useQuery } from '@tanstack/react-query'
import { opsiKeluarga } from '@/api/keluarga'

/**
 * Pengganti kepala keluarga saat anggota keluar dari KK (SPEC §6.6): wajib bila kepala keluarga ikut keluar
 * dan masih ada anggota yang tinggal. Calonnya adalah anggota yang tetap tinggal.
 */
export function usePengganti(keluargaId: string | null, keluarIds: readonly string[]) {
  const kk = useQuery({ ...opsiKeluarga(keluargaId ?? ''), enabled: keluargaId !== null })
  const detail = keluargaId === null ? null : (kk.data ?? null)
  const calon = detail ? detail.anggota.filter((a) => !keluarIds.includes(a.id)) : []
  const kepalaKeluar = detail ? keluarIds.includes(detail.keluarga.kepalaKeluargaId) : false
  return { detail, calon, wajib: kepalaKeluar && calon.length > 0, memuat: keluargaId !== null && kk.isPending }
}
