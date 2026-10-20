import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Outlet, useRouterState } from '@tanstack/react-router'
import { opsiAlamat } from '@/api/alamat'
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
  // Tema desa dari alamat (sudah tersimpan sejak halaman masuk); sebelum termuat kerangka memakai warna Register.
  const alamat = useQuery(opsiAlamat())
  const tampilan = alamat.data?.jenis === 'desa' ? alamat.data.desa.tampilanWarga : null
  const jalur = useRouterState({ select: (s) => s.location.pathname })
  return (
    <SesiWargaKonteks value={sesi}>
      <WargaShell sesi={sesi} jalur={jalur} tampilan={tampilan}>
        <Outlet />
      </WargaShell>
    </SesiWargaKonteks>
  )
}
