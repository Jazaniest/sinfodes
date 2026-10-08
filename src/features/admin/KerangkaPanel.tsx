import { useQueryClient } from '@tanstack/react-query'
import { getRouteApi, Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { keluar } from '@/api/sesi'
import { hapusSesi } from '@/app/sesi'
import { PencarianCepat } from '../cari/PencarianCepat'
import { AdminShell } from './AdminShell'
import { SesiAdminKonteks } from './sesi-konteks'

const rute = getRouteApi('/admin/_panel')

/** Layout semua halaman panel: sesi, kerangka, dan Ctrl/Cmd+K. */
export function KerangkaPanel() {
  const { sesi } = rute.useRouteContext()
  const jalur = useRouterState({ select: (s) => s.location.pathname })
  const router = useRouter()
  const queryClient = useQueryClient()
  const [cariTerbuka, setCariTerbuka] = useState(false)

  useEffect(() => {
    const tekan = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCariTerbuka(true)
      }
    }
    window.addEventListener('keydown', tekan)
    return () => window.removeEventListener('keydown', tekan)
  }, [])

  const keluarSesi = async () => {
    try {
      await keluar()
    } catch {
      // Sesi tetap dihapus dari perangkat ini walaupun server tidak terjangkau.
    }
    hapusSesi()
    queryClient.clear()
    await router.navigate({ to: '/admin/masuk' })
  }

  return (
    <SesiAdminKonteks value={sesi}>
      <AdminShell sesi={sesi} jalur={jalur} onCari={() => setCariTerbuka(true)} onKeluar={() => void keluarSesi()}>
        <Outlet />
      </AdminShell>
      <PencarianCepat isOpen={cariTerbuka} onOpenChange={setCariTerbuka} peran={sesi.pengguna.peran} />
    </SesiAdminKonteks>
  )
}
