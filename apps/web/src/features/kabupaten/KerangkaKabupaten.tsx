import { useQueryClient } from '@tanstack/react-query'
import { getRouteApi, Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import { keluarKabupaten, kunciKabupaten } from '@/api/kabupaten'
import { hapusSesi } from '@/app/sesi'
import { KabupatenShell } from './KabupatenShell'
import { SesiKabupatenKonteks } from './sesi-konteks'

const rute = getRouteApi('/kabupaten/admin/_dasbor')

/** Layout semua halaman dasbor kabupaten: sesi kabupaten dan kerangkanya. */
export function KerangkaKabupaten() {
  const { sesiKabupaten } = rute.useRouteContext()
  const jalur = useRouterState({ select: (s) => s.location.pathname })
  const router = useRouter()
  const queryClient = useQueryClient()
  const keluar = async () => {
    try {
      await keluarKabupaten()
    } catch {
      // Sesi tetap dihapus dari perangkat ini walaupun server tidak terjangkau.
    }
    hapusSesi('kabupaten')
    queryClient.removeQueries({ queryKey: kunciKabupaten.semua })
    await router.navigate({ to: '/kabupaten/admin/masuk' })
  }
  return (
    <SesiKabupatenKonteks value={sesiKabupaten}>
      <KabupatenShell sesi={sesiKabupaten} jalur={jalur} onKeluar={() => void keluar()}>
        <Outlet />
      </KabupatenShell>
    </SesiKabupatenKonteks>
  )
}
