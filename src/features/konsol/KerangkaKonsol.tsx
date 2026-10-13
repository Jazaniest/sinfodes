import { useQueryClient } from '@tanstack/react-query'
import { getRouteApi, Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import { keluarKonsol, kunciKonsol } from '@/api/konsol'
import { hapusSesi } from '@/app/sesi'
import { KonsolShell } from './KonsolShell'
import { SesiKonsolKonteks } from './sesi-konteks'

const rute = getRouteApi('/konsol/_konsol')

/** Layout semua halaman Konsol: sesi konsol dan kerangkanya. */
export function KerangkaKonsol() {
  const { sesiKonsol } = rute.useRouteContext()
  const jalur = useRouterState({ select: (s) => s.location.pathname })
  const router = useRouter()
  const queryClient = useQueryClient()
  const keluar = async () => {
    try {
      await keluarKonsol()
    } catch {
      // Sesi tetap dihapus dari perangkat ini walaupun server tidak terjangkau.
    }
    hapusSesi('konsol')
    queryClient.removeQueries({ queryKey: kunciKonsol.semua })
    await router.navigate({ to: '/konsol/masuk' })
  }
  return (
    <SesiKonsolKonteks value={sesiKonsol}>
      <KonsolShell sesi={sesiKonsol} jalur={jalur} onKeluar={() => void keluar()}>
        <Outlet />
      </KonsolShell>
    </SesiKonsolKonteks>
  )
}
