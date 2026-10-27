import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { ButuhAkses } from '../admin/ButuhAkses'
import { PenjagaKeluar } from '../admin/PenjagaKeluar'
import { DetailPengaduan } from './DetailPengaduan'

const rute = getRouteApi('/admin/_panel/pengaduan/$id')

export function HalamanDetailPengaduan() {
  const { id } = rute.useParams()
  const [kotor, setKotor] = useState(false)
  return (
    <ButuhAkses kemampuan="pengaduan.lihat">
      <DetailPengaduan key={id} id={id} onKotor={setKotor} />
      <PenjagaKeluar aktif={kotor} keterangan="Balasan yang belum dikirim akan hilang." />
    </ButuhAkses>
  )
}
