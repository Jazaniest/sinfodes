import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { ButuhAkses } from '../../admin/ButuhAkses'
import { PenjagaKeluar } from '../../admin/PenjagaKeluar'
import { BuatSurat } from './BuatSurat'

const rute = getRouteApi('/admin/_panel/surat/baru')

export function HalamanBuatSurat() {
  const cari = rute.useSearch()
  const navigate = rute.useNavigate()
  const [kotor, setKotor] = useState(false)
  return (
    <ButuhAkses kemampuan="surat.proses">
      <BuatSurat
        cari={cari}
        onUbahCari={(ubah) => void navigate({ search: (lama) => ({ ...lama, ...ubah }) })}
        onSelesai={(id) => void navigate({ to: '/admin/surat/$id', params: { id }, ignoreBlocker: true })}
        onKotor={setKotor}
      />
      <PenjagaKeluar aktif={kotor} keterangan="Surat yang sedang dibuat belum disimpan dan akan hilang." />
    </ButuhAkses>
  )
}
