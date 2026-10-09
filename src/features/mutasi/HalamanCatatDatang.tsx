import { getRouteApi, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { ButuhAkses } from '../admin/ButuhAkses'
import { PenjagaKeluar } from '../admin/PenjagaKeluar'
import { CatatDatang } from './alur/CatatDatang'
import { JEJAK_MUTASI } from './bersama'

const rute = getRouteApi('/admin/_panel/kependudukan/mutasi/datang')

export function HalamanCatatDatang() {
  const navigate = rute.useNavigate()
  const router = useRouter()
  const [kotor, setKotor] = useState(false)
  return (
    <ButuhAkses kemampuan="penduduk.ubah">
      <PageHeader jejak={JEJAK_MUTASI} judul="Catat kedatangan" />
      <div className="pt-6">
        <CatatDatang
          onKotor={setKotor}
          onBatal={() => router.history.back()}
          onTersimpan={({ mutasi }) => {
            if (mutasi.jenis !== 'datang') return
            void navigate({ to: '/admin/kependudukan/keluarga/$id', params: { id: mutasi.rincian.keluargaId }, ignoreBlocker: true })
          }}
        />
      </div>
      <PenjagaKeluar aktif={kotor} />
    </ButuhAkses>
  )
}
