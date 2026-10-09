import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { keluar } from '@/api/sesi'
import { opsiJumlahPermohonan } from '@/api/surat'
import { hapusSesi } from '@/app/sesi'
import { boleh } from '@/domain/pengguna/hak-akses'
import { PencarianCepat } from '../cari/PencarianCepat'
import { AdminShell } from './AdminShell'
import { SesiAdminKonteks } from './sesi-konteks'
import { hapusSemuaDraf } from './useDrafFormulir'

const rute = getRouteApi('/admin/_panel')

/** Layout semua halaman panel: sesi, kerangka, dan Ctrl/Cmd+K. */
export function KerangkaPanel() {
  const { sesi } = rute.useRouteContext()
  const jalur = useRouterState({ select: (s) => s.location.pathname })
  const router = useRouter()
  const queryClient = useQueryClient()
  const [cariTerbuka, setCariTerbuka] = useState(false)
  // Angka menu Layanan Surat; ikut dimuat ulang setiap kali permohonan berubah (segarkanSurat).
  const jumlahSurat = useQuery({ ...opsiJumlahPermohonan(), enabled: boleh(sesi.pengguna.peran, 'surat.lihat') })

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
    // Draf formulir bisa berisi NIK; jangan tertinggal di perangkat setelah keluar.
    hapusSemuaDraf()
    queryClient.clear()
    await router.navigate({ to: '/admin/masuk' })
  }

  return (
    <SesiAdminKonteks value={sesi}>
      <AdminShell
        sesi={sesi}
        jalur={jalur}
        onCari={() => setCariTerbuka(true)}
        onKeluar={() => void keluarSesi()}
        hitungan={{ surat: jumlahSurat.data?.perluTindakan }}
      >
        <Outlet />
      </AdminShell>
      <PencarianCepat isOpen={cariTerbuka} onOpenChange={setCariTerbuka} peran={sesi.pengguna.peran} />
    </SesiAdminKonteks>
  )
}
