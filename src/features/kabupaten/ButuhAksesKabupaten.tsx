import type { ReactNode } from 'react'
import { bolehKabupaten, type KemampuanKabupaten } from '@/domain/kabupaten/hak-akses'
import { LABEL_PERAN_KABUPATEN } from '@/domain/kabupaten/schema'
import { Tautan } from '@/ui/navigasi/Tautan'
import { useSesiKabupaten } from './sesi-konteks'

/** Peran tidak berhak → "Tidak punya akses" dengan tautan kembali (pola panel desa, SPEC §3.5). */
export function ButuhAksesKabupaten({ kemampuan, children }: { kemampuan: KemampuanKabupaten; children: ReactNode }) {
  const { pengguna } = useSesiKabupaten()
  if (bolehKabupaten(pengguna.peran, kemampuan)) return <>{children}</>
  return (
    <section className="max-w-xl py-10">
      <p className="text-label font-medium text-tinta-2 uppercase">Akses dibatasi</p>
      <h1 className="mt-1 font-serif text-judul-halaman font-medium">Tidak punya akses</h1>
      <p className="mt-2 text-tinta-2">Peran Anda ({LABEL_PERAN_KABUPATEN[pengguna.peran]}) tidak berhak membuka halaman ini.</p>
      <Tautan href="/kabupaten/admin" className="mt-4 inline-block">
        Kembali ke Ringkasan
      </Tautan>
    </section>
  )
}
