import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { VerifikasiSurat } from './VerifikasiSurat'

const rute = getRouteApi('/desa/$slug/verifikasi')

/** Pembungkus rute: kode verifikasi disimpan di alamat halaman (`?kode=`), baik dari QR maupun dari isian. */
export function HalamanVerifikasi() {
  const { slug } = rute.useParams()
  const { kode } = rute.useSearch()
  const navigate = useNavigate()
  return (
    <VerifikasiSurat
      kode={kode ?? null}
      onPeriksa={(k) => void navigate({ to: '/desa/$slug/verifikasi', params: { slug }, search: { kode: k } })}
    />
  )
}
