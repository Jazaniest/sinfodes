import { getRouteApi } from '@tanstack/react-router'
import { ButuhAkses } from '../../admin/ButuhAkses'
import { DaftarJenisSurat } from './DaftarJenisSurat'

const rute = getRouteApi('/admin/_panel/surat/jenis/')

export function HalamanDaftarJenis() {
  const { status } = rute.useSearch()
  const navigate = rute.useNavigate()
  return (
    <ButuhAkses kemampuan="surat.lihat">
      <DaftarJenisSurat
        status={status ?? null}
        onUbahStatus={(s) => void navigate({ search: { status: s ?? undefined }, replace: true })}
        onBuka={(id) => void navigate({ to: '/admin/surat/jenis/$id', params: { id } })}
      />
    </ButuhAkses>
  )
}
