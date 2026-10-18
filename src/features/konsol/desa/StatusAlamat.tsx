import { useQuery } from '@tanstack/react-query'
import { opsiPeriksaAlamat } from '@/api/konsol'
import { useTunda } from '@/ui/hooks/useTunda'

/**
 * Hasil pemeriksaan alamat desa di bawah kolomnya (SPEC-V0.2 §4.2), diumumkan pembaca layar. `desaId` untuk desa yang sudah
 * ada, supaya aliasnya sendiri dianggap bisa dipakai.
 */
export function StatusAlamat({ label, desaId }: { label: string; desaId?: string }) {
  const tenang = useTunda(label.trim().toLowerCase(), 300)
  const periksa = useQuery({ ...opsiPeriksaAlamat(tenang, desaId), enabled: tenang.length > 0 })
  const hasil = tenang.length > 0 ? periksa.data : undefined
  const warna = hasil?.status === 'tersedia' || hasil?.status === 'sekarang' ? 'text-hijau' : 'text-merah'
  return (
    <p aria-live="polite" className={`min-h-5 text-teks-kecil ${hasil ? warna : ''}`}>
      {hasil?.pesan}
    </p>
  )
}
