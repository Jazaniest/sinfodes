import { useQuery } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { opsiBerandaPublik } from '@/api/publik'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { RenderSusunan } from '../blok/RenderSusunan'
import { usePublik } from '../publik-konteks'
import { ProfilSingkat } from './ProfilSingkat'

/**
 * Beranda website desa (SPEC-V0.2 11.4): dirender dari susunan blok terbit yang sudah berisi data di API publik. Desa
 * rekaman tanpa kabar tetap memakai bagian Profil singkat (SPEC-V0.2 13).
 */
export function BerandaPublik() {
  const identitas = usePublik()
  const kueri = useQuery(opsiBerandaPublik(identitas.slug))
  const dasar = `/desa/${identitas.slug}`
  return (
    <div className="flex flex-col gap-[var(--desa-jarak,2.5rem)]">
      <h1 className="sr-only">Beranda Desa {identitas.nama}</h1>
      {kueri.isPending && <BarisKerangka jumlah={6} label="Memuat beranda desa…" />}
      {kueri.isError && <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />}
      {kueri.isSuccess && (
        <>
          <RenderSusunan blok={kueri.data.blok} dasar={dasar} />
          {kueri.data.profilSingkat && <ProfilSingkat paragraf={kueri.data.profilSingkat} />}
        </>
      )}
    </div>
  )
}
