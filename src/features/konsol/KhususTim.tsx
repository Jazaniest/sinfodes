import type { ReactNode } from 'react'
import { Tautan } from '@/ui/navigasi/Tautan'
import { useSesiKonsol } from './sesi-konteks'

/** Halaman khusus Tim Sinfodes; pemantau yang membuka alamatnya langsung melihat "Tidak punya akses" (SPEC §3.5). */
export function KhususTim({ children }: { children: ReactNode }) {
  const { pengguna } = useSesiKonsol()
  if (pengguna.peran === 'tim') return <>{children}</>
  return (
    <section className="max-w-xl py-10">
      <p className="text-label font-medium text-tinta-2 uppercase">Akses dibatasi</p>
      <h1 className="mt-1 font-serif text-judul-halaman font-medium">Tidak punya akses</h1>
      <p className="mt-2 text-tinta-2">Pemantau wilayah hanya melihat angka gabungan per desa di wilayahnya, tidak membuka data desa satu per satu.</p>
      <Tautan href="/konsol" className="mt-4 inline-block">
        Kembali ke Ringkasan
      </Tautan>
    </section>
  )
}
