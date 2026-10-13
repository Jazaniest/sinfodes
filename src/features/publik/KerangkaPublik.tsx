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
  return (
    <PublikKonteks value={identitas}>
      <WebsiteShell identitas={identitas} jalur={jalur} tanggal={formatTanggal(tanggalIsoWib(new Date()), 'hari')}>
        <Outlet />
      </WebsiteShell>
    </PublikKonteks>
  )
}
