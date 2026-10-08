import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { opsiKeluarga } from '@/api/keluarga'
import { opsiPenduduk } from '@/api/penduduk'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { ButuhAkses } from '../admin/ButuhAkses'
import { PenjagaKeluar } from '../admin/PenjagaKeluar'
import { opsiDariDetail } from '../keluarga/opsi-keluarga'
import { FormPenduduk } from './formulir/FormPenduduk'

const rute = getRouteApi('/admin/_panel/kependudukan/penduduk/$id_/ubah')
const JEJAK = [{ label: 'Kependudukan' }, { label: 'Penduduk', href: '/admin/kependudukan/penduduk' }]

function IsiUbah({ id, onKotor, keProfil }: { id: string; onKotor: (kotor: boolean) => void; keProfil: (setelahSimpan: boolean) => void }) {
  const penduduk = useQuery(opsiPenduduk(id))
  const keluarga = useQuery({ ...opsiKeluarga(penduduk.data?.keluargaId ?? ''), enabled: penduduk.isSuccess })
  if (penduduk.isPending) return <BarisKerangka jumlah={8} label="Memuat data penduduk…" />
  if (penduduk.isError) {
    return penduduk.error instanceof GalatApi && penduduk.error.kode === 'NOT_FOUND' ? (
      <EmptyState
        judul="Data penduduk tidak ditemukan"
        keterangan="Data ini tidak ada, atau berada di luar wilayah yang bisa Anda lihat."
        aksi={<Tautan href="/admin/kependudukan/penduduk">Kembali ke daftar penduduk</Tautan>}
      />
    ) : (
      <ErrorState pesan={pesanGalat(penduduk.error)} onCobaLagi={() => void penduduk.refetch()} />
    )
  }
  if (keluarga.isPending) return <BarisKerangka jumlah={8} label="Memuat data KK…" />
  if (keluarga.isError) return <ErrorState pesan={pesanGalat(keluarga.error)} onCobaLagi={() => void keluarga.refetch()} />
  return (
    <FormPenduduk
      mode={{ jenis: 'ubah', penduduk: penduduk.data, keluarga: opsiDariDetail(keluarga.data) }}
      onKotor={onKotor}
      onBatal={() => keProfil(false)}
      onTersimpan={() => keProfil(true)}
    />
  )
}

export function HalamanUbahPenduduk() {
  const { id } = rute.useParams()
  const navigate = rute.useNavigate()
  const [kotor, setKotor] = useState(false)
  return (
    <ButuhAkses kemampuan="penduduk.ubah">
      <PageHeader jejak={JEJAK} judul="Ubah data penduduk" />
      <div className="pt-6">
        <IsiUbah
          key={id}
          id={id}
          onKotor={setKotor}
          keProfil={(setelahSimpan) =>
            void navigate({ to: '/admin/kependudukan/penduduk/$id', params: { id }, ignoreBlocker: setelahSimpan })
          }
        />
      </div>
      <PenjagaKeluar aktif={kotor} />
    </ButuhAkses>
  )
}
