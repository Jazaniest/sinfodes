import { useState } from 'react'
import { ButuhAkses } from '../admin/ButuhAkses'
import { PenjagaKeluar } from '../admin/PenjagaKeluar'
import { Wilayah } from './Wilayah'

export function HalamanWilayah() {
  const [kotor, setKotor] = useState(false)
  return (
    <ButuhAkses kemampuan="pengaturan.kelola">
      <Wilayah onKotor={setKotor} />
      <PenjagaKeluar aktif={kotor} keterangan="Perubahan wilayah belum disimpan dan akan hilang." />
    </ButuhAkses>
  )
}
