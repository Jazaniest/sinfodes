import { useState } from 'react'
import { ButuhAkses } from '../admin/ButuhAkses'
import { PenjagaKeluar } from '../admin/PenjagaKeluar'
import { DaftarAgenda } from './DaftarAgenda'
import { DaftarArtikel } from './DaftarArtikel'
import { DaftarPengumuman } from './DaftarPengumuman'
import { Galeri } from './Galeri'
import { Tampilan } from './Tampilan'

/** Website Desa dikelola Operator dan Sekretaris Desa (SPEC §5.1). */
export function HalamanArtikel() {
  return (
    <ButuhAkses kemampuan="website.kelola">
      <DaftarArtikel />
    </ButuhAkses>
  )
}

export function HalamanPengumuman() {
  return (
    <ButuhAkses kemampuan="website.kelola">
      <DaftarPengumuman />
    </ButuhAkses>
  )
}

export function HalamanAgenda() {
  return (
    <ButuhAkses kemampuan="website.kelola">
      <DaftarAgenda />
    </ButuhAkses>
  )
}

export function HalamanGaleri() {
  return (
    <ButuhAkses kemampuan="website.kelola">
      <Galeri />
    </ButuhAkses>
  )
}

export function HalamanTampilan() {
  const [kotor, setKotor] = useState(false)
  return (
    <ButuhAkses kemampuan="website.kelola">
      <Tampilan onKotor={setKotor} />
      <PenjagaKeluar aktif={kotor} keterangan="Perubahan tampilan website belum disimpan dan akan hilang." />
    </ButuhAkses>
  )
}
