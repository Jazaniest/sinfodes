import { createFileRoute } from '@tanstack/react-router'
import { HalamanAlamatTidakDikenal } from '@/features/alamat/HalamanAlamatTidakDikenal'

export const Route = createFileRoute('/alamat-tidak-dikenal')({ component: HalamanAlamatTidakDikenal })
