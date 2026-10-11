import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { ButuhAkses } from '../../admin/ButuhAkses'
import { PenjagaKeluar } from '../../admin/PenjagaKeluar'
import { UbahJenisSurat } from './UbahJenisSurat'

const rute = getRouteApi('/admin/_panel/surat/jenis/$id')

export function HalamanUbahJenis() {
  const { id } = rute.useParams()
  const navigate = rute.useNavigate()
  const [kotor, setKotor] = useState(false)
  return (
    <ButuhAkses kemampuan="pengaturan.kelola">
      <UbahJenisSurat key={id} id={id} onKotor={setKotor} onSelesai={() => void navigate({ to: '/admin/surat/jenis', ignoreBlocker: true })} />
      <PenjagaKeluar aktif={kotor} keterangan="Perubahan jenis surat belum disimpan dan akan hilang." />
    </ButuhAkses>
  )
}
