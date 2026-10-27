import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { ButuhAkses } from '../admin/ButuhAkses'
import { PenjagaKeluar } from '../admin/PenjagaKeluar'
import { RuangKerjaSurat } from './RuangKerjaSurat'

const rute = getRouteApi('/admin/_panel/surat/$id')

export function HalamanRuangKerja() {
  const { id } = rute.useParams()
  const [kotor, setKotor] = useState(false)
  return (
    <ButuhAkses kemampuan="surat.lihat">
      <RuangKerjaSurat key={id} id={id} onKotor={setKotor} />
      <PenjagaKeluar aktif={kotor} keterangan="Perubahan isian surat yang belum disimpan akan hilang." />
    </ButuhAkses>
  )
}
