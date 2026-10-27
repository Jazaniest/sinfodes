import { getRouteApi } from '@tanstack/react-router'
import { ButuhAkses } from '../admin/ButuhAkses'
import { IsiBuku } from './IsiBuku'

const rute = getRouteApi('/admin/_panel/buku/$kode')

export function HalamanIsiBuku() {
  const { kode } = rute.useParams()
  const halaman = rute.useSearch()
  const navigate = rute.useNavigate()
  return (
    <ButuhAkses kemampuan="buku.lihat">
      <IsiBuku
        key={kode}
        kode={kode}
        halaman={halaman}
        onUbahHalaman={(ubah) => void navigate({ search: (lama) => ({ ...lama, ...ubah }) })}
      />
    </ButuhAkses>
  )
}
