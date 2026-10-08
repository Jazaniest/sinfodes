import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { pesanGalat } from '@/api/galat'
import { opsiKeluarga } from '@/api/keluarga'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { ButuhAkses } from '../admin/ButuhAkses'
import { PenjagaKeluar } from '../admin/PenjagaKeluar'
import { opsiDariDetail } from '../keluarga/opsi-keluarga'
import { FormPenduduk } from './formulir/FormPenduduk'

const rute = getRouteApi('/admin/_panel/kependudukan/penduduk/tambah')
const JEJAK = [{ label: 'Kependudukan' }, { label: 'Penduduk', href: '/admin/kependudukan/penduduk' }]

export function HalamanTambahPenduduk() {
  const { keluarga } = rute.useSearch()
  const navigate = rute.useNavigate()
  const [kotor, setKotor] = useState(false)
  const kk = useQuery({ ...opsiKeluarga(keluarga ?? ''), enabled: keluarga !== undefined })
  const kembali = () =>
    keluarga
      ? void navigate({ to: '/admin/kependudukan/keluarga/$id', params: { id: keluarga } })
      : void navigate({ to: '/admin/kependudukan/penduduk' })

  return (
    <ButuhAkses kemampuan="penduduk.ubah">
      <PageHeader jejak={JEJAK} judul={keluarga ? 'Tambah anggota keluarga' : 'Tambah penduduk'} />
      <div className="pt-6">
        {keluarga !== undefined && kk.isPending ? (
          <BarisKerangka jumlah={6} label="Memuat data KK…" />
        ) : keluarga !== undefined && kk.isError ? (
          <ErrorState pesan={pesanGalat(kk.error)} onCobaLagi={() => void kk.refetch()} />
        ) : (
          <FormPenduduk
            key={keluarga ?? 'umum'}
            mode={{ jenis: 'tambah', keluargaAwal: kk.data ? opsiDariDetail(kk.data) : null }}
            onKotor={setKotor}
            onBatal={kembali}
            onTersimpan={(p, lanjut) => {
              if (lanjut === 'profil') {
                void navigate({ to: '/admin/kependudukan/penduduk/$id', params: { id: p.id }, ignoreBlocker: true })
              }
            }}
          />
        )}
      </div>
      <PenjagaKeluar aktif={kotor} />
    </ButuhAkses>
  )
}
