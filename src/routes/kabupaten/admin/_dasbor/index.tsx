import { createFileRoute } from '@tanstack/react-router'
import { RingkasanKabupaten } from '@/features/kabupaten/RingkasanKabupaten'

export const Route = createFileRoute('/kabupaten/admin/_dasbor/')({ component: () => <RingkasanKabupaten /> })
