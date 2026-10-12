import { createFileRoute } from '@tanstack/react-router'
import { HalamanAkun } from '@/features/warga/HalamanAkun'

export const Route = createFileRoute('/warga/_app/akun')({ component: HalamanAkun })
