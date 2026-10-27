import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { opsiIdentitasPublik } from '@/api/publik'
import { formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { SLUG_PRATINJAU_TEMA, temaGaleri } from '@/features/website/galeri-tema'
import { adalahIdTema, type IdTema } from '@/domain/website/tema'
import { BerandaPublik } from '@/features/publik/beranda/BerandaPublik'
import { PublikKonteks } from '@/features/publik/publik-konteks'
import { WebsiteShell } from '@/features/publik/WebsiteShell'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'

/**
 * Halaman katalog satu tema galeri (SPEC-V0.2 §11.3): Beranda Sungai Sialang dengan tema galeri `id` menimpa tema desa.
 * Hanya untuk mengambil screenshot pratinjau di build demo; tidak menulis apa pun ke data.
 */
export function KatalogTema({ id }: { id: IdTema }) {
  const kueri = useQuery(opsiIdentitasPublik(SLUG_PRATINJAU_TEMA))
  if (kueri.isError) return <ErrorState pesan="Data Sungai Sialang tidak dapat dimuat." onCobaLagi={() => void kueri.refetch()} />
  if (!kueri.data) return null
  const galeri = temaGaleri(id)
  const identitas = { ...kueri.data, tema: { ...kueri.data.tema, ...galeri.dasar, idGaleri: galeri.id } }
  return (
    <PublikKonteks value={identitas}>
      <WebsiteShell
        identitas={identitas}
        jalur={`/desa/${SLUG_PRATINJAU_TEMA}/`}
        cekKeaslian={false}
        tanggal={formatTanggal(tanggalIsoWib(new Date()), 'hari')}
      >
        <BerandaPublik />
      </WebsiteShell>
    </PublikKonteks>
  )
}

const rute = getRouteApi('/katalog_/tema/$id')

/** Komponen rute `/katalog/tema/$id`; id yang tidak dikenal sudah ditolak `beforeLoad` rute. */
export function KatalogTemaRute() {
  const { id } = rute.useParams()
  return adalahIdTema(id) ? <KatalogTema id={id} /> : null
}
