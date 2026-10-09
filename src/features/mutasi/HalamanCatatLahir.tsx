import { getRouteApi, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { ButuhAkses } from '../admin/ButuhAkses'
import { PenjagaKeluar } from '../admin/PenjagaKeluar'
import { CatatLahir } from './alur/CatatLahir'
import { JEJAK_MUTASI } from './bersama'

const rute = getRouteApi('/admin/_panel/kependudukan/mutasi/lahir')

export function HalamanCatatLahir() {
  const navigate = rute.useNavigate()
  const router = useRouter()
  const [kotor, setKotor] = useState(false)
  return (
    <ButuhAkses kemampuan="penduduk.ubah">
      <PageHeader jejak={JEJAK_MUTASI} judul="Catat kelahiran" />
      <div className="pt-6">
        <CatatLahir
          onKotor={setKotor}
          onBatal={() => router.history.back()}
          onTersimpan={(bayi) => void navigate({ to: '/admin/kependudukan/penduduk/$id', params: { id: bayi.id }, ignoreBlocker: true })}
        />
      </div>
      <PenjagaKeluar aktif={kotor} />
    </ButuhAkses>
  )
}
