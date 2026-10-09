import { getRouteApi, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import type { Penduduk } from '@/domain/penduduk/schema'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { ButuhAkses } from '../admin/ButuhAkses'
import { PenjagaKeluar } from '../admin/PenjagaKeluar'
import { CatatLahir } from './alur/CatatLahir'
import { JEJAK_MUTASI } from './bersama'
import { CatatLahirDariLaporan } from './CatatLahirDariLaporan'

const rute = getRouteApi('/admin/_panel/kependudukan/mutasi/lahir')

export function HalamanCatatLahir() {
  const { laporan } = rute.useSearch()
  const navigate = rute.useNavigate()
  const router = useRouter()
  const [kotor, setKotor] = useState(false)
  const alur = {
    onKotor: setKotor,
    onBatal: () => router.history.back(),
    onTersimpan: (bayi: Penduduk) =>
      void navigate({ to: '/admin/kependudukan/penduduk/$id', params: { id: bayi.id }, ignoreBlocker: true }),
  }
  return (
    <ButuhAkses kemampuan="penduduk.ubah">
      <PageHeader jejak={JEJAK_MUTASI} judul="Catat kelahiran" />
      <div className="pt-6">
        {laporan ? <CatatLahirDariLaporan key={laporan} laporanId={laporan} {...alur} /> : <CatatLahir {...alur} />}
      </div>
      <PenjagaKeluar aktif={kotor} />
    </ButuhAkses>
  )
}
