import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Outlet, useRouterState } from '@tanstack/react-router'
import { opsiIdentitasPublik } from '@/api/publik'
import { formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { PublikKonteks } from './publik-konteks'
import { WebsiteShell } from './WebsiteShell'

const rute = getRouteApi('/desa/$slug')

/** Layout semua halaman website desa: identitas dari loader rute, lalu kerangka warta desa. */
export function KerangkaPublik() {
  const { slug } = rute.useParams()
  const awal = rute.useLoaderData()
  const terkini = useQuery(opsiIdentitasPublik(slug))
  const identitas = terkini.data ?? awal
  const jalur = useRouterState({ select: (s) => s.location.pathname })
  // Halaman Cek keaslian tidak memakai CSS kustom desa: bukti surat harus tampil apa adanya (SPEC-V0.2 11.5).
  const cekKeaslian = /\/verifikasi\/?$/.test(jalur)
  return (
    <PublikKonteks value={identitas}>
      <WebsiteShell identitas={identitas} jalur={jalur} cekKeaslian={cekKeaslian} tanggal={formatTanggal(tanggalIsoWib(new Date()), 'hari')}>
        <Outlet />
      </WebsiteShell>
    </PublikKonteks>
  )
}
