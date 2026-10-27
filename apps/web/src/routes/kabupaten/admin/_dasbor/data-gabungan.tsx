import { createFileRoute } from '@tanstack/react-router'
import { DataGabungan } from '@/features/kabupaten/data-gabungan/DataGabungan'

export const Route = createFileRoute('/kabupaten/admin/_dasbor/data-gabungan')({ component: () => <DataGabungan /> })
