import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { ButuhAkses } from '../admin/ButuhAkses'
import { PenjagaKeluar } from '../admin/PenjagaKeluar'
import { ImporPenduduk } from './ImporPenduduk'

const rute = getRouteApi('/admin/_panel/kependudukan/penduduk/impor')
const JEJAK = [{ label: 'Kependudukan' }, { label: 'Penduduk', href: '/admin/kependudukan/penduduk' }]

export function HalamanImpor() {
  const navigate = rute.useNavigate()
  const [kotor, setKotor] = useState(false)
  return (
    <ButuhAkses kemampuan="penduduk.ubah">
      <PageHeader jejak={JEJAK} judul="Impor penduduk dari Excel" />
      <div className="pt-6">
        <ImporPenduduk onKotor={setKotor} onLihatDaftar={() => void navigate({ to: '/admin/kependudukan/penduduk' })} />
      </div>
      <PenjagaKeluar aktif={kotor} />
    </ButuhAkses>
  )
}
