import type { ReactNode } from 'react'
import type { Kemampuan } from '@/domain/pengguna/hak-akses'
import { LABEL_PERAN } from '@/domain/pengguna/schema'
import { Tautan } from '@/ui/navigasi/Tautan'
import { useSesiAdmin } from './sesi-konteks'
import { useBoleh } from './useBoleh'

/** Peran tidak berhak → "Tidak punya akses" dengan tautan kembali (SPEC §3.5). */
export function ButuhAkses({ kemampuan, children }: { kemampuan: Kemampuan; children: ReactNode }) {
  const { pengguna } = useSesiAdmin()
  const boleh = useBoleh()
  if (boleh(kemampuan)) return <>{children}</>
  return (
    <section className="max-w-xl py-10">
      <p className="text-label font-medium text-tinta-2 uppercase">Akses dibatasi</p>
      <h1 className="mt-1 font-serif text-judul-halaman font-medium">Tidak punya akses</h1>
      <p className="mt-2 text-tinta-2">Peran Anda ({LABEL_PERAN[pengguna.peran]}) tidak berhak membuka halaman ini.</p>
      <Tautan href="/admin" className="mt-4 inline-block">
        Kembali ke Beranda
      </Tautan>
    </section>
  )
}
