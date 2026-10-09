import { getRouteApi, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { ButuhAkses } from '../admin/ButuhAkses'
import { PenjagaKeluar } from '../admin/PenjagaKeluar'
import { CatatPindah } from './alur/CatatPindah'
import { JEJAK_MUTASI } from './bersama'
import { DenganPendudukAwal } from './DenganPendudukAwal'

const rute = getRouteApi('/admin/_panel/kependudukan/mutasi/pindah')

export function HalamanCatatPindah() {
  const { penduduk } = rute.useSearch()
  const navigate = rute.useNavigate()
  const router = useRouter()
  const [kotor, setKotor] = useState(false)
  return (
    <ButuhAkses kemampuan="penduduk.ubah">
      <PageHeader jejak={JEJAK_MUTASI} judul="Catat pindah keluar" />
      <div className="pt-6">
        <DenganPendudukAwal id={penduduk}>
          {(awal) => (
            <CatatPindah
              key={awal?.id ?? 'kosong'}
              pendudukAwal={awal}
              onKotor={setKotor}
              onBatal={() => router.history.back()}
              onTersimpan={([pertama]) =>
                void navigate({ to: '/admin/kependudukan/penduduk/$id', params: { id: pertama.id }, ignoreBlocker: true })
              }
            />
          )}
        </DenganPendudukAwal>
      </div>
      <PenjagaKeluar aktif={kotor} />
    </ButuhAkses>
  )
}
