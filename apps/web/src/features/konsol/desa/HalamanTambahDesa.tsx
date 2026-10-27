import { useNavigate } from '@tanstack/react-router'
import { TambahDesa } from './TambahDesa'

export function HalamanTambahDesa() {
  const navigate = useNavigate()
  return (
    <TambahDesa
      onSelesai={(hasil) => void navigate({ to: '/konsol/desa/$id', params: { id: hasil.id } })}
      onBatal={() => void navigate({ to: '/konsol/desa' })}
    />
  )
}
