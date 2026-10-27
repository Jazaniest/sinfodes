import { useState } from 'react'
import { ButuhAkses } from '../admin/ButuhAkses'
import { PenjagaKeluar } from '../admin/PenjagaKeluar'
import { TataLetakSuratDesa } from './TataLetakSurat'

export function HalamanTataLetakSurat() {
  const [kotor, setKotor] = useState(false)
  return (
    <ButuhAkses kemampuan="pengaturan.kelola">
      <TataLetakSuratDesa onKotor={setKotor} />
      <PenjagaKeluar aktif={kotor} keterangan="Perubahan tata letak surat belum disimpan dan akan hilang." />
    </ButuhAkses>
  )
}
