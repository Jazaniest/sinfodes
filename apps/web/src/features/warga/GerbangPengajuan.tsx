import type { ReactNode } from 'react'
import { Tautan } from '@/ui/navigasi/Tautan'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { useSesiWarga } from './sesi-konteks'

/**
 * Pengajuan surat dan pengaduan baru ditutup selama desa Ditangguhkan (SPEC-V0.2 §10.5): formulir diganti pesan. Masuk, melihat
 * riwayat, dan mengunduh surat lama tetap jalan. API tiruan menolak kirimannya juga (403).
 */
export function GerbangPengajuan({ children }: { children: ReactNode }) {
  const { desa } = useSesiWarga()
  if (desa.status !== 'Ditangguhkan') return <>{children}</>
  return (
    <EmptyState
      judulHalaman
      judul="Pengajuan ditutup sementara"
      keterangan={`Layanan pengajuan Desa ${desa.nama} sedang ditutup. Silakan datang ke kantor desa.`}
      aksi={<Tautan href="/warga">Kembali ke Beranda</Tautan>}
    />
  )
}
