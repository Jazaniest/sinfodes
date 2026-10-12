import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Outlet, useRouterState } from '@tanstack/react-router'
import { ambilTokenSesi } from '@/api/client'
import { opsiSesiWarga } from '@/api/warga'
import { SesiWargaKonteks } from './sesi-konteks'
import { WargaShell } from './WargaShell'

const rute = getRouteApi('/warga/_app')

/** Layout semua halaman layanan warga: sesi dan kerangka HP. */
export function KerangkaWarga() {
  const { sesiWarga } = rute.useRouteContext()
  // Ikuti cache sesi: perubahan di Akun (mis. nomor WhatsApp) langsung terlihat tanpa pindah halaman.
  const terkini = useQuery({ ...opsiSesiWarga(), enabled: ambilTokenSesi('warga') !== null })
  const sesi = terkini.data ?? sesiWarga
  const jalur = useRouterState({ select: (s) => s.location.pathname })
  return (
    <SesiWargaKonteks value={sesi}>
      <WargaShell sesi={sesi} jalur={jalur}>
        <Outlet />
      </WargaShell>
    </SesiWargaKonteks>
  )
}
