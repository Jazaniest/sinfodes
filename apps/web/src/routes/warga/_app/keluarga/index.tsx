import { createFileRoute } from '@tanstack/react-router'
import { KeluargaSaya } from '@/features/warga/keluarga/KeluargaSaya'

export const Route = createFileRoute('/warga/_app/keluarga/')({ component: KeluargaSaya })
