import { createFileRoute } from '@tanstack/react-router'
import { HalamanDetailTenggat } from '@/features/kabupaten/dana-desa/HalamanDetailTenggat'

export const Route = createFileRoute('/kabupaten/admin/_dasbor/dana-desa/tenggat/$tenggatId')({ component: () => <HalamanDetailTenggat /> })
