import { useState } from 'react'
import { ButuhAkses } from '../admin/ButuhAkses'
import { PenjagaKeluar } from '../admin/PenjagaKeluar'
import { Penomoran } from './Penomoran'

export function HalamanPenomoran() {
  const [kotor, setKotor] = useState(false)
  return (
    <ButuhAkses kemampuan="pengaturan.kelola">
      <Penomoran onKotor={setKotor} />
      <PenjagaKeluar aktif={kotor} keterangan="Perubahan penomoran surat belum disimpan dan akan hilang." />
    </ButuhAkses>
  )
}
