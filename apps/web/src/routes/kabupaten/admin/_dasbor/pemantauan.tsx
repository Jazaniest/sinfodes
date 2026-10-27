import { createFileRoute } from '@tanstack/react-router'
import { PemantauanKabupaten } from '@/features/kabupaten/pemantauan/PemantauanKabupaten'

export const Route = createFileRoute('/kabupaten/admin/_dasbor/pemantauan')({ component: () => <PemantauanKabupaten /> })
