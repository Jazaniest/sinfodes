import { useState } from 'react'
import { ButuhAkses } from '../admin/ButuhAkses'
import { PenjagaKeluar } from '../admin/PenjagaKeluar'
import { Identitas } from './Identitas'

export function HalamanIdentitas() {
  const [kotor, setKotor] = useState(false)
  return (
    <ButuhAkses kemampuan="pengaturan.kelola">
      <Identitas onKotor={setKotor} />
      <PenjagaKeluar aktif={kotor} keterangan="Perubahan identitas desa belum disimpan dan akan hilang." />
    </ButuhAkses>
  )
}
