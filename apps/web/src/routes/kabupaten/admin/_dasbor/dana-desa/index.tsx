import { createFileRoute } from '@tanstack/react-router'
import { DanaDesaKabupaten } from '@/features/kabupaten/dana-desa/DanaDesaKabupaten'

export const Route = createFileRoute('/kabupaten/admin/_dasbor/dana-desa/')({ component: () => <DanaDesaKabupaten /> })
